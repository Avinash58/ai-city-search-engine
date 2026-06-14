import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

// Safe mock client structure in case keys are not yet configured
const mockSupabaseClient = {
  auth: {
    signUp: async ({ email, password }: any) => {
      console.warn("Supabase is not configured. Running in Mock/Sandbox Mode.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!email.includes('@')) {
        return { data: null, error: { message: "Invalid email address format." } };
      }
      if (password.length < 6) {
        return { data: null, error: { message: "Password must be at least 6 characters." } };
      }
      
      return {
        data: { user: { id: 'mock-user-123', email }, session: null },
        error: null
      };
    },
    signInWithPassword: async ({ email, password }: any) => {
      console.warn("Supabase is not configured. Running in Mock/Sandbox Mode.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!email.includes('@')) {
        return { data: null, error: { message: "Invalid email address format." } };
      }
      if (password.length < 6) {
        return { data: null, error: { message: "Password must be at least 6 characters." } };
      }
      
      return {
        data: { user: { id: 'mock-user-123', email }, session: { access_token: 'mock-token' } },
        error: null
      };
    },
    signOut: async () => {
      return { error: null };
    },
    getSession: async () => {
      return { data: { session: null }, error: null };
    },
    getUser: async () => {
      return { data: { user: null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      // Immediately call callback with null session to simulate logged out state
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOtp: async () => {
      console.warn("Supabase is not configured. OTP SignIn not supported.");
      return { error: null };
    },
    signInWithOAuth: async () => {
      console.warn("Supabase is not configured. OAuth SignIn not supported.");
      return { data: null, error: null };
    }
  }
};

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (mockSupabaseClient as any);
