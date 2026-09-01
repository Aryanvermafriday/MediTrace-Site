import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { publicEnvFallback } from '../config/publicEnvFallback.js';

// Helper to safely read Vite client environment variables (or process.env fallback)
export function getEnvVar(key: string): string {
  try {
    // Vite browser client runtime
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
      return (import.meta.env[key] as string).trim();
    }
  } catch {
    // Ignore error in non-Vite environments
  }

  try {
    // Node / server fallback runtime
    if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
      return (process.env[key] as string).trim();
    }
  } catch {
    // Ignore error
  }

  return '';
}

export function getSupabaseUrl(): string {
  return getEnvVar('VITE_SUPABASE_URL') || publicEnvFallback.supabaseUrl;
}

export function getSupabasePublishableKey(): string {
  return getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || publicEnvFallback.supabasePublishableKey;
}

let supabaseClientInstance: SupabaseClient<Database> | null = null;
let lastInitializedUrl = '';
let lastInitializedKey = '';

/**
 * Checks if required Supabase environment variables are provided
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  return Boolean(
    url &&
    key &&
    url.length > 0 &&
    key.length > 0 &&
    !url.includes('your-supabase-project')
  );
}

/**
 * Gets or lazily initializes the singleton Supabase client
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!supabaseClientInstance || lastInitializedUrl !== url || lastInitializedKey !== key) {
    try {
      supabaseClientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: {
          headers: { 'x-client-info': 'meditrace-web/1.0' },
        },
      });
      lastInitializedUrl = url;
      lastInitializedKey = key;
    } catch (err) {
      console.warn('[MediTrace Supabase] Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseClientInstance;
}

/**
 * Direct reference to the Supabase client (null if environment variables are not configured)
 */
export const supabase = isSupabaseConfigured() ? getSupabase() : null;

/**
 * Lightweight safe connection check without requiring existing database tables.
 * Uses auth service session ping to test reachability.
 */
export async function checkSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
  url?: string;
  error?: string;
}> {
  const url = getSupabaseUrl();

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are not set.',
    };
  }

  const client = getSupabase();
  if (!client) {
    return {
      configured: true,
      connected: false,
      message: 'Supabase client could not be initialized with provided credentials.',
      url,
    };
  }

  try {
    // Lightweight check: ping Supabase Auth service
    const { error } = await client.auth.getSession();
    if (error) {
      return {
        configured: true,
        connected: false,
        message: `Supabase auth ping returned an error: ${error.message}`,
        url,
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      message: 'Successfully connected to Supabase backend.',
      url,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      message: `Failed to connect to Supabase: ${err?.message || 'Unknown network error'}`,
      url,
      error: err?.message,
    };
  }
}
