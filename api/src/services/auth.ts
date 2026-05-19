import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Handle SSL verification override for local development (BUG-006)
const customFetch = (input: string | URL | Request, init?: RequestInit) => {
  if (process.env.NODE_ENV === 'development' || process.env.CALC_ENVIRONMENT === 'local' || process.env.CALC_ENVIRONMENT === 'test-local') {
    // Standard Node.js fetch honors NODE_TLS_REJECT_UNAUTHORIZED.
    // For environments where it might not, or for more granular control:
    return fetch(input, {
      ...init,
      // @ts-expect-error - node-fetch or undici might support this or we rely on the global env var
      rejectUnauthorized: false, 
    });
  }
  return fetch(input, init);
};

if (process.env.NODE_ENV === 'development' || process.env.CALC_ENVIRONMENT === 'local' || process.env.CALC_ENVIRONMENT === 'test-local') {
  // This is the most reliable way in Node.js to bypass SSL for self-signed certs
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  global: {
    fetch: customFetch, // Standardize fetch signature
  },
});

export async function getUserFromSession(token: string): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}
