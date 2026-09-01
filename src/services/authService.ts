import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { AuthSession, AuthUser, Language } from '../types';

export function cleanPhoneNumber(phoneInput: string): string {
  const digits = phoneInput.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

export function formatMaskedPhone(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  return clean.length >= 4 ? `+91 XXXXXXX${clean.slice(-4)}` : '';
}

type AppContext = {
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: 'patient' | 'caregiver' | 'provider';
  preferred_language: Language;
  patient_id: string | null;
  meditrace_id: string | null;
  abha_id: string | null;
};

function requireClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('MediTrace is not configured. Add the Supabase environment variables in Vercel.');
  }
  const client = getSupabase();
  if (!client) throw new Error('Unable to initialize the secure Supabase client.');
  return client as any;
}

function mapSession(session: Session, context: AppContext): AuthSession {
  const phone = context.phone || '';
  return {
    token: session.access_token,
    expiresAt: (session.expires_at || Math.floor(Date.now() / 1000) + 3600) * 1000,
    user: {
      userId: context.user_id,
      email: context.email || session.user.email || '',
      phone,
      maskedPhone: phone ? formatMaskedPhone(phone) : '',
      role: context.role,
      patientId: context.meditrace_id || '',
      abhaId: context.abha_id || undefined,
      name: context.full_name || session.user.email?.split('@')[0] || 'MediTrace User',
      preferredLanguage: context.preferred_language || 'en',
      createdAt: session.user.created_at,
    },
  };
}

class AuthService {
  async getCurrentSession(): Promise<AuthSession | null> {
    const client = requireClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) return null;

    const { data, error: contextError } = await client.rpc('get_my_context');
    if (contextError) throw new Error(contextError.message);
    if (!data) return null;
    return mapSession(session, data as unknown as AppContext);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.session) {
      throw new Error(error?.message || 'Unable to sign in with those credentials.');
    }

    const { data: context, error: contextError } = await client.rpc('get_my_context');
    if (contextError || !context) {
      await client.auth.signOut();
      throw new Error(contextError?.message || 'Your MediTrace account profile is not available.');
    }
    return mapSession(data.session, context as unknown as AppContext);
  }

  async signUp(email: string, password: string, fullName: string, language: Language): Promise<AuthSession> {
    let response: Response;
    try {
      response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          preferredLanguage: language,
        }),
      });
    } catch {
      throw new Error('Cannot reach the MediTrace server. Check your connection or restart the local development server, then try again.');
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Account creation failed. Please try again.');
    }
    return this.signIn(email, password);
  }

  async updateAccountSettings(updates: { language?: Language }): Promise<AuthUser> {
    const client = requireClient();
    const session = await this.getCurrentSession();
    if (!session) throw new Error('Your session has expired. Please sign in again.');

    if (updates.language) {
      const { error } = await client
        .from('users')
        .update({ preferred_language: updates.language })
        .eq('id', session.user.userId);
      if (error) throw new Error(error.message);
    }

    const refreshed = await this.getCurrentSession();
    if (!refreshed) throw new Error('Unable to refresh your account settings.');
    return refreshed.user;
  }

  onAuthStateChange(callback: (event: AuthChangeEvent) => void) {
    const client = requireClient();
    return client.auth.onAuthStateChange((event) => callback(event));
  }

  async logout(): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
}

export const authService = new AuthService();
