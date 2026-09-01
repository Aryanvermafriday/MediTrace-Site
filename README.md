# MediTrace

MediTrace is a responsive React/Vite continuity-of-care application backed by Supabase Auth, PostgreSQL, Row Level Security, and Vercel Functions.

## Supabase setup

For an existing database created from the original inventory, run this idempotent script in the Supabase SQL editor:

`supabase/migrations/20260831000000_email_auth_production_alignment.sql`

For a completely new Supabase project, run the migrations in this order:

1. `20260830000000_create_meditrace_schema.sql` — required base tables and types.
2. `20260830000001_seed_demo_data.sql` — optional demonstration records.
3. `20260831000000_email_auth_production_alignment.sql` — required authentication, RLS, RPC, and compatibility alignment.

Do not run only the alignment migration against an empty database: it alters tables created by the base-schema migration.

In **Authentication → Providers**:

- Keep Email/Password enabled.
- Disable Phone authentication and any unused social providers.
- Keep **Confirm Email** disabled. The signup endpoint uses Supabase's publishable-key email/password flow; with this setting disabled, Supabase immediately returns a session without an OTP or verification email.

## Vercel environment variables

Add these values for Production, Preview, and Development:

| Variable | Scope | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Supabase publishable key |
| `SUPABASE_URL` | Server | Same Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Same publishable key, used to validate sessions |
| `GEMINI_API_KEY` | Server only, optional | Enables live extraction and referral generation; deterministic fallbacks are used when omitted |

Vercel should detect the project as Vite. The build command is `pnpm build`, the output directory is `dist`, and protected API traffic is handled by `api/[...path].ts`.

## Local checks

```text
pnpm lint
pnpm build
```

Use `.env.example` as the local environment template. Do not commit `.env` files.

Vercel environment variables are not automatically available on localhost. To run authentication locally, copy `.env.example` to `.env`, supply the same Supabase values there, and restart `pnpm dev`. The browser and server both run through `http://127.0.0.1:3000`, so no separate CORS configuration is required for this local flow.
