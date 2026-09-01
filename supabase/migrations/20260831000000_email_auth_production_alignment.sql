-- MediTrace production alignment migration
-- Run this once in the Supabase SQL editor after the two original migrations.
-- It is intentionally idempotent so it can also be applied by Supabase CLI.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Email/password is the primary identity. Phone remains optional patient data.
alter table public.users alter column phone drop not null;
alter table public.patients alter column phone drop not null;
alter table public.medical_records add column if not exists source_document_name varchar(255);
alter table public.medical_records add column if not exists source_document_type varchar(50);

create unique index if not exists patients_single_user_profile_key
  on public.patients (user_id)
  where user_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

update public.users u
set email = lower(a.email)
from auth.users a
where a.id = u.id and a.email is not null and (u.email is null or u.email = '');

create unique index if not exists users_email_lower_key
  on public.users (lower(email))
  where email is not null;

create table if not exists public.provider_patient_access (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  can_view boolean not null default true,
  can_upload boolean not null default true,
  can_edit boolean not null default false,
  granted_at timestamptz not null default now(),
  unique (provider_user_id, patient_id)
);

create index if not exists idx_provider_patient_access_user
  on public.provider_patient_access(provider_user_id, patient_id);

alter table public.provider_patient_access enable row level security;

-- Always create the application profile when an Auth user is created. Authorization
-- is never taken from editable user_metadata: public signups are always patients.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (
    id, phone, masked_phone, email, full_name, role, preferred_language
  ) values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    null,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'patient',
    case when new.raw_user_meta_data ->> 'preferred_language' = 'hi' then 'hi' else 'en' end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.users.full_name, ''), excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- Backfill any Auth identities created before the trigger existed.
insert into public.users (id, phone, email, full_name, role, preferred_language)
select
  a.id,
  nullif(a.raw_user_meta_data ->> 'phone', ''),
  lower(a.email),
  coalesce(nullif(trim(a.raw_user_meta_data ->> 'full_name'), ''), split_part(a.email, '@', 1)),
  'patient',
  case when a.raw_user_meta_data ->> 'preferred_language' = 'hi' then 'hi' else 'en' end
from auth.users a
where not exists (select 1 from public.users u where u.id = a.id)
on conflict (id) do nothing;

create or replace function private.can_access_patient(p_patient_id uuid, p_action text default 'view')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.patients p
      where p.id = p_patient_id and p.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.caregivers c
      where c.patient_id = p_patient_id
        and c.user_id = (select auth.uid())
        and case p_action
          when 'view' then c.can_view_records
          when 'upload' then c.can_upload_records
          when 'edit' then c.can_edit_full_profile
          else false
        end
    )
    or exists (
      select 1 from public.provider_patient_access ppa
      where ppa.patient_id = p_patient_id
        and ppa.provider_user_id = (select auth.uid())
        and case p_action
          when 'view' then ppa.can_view
          when 'upload' then ppa.can_upload
          when 'edit' then ppa.can_edit
          else false
        end
    )
  );
$$;

revoke all on function private.can_access_patient(uuid, text) from public, anon;
grant execute on function private.can_access_patient(uuid, text) to authenticated;

-- Remove incomplete/recursive legacy policies captured in older deployments.
do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array[
    'users','facilities','patients','patient_allergies','patient_chronic_conditions',
    'patient_emergency_contacts','caregivers','healthcare_providers','medical_records',
    'medical_record_vitals','prescribed_medicines','lab_investigations','medical_documents',
    'referral_summaries','security_access_logs','provider_patient_access'
  ] loop
    for policy_row in
      select policyname from pg_policies where schemaname = 'public' and tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_row.policyname, table_name);
    end loop;
  end loop;
end $$;

-- Remove signed-out table access; the publishable key is safe only with an Auth JWT.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select on public.facilities, public.healthcare_providers to authenticated;
grant select, insert, update, delete on
  public.patients,
  public.patient_allergies,
  public.patient_chronic_conditions,
  public.patient_emergency_contacts,
  public.caregivers,
  public.medical_records,
  public.medical_record_vitals,
  public.prescribed_medicines,
  public.lab_investigations,
  public.medical_documents,
  public.referral_summaries
to authenticated;
grant select, insert on public.security_access_logs to authenticated;
grant select on public.provider_patient_access to authenticated;

create policy users_select_self on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy facilities_read_authenticated on public.facilities
  for select to authenticated using (true);
create policy providers_read_authenticated on public.healthcare_providers
  for select to authenticated using (true);

create policy patients_read_linked on public.patients
  for select to authenticated using ((select private.can_access_patient(id, 'view')));
create policy patients_insert_self on public.patients
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy patients_update_linked on public.patients
  for update to authenticated
  using ((select private.can_access_patient(id, 'edit')))
  with check ((select private.can_access_patient(id, 'edit')));

create policy provider_access_read_self on public.provider_patient_access
  for select to authenticated using (provider_user_id = (select auth.uid()));

-- Demographic sub-entities use edit permission for writes.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'patient_allergies','patient_chronic_conditions','patient_emergency_contacts','caregivers'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.can_access_patient(patient_id, ''view'')))', table_name || '_read_linked', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_access_patient(patient_id, ''edit'')))', table_name || '_insert_linked', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.can_access_patient(patient_id, ''edit''))) with check ((select private.can_access_patient(patient_id, ''edit'')))', table_name || '_update_linked', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.can_access_patient(patient_id, ''edit'')))', table_name || '_delete_linked', table_name);
  end loop;
end $$;

-- Clinical entities use upload permission for writes and view permission for reads.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'medical_records','medical_record_vitals','prescribed_medicines','lab_investigations',
    'medical_documents','referral_summaries'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.can_access_patient(patient_id, ''view'')))', table_name || '_read_linked', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.can_access_patient(patient_id, ''upload'')))', table_name || '_insert_linked', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.can_access_patient(patient_id, ''upload''))) with check ((select private.can_access_patient(patient_id, ''upload'')))', table_name || '_update_linked', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.can_access_patient(patient_id, ''upload'')))', table_name || '_delete_linked', table_name);
  end loop;
end $$;

create policy security_logs_read_linked on public.security_access_logs
  for select to authenticated
  using (patient_id is not null and (select private.can_access_patient(patient_id, 'view')));
create policy security_logs_insert_actor on public.security_access_logs
  for insert to authenticated
  with check (actor_user_id = (select auth.uid()) and (patient_id is null or (select private.can_access_patient(patient_id, 'view'))));

-- Stable, collision-resistant patient number allocation.
create sequence if not exists public.meditrace_patient_number_seq start with 1000 increment by 1;

create or replace function public.complete_patient_onboarding(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_patient_id uuid;
  v_meditrace_id text;
  v_full_name text := nullif(trim(p_profile ->> 'full_name'), '');
  v_phone text := nullif(trim(p_profile ->> 'phone'), '');
  v_emergency_phone text;
  v_language text := case when p_profile ->> 'preferred_language' = 'hi' then 'hi' else 'en' end;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_full_name is null then raise exception 'Full name is required'; end if;
  if coalesce((p_profile ->> 'age')::integer, 0) not between 1 and 130 then raise exception 'A valid age is required'; end if;
  if coalesce(p_profile ->> 'gender', '') not in ('Male','Female','Other') then raise exception 'A valid gender is required'; end if;
  if exists (select 1 from public.patients where user_id = v_uid) then
    select id, meditrace_id into v_patient_id, v_meditrace_id from public.patients where user_id = v_uid limit 1;
    return jsonb_build_object('patient_id', v_patient_id, 'meditrace_id', v_meditrace_id, 'existing', true);
  end if;

  update public.users
  set full_name = v_full_name,
      phone = v_phone,
      masked_phone = case when length(regexp_replace(v_phone, '\D', '', 'g')) >= 4 then '+91 XXXXXXX' || right(regexp_replace(v_phone, '\D', '', 'g'), 4) else null end,
      preferred_language = v_language,
      updated_at = now()
  where id = v_uid;

  loop
    v_meditrace_id := 'MT-PAT-' || lpad(nextval('public.meditrace_patient_number_seq')::text, 6, '0');
    exit when not exists (select 1 from public.patients where meditrace_id = v_meditrace_id);
  end loop;

  insert into public.patients (
    user_id, meditrace_id, abha_id, abha_address, full_name, full_name_hindi,
    age, gender, gender_hindi, blood_group, phone, masked_phone, village, post,
    district, state, pin_code, primary_facility_name, primary_facility_name_hindi,
    qr_payload, last_synchronized_at
  ) values (
    v_uid, v_meditrace_id, null, null, v_full_name, v_full_name,
    (p_profile ->> 'age')::integer, p_profile ->> 'gender',
    case p_profile ->> 'gender' when 'Male' then 'पुरुष' when 'Female' then 'महिला' else 'अन्य' end,
    coalesce(nullif(p_profile ->> 'blood_group', ''), 'Not recorded'),
    v_phone,
    case when length(regexp_replace(v_phone, '\D', '', 'g')) >= 4 then '+91 XXXXXXX' || right(regexp_replace(v_phone, '\D', '', 'g'), 4) else null end,
    coalesce(nullif(trim(p_profile ->> 'village'), ''), 'Not specified'),
    nullif(trim(p_profile ->> 'post'), ''),
    coalesce(nullif(trim(p_profile ->> 'district'), ''), 'Not specified'),
    coalesce(nullif(trim(p_profile ->> 'state'), ''), 'Not specified'),
    nullif(trim(p_profile ->> 'pin_code'), ''),
    coalesce(nullif(trim(p_profile ->> 'primary_facility_name'), ''), 'Not linked'),
    coalesce(nullif(trim(p_profile ->> 'primary_facility_name'), ''), 'Not linked'),
    'MEDITRACE:' || v_meditrace_id,
    now()
  ) returning id into v_patient_id;

  if nullif(trim(p_profile ->> 'emergency_contact_name'), '') is not null then
    v_emergency_phone := coalesce(nullif(trim(p_profile ->> 'emergency_contact_phone'), ''), v_phone);
    if v_emergency_phone is null then
      raise exception 'Emergency contact phone is required when a contact name is provided';
    end if;
    insert into public.patient_emergency_contacts (patient_id, name, relationship, phone, is_primary)
    values (
      v_patient_id,
      trim(p_profile ->> 'emergency_contact_name'),
      'Emergency contact',
      v_emergency_phone,
      true
    );
  end if;

  insert into public.security_access_logs (
    patient_id, actor_user_id, actor_name, actor_role, facility, action, details, auth_method
  ) values (
    v_patient_id, v_uid, v_full_name, 'patient', 'MediTrace', 'Created patient profile',
    'Completed email/password onboarding for ' || v_meditrace_id,
    'Email/password'
  );

  return jsonb_build_object('patient_id', v_patient_id, 'meditrace_id', v_meditrace_id, 'existing', false);
end;
$$;

revoke all on function public.complete_patient_onboarding(jsonb) from public, anon;
grant execute on function public.complete_patient_onboarding(jsonb) to authenticated;

create or replace function public.get_my_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_user public.users%rowtype;
  v_patient public.patients%rowtype;
begin
  if v_uid is null then return null; end if;
  select * into v_user from public.users where id = v_uid;
  if not found then return null; end if;

  if v_user.role = 'patient' then
    select * into v_patient from public.patients where user_id = v_uid order by created_at limit 1;
  elsif v_user.role = 'caregiver' then
    select p.* into v_patient
    from public.caregivers c join public.patients p on p.id = c.patient_id
    where c.user_id = v_uid order by c.is_primary desc, c.created_at limit 1;
  else
    select p.* into v_patient
    from public.provider_patient_access a join public.patients p on p.id = a.patient_id
    where a.provider_user_id = v_uid and a.can_view order by a.granted_at desc limit 1;
  end if;

  return jsonb_build_object(
    'user_id', v_user.id,
    'email', v_user.email,
    'phone', v_user.phone,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'preferred_language', v_user.preferred_language,
    'patient_id', v_patient.id,
    'meditrace_id', v_patient.meditrace_id,
    'abha_id', v_patient.abha_id
  );
end;
$$;

revoke all on function public.get_my_context() from public, anon;
grant execute on function public.get_my_context() to authenticated;

create or replace function public.replace_emergency_contacts(p_meditrace_id text, p_contacts jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
  v_contact jsonb;
  v_primary_seen boolean := false;
  v_is_primary boolean;
begin
  select id into v_patient_id from public.patients where meditrace_id = p_meditrace_id;
  if v_patient_id is null or not private.can_access_patient(v_patient_id, 'edit') then raise exception 'Not authorized to edit this profile'; end if;
  delete from public.patient_emergency_contacts where patient_id = v_patient_id;
  for v_contact in select value from jsonb_array_elements(coalesce(p_contacts, '[]'::jsonb)) loop
    v_is_primary := coalesce((v_contact ->> 'isPrimary')::boolean, false) and not v_primary_seen;
    if v_is_primary then v_primary_seen := true; end if;
    insert into public.patient_emergency_contacts (patient_id, name, relationship, phone, is_primary)
    values (
      v_patient_id,
      left(trim(v_contact ->> 'name'), 150),
      left(trim(v_contact ->> 'relationship'), 100),
      left(trim(v_contact ->> 'phone'), 20),
      v_is_primary
    );
  end loop;
  if not v_primary_seen then
    update public.patient_emergency_contacts set is_primary = true
    where id = (select id from public.patient_emergency_contacts where patient_id = v_patient_id order by created_at limit 1);
  end if;
end;
$$;

revoke all on function public.replace_emergency_contacts(text, jsonb) from public, anon;
grant execute on function public.replace_emergency_contacts(text, jsonb) to authenticated;

create or replace function public.upsert_primary_caregiver(p_meditrace_id text, p_caregiver jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
  v_caregiver_id uuid;
begin
  select id into v_patient_id from public.patients where meditrace_id = p_meditrace_id;
  if v_patient_id is null or not private.can_access_patient(v_patient_id, 'edit') then raise exception 'Not authorized to edit caregivers'; end if;
  select id into v_caregiver_id from public.caregivers where patient_id = v_patient_id and is_primary limit 1;
  if v_caregiver_id is null then
    insert into public.caregivers (
      patient_id, name, name_hindi, relationship, relationship_hindi, phone, is_primary,
      can_view_records, can_view_medicines, can_view_appointments, can_upload_records, can_edit_full_profile
    ) values (
      v_patient_id, left(coalesce(nullif(trim(p_caregiver ->> 'name'), ''), 'Primary Caregiver'), 150),
      left(coalesce(nullif(trim(p_caregiver ->> 'name_hindi'), ''), p_caregiver ->> 'name'), 150),
      left(coalesce(nullif(trim(p_caregiver ->> 'relationship'), ''), 'Caregiver'), 100),
      left(coalesce(nullif(trim(p_caregiver ->> 'relationship_hindi'), ''), p_caregiver ->> 'relationship'), 100),
      left(coalesce(p_caregiver ->> 'phone', ''), 20), true,
      coalesce((p_caregiver ->> 'can_view_records')::boolean, true),
      coalesce((p_caregiver ->> 'can_view_medicines')::boolean, true),
      coalesce((p_caregiver ->> 'can_view_appointments')::boolean, true),
      coalesce((p_caregiver ->> 'can_upload_records')::boolean, true),
      coalesce((p_caregiver ->> 'can_edit_full_profile')::boolean, false)
    );
  else
    update public.caregivers set
      name = left(coalesce(nullif(trim(p_caregiver ->> 'name'), ''), name), 150),
      name_hindi = left(coalesce(nullif(trim(p_caregiver ->> 'name_hindi'), ''), name_hindi), 150),
      relationship = left(coalesce(nullif(trim(p_caregiver ->> 'relationship'), ''), relationship), 100),
      relationship_hindi = left(coalesce(nullif(trim(p_caregiver ->> 'relationship_hindi'), ''), relationship_hindi), 100),
      phone = left(coalesce(p_caregiver ->> 'phone', phone), 20),
      can_view_records = coalesce((p_caregiver ->> 'can_view_records')::boolean, can_view_records),
      can_view_medicines = coalesce((p_caregiver ->> 'can_view_medicines')::boolean, can_view_medicines),
      can_view_appointments = coalesce((p_caregiver ->> 'can_view_appointments')::boolean, can_view_appointments),
      can_upload_records = coalesce((p_caregiver ->> 'can_upload_records')::boolean, can_upload_records),
      can_edit_full_profile = coalesce((p_caregiver ->> 'can_edit_full_profile')::boolean, can_edit_full_profile)
    where id = v_caregiver_id;
  end if;
end;
$$;

revoke all on function public.upsert_primary_caregiver(text, jsonb) from public, anon;
grant execute on function public.upsert_primary_caregiver(text, jsonb) to authenticated;

create or replace function public.create_complete_medical_record(p_meditrace_id text, p_record jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_patient_id uuid;
  v_record_id uuid;
  v_item jsonb;
  v_vitals jsonb := p_record -> 'vitals';
  v_actor public.users%rowtype;
begin
  select id into v_patient_id from public.patients where meditrace_id = p_meditrace_id;
  if v_patient_id is null or not private.can_access_patient(v_patient_id, 'upload') then raise exception 'Not authorized to add records for this patient'; end if;
  select * into v_actor from public.users where id = v_uid;

  insert into public.medical_records (
    patient_id, title, record_date, facility_name, facility_type, record_type, doctor_name,
    specialization, diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
    is_ai_extracted, is_verified, verified_by, verified_at, confidence_score,
    source_document_name, source_document_type
  ) values (
    v_patient_id,
    left(coalesce(nullif(p_record ->> 'title', ''), 'Medical record'), 200),
    coalesce(nullif(p_record ->> 'recordDate', '')::date, current_date),
    left(coalesce(nullif(p_record ->> 'facility', ''), 'Not specified'), 150),
    left(coalesce(nullif(p_record ->> 'facilityType', ''), 'Primary Health Centre'), 50),
    case when p_record ->> 'recordType' in ('Prescription','Diagnostic','Consultation','Referral','Discharge Summary') then p_record ->> 'recordType' else 'Consultation' end,
    left(coalesce(nullif(p_record ->> 'doctorName', ''), 'Not recorded'), 150),
    left(nullif(p_record ->> 'specialization', ''), 100),
    coalesce(nullif(p_record ->> 'diagnosis', ''), 'Not recorded'),
    coalesce(nullif(p_record ->> 'reasonForVisit', ''), 'Not recorded'),
    coalesce(nullif(p_record ->> 'clinicalNotes', ''), 'Not recorded'),
    nullif(p_record ->> 'followUpInstructions', ''),
    coalesce((p_record ->> 'isAiExtracted')::boolean, false),
    coalesce((p_record ->> 'isVerified')::boolean, false),
    left(nullif(p_record ->> 'verifiedBy', ''), 150),
    nullif(p_record ->> 'verifiedAt', '')::timestamptz,
    nullif(p_record ->> 'confidenceScore', '')::numeric,
    left(nullif(p_record ->> 'sourceDocumentName', ''), 255),
    left(nullif(p_record ->> 'sourceDocumentType', ''), 50)
  ) returning id into v_record_id;

  if v_vitals is not null and v_vitals <> 'null'::jsonb then
    insert into public.medical_record_vitals (
      record_id, patient_id, blood_pressure, pulse, temperature, weight, spo2, respiratory_rate
    ) values (
      v_record_id, v_patient_id, nullif(v_vitals ->> 'bloodPressure', ''), nullif(v_vitals ->> 'pulse', ''),
      nullif(v_vitals ->> 'temperature', ''), nullif(v_vitals ->> 'weight', ''), nullif(v_vitals ->> 'spO2', ''),
      nullif(v_vitals ->> 'respiratoryRate', '')
    );
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_record -> 'medicines', '[]'::jsonb)) loop
    insert into public.prescribed_medicines (
      record_id, patient_id, name, generic_name, dosage, frequency, timing_notes, duration,
      purpose, status, prescribed_facility, prescribed_date
    ) values (
      v_record_id, v_patient_id, left(coalesce(nullif(v_item ->> 'name', ''), 'Not recorded'), 150),
      left(nullif(v_item ->> 'genericName', ''), 150), left(coalesce(nullif(v_item ->> 'dosage', ''), 'Not recorded'), 50),
      left(coalesce(nullif(v_item ->> 'frequency', ''), 'Not recorded'), 50), nullif(v_item ->> 'timingNotes', ''),
      left(coalesce(nullif(v_item ->> 'duration', ''), 'Not recorded'), 50), coalesce(nullif(v_item ->> 'purpose', ''), 'Not recorded'),
      case when v_item ->> 'status' in ('active','completed','discontinued') then v_item ->> 'status' else 'active' end,
      left(coalesce(nullif(v_item ->> 'prescribedFacility', ''), p_record ->> 'facility', 'Not specified'), 150),
      coalesce(nullif(v_item ->> 'prescribedDate', '')::date, nullif(p_record ->> 'recordDate', '')::date, current_date)
    );
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_record -> 'investigations', '[]'::jsonb)) loop
    insert into public.lab_investigations (
      record_id, patient_id, test_name, result, normal_range, unit, status, test_date, facility
    ) values (
      v_record_id, v_patient_id, left(coalesce(nullif(v_item ->> 'testName', ''), 'Investigation'), 150),
      left(coalesce(nullif(v_item ->> 'result', ''), 'Pending'), 100), left(coalesce(nullif(v_item ->> 'normalRange', ''), 'Not recorded'), 100),
      left(nullif(v_item ->> 'unit', ''), 30),
      case when v_item ->> 'status' in ('Normal','Borderline','High','Low','Critical','Pending') then v_item ->> 'status' else 'Pending' end,
      coalesce(nullif(v_item ->> 'date', '')::date, nullif(p_record ->> 'recordDate', '')::date, current_date),
      left(coalesce(nullif(v_item ->> 'facility', ''), p_record ->> 'facility', 'Not specified'), 150)
    );
  end loop;

  update public.patients set last_synchronized_at = now(), last_visit_date = greatest(coalesce(last_visit_date, '1900-01-01'::date), coalesce(nullif(p_record ->> 'recordDate', '')::date, current_date)) where id = v_patient_id;

  insert into public.security_access_logs (
    patient_id, actor_user_id, actor_name, actor_role, facility, action, details, auth_method
  ) values (
    v_patient_id, v_uid, coalesce(v_actor.full_name, 'MediTrace user'), coalesce(v_actor.role, 'patient'),
    left(coalesce(p_record ->> 'facility', 'MediTrace'), 150), 'Created medical record',
    'Added ' || coalesce(p_record ->> 'recordType', 'medical') || ' record ' || v_record_id::text,
    'Email/password'
  );

  return v_record_id;
end;
$$;

revoke all on function public.create_complete_medical_record(text, jsonb) from public, anon;
grant execute on function public.create_complete_medical_record(text, jsonb) to authenticated;

-- Persist referral summaries so Vercel cold starts and new devices do not lose
-- the latest doctor-ready result. The function validates patient access itself.
create or replace function public.save_referral_summary(p_meditrace_id text, p_summary jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
  v_summary_id uuid;
  v_fingerprint text := nullif(trim(p_summary ->> 'data_fingerprint'), '');
  v_reason text := coalesce(nullif(trim(p_summary ->> 'referral_reason'), ''), 'General clinical review');
  v_receiving text := coalesce(nullif(trim(p_summary ->> 'receiving_facility'), ''), 'Receiving facility');
  v_language text := case when p_summary ->> 'language' = 'hi' then 'hi' else 'en' end;
begin
  select id into v_patient_id from public.patients where meditrace_id = p_meditrace_id;
  if v_patient_id is null or not private.can_access_patient(v_patient_id, 'upload') then
    raise exception 'Not authorized to save a referral summary for this patient';
  end if;
  if v_fingerprint is null then raise exception 'A data fingerprint is required'; end if;
  if p_summary -> 'structured_data' is null or p_summary -> 'structured_data' = 'null'::jsonb then
    raise exception 'Structured referral data is required';
  end if;

  select id into v_summary_id
  from public.referral_summaries
  where patient_id = v_patient_id
    and data_fingerprint = v_fingerprint
    and md5(referral_reason) = md5(v_reason)
    and receiving_facility = v_receiving
    and language = v_language
  limit 1;

  if v_summary_id is null then
    insert into public.referral_summaries (
      patient_id, data_fingerprint, referral_reason, referring_facility, receiving_facility,
      language, source, is_outdated, structured_data, summary_text, generated_at, updated_at
    ) values (
      v_patient_id, v_fingerprint, v_reason,
      coalesce(nullif(trim(p_summary ->> 'referring_facility'), ''), 'MediTrace'),
      v_receiving, v_language, coalesce(nullif(trim(p_summary ->> 'source'), ''), 'ai_generated'),
      false, p_summary -> 'structured_data', coalesce(p_summary ->> 'summary_text', ''), now(), now()
    ) returning id into v_summary_id;
  else
    update public.referral_summaries set
      referring_facility = coalesce(nullif(trim(p_summary ->> 'referring_facility'), ''), referring_facility),
      source = coalesce(nullif(trim(p_summary ->> 'source'), ''), source),
      is_outdated = false,
      structured_data = p_summary -> 'structured_data',
      summary_text = coalesce(p_summary ->> 'summary_text', summary_text),
      updated_at = now()
    where id = v_summary_id;
  end if;

  update public.referral_summaries
  set is_outdated = true, updated_at = now()
  where patient_id = v_patient_id and language = v_language and id <> v_summary_id and not is_outdated;

  return v_summary_id;
end;
$$;

revoke all on function public.save_referral_summary(text, jsonb) from public, anon;
grant execute on function public.save_referral_summary(text, jsonb) to authenticated;

-- Keep generated timestamps reliable across all app writes.
drop trigger if exists trg_medical_records_updated_at on public.medical_records;
create trigger trg_medical_records_updated_at before update on public.medical_records
  for each row execute function public.set_updated_at();
drop trigger if exists trg_patient_contacts_updated_at on public.patient_emergency_contacts;
create trigger trg_patient_contacts_updated_at before update on public.patient_emergency_contacts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_referral_summaries_updated_at on public.referral_summaries;
create trigger trg_referral_summaries_updated_at before update on public.referral_summaries
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
