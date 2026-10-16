import type { SupabaseClient, User } from '@supabase/supabase-js';

// Propiedades que agrega el middleware `requireAuth` al request de Express.
declare global {
  namespace Express {
    interface Request {
      user?: User;
      supabase?: SupabaseClient;
      accessToken?: string;
    }
  }
}

export {};
