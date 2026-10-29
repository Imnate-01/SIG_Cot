import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Accesos } from '../domain/accesos';

// Propiedades que agrega el middleware `requireAuth` al request de Express.
declare global {
  namespace Express {
    interface Request {
      user?: User;
      supabase?: SupabaseClient;
      accessToken?: string;
      /** Áreas del usuario; lo llena accesosDeRequest la primera vez que se pide. */
      accesos?: Accesos;
    }
  }
}

export {};
