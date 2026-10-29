import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
// Esta es la clave pública (ANON KEY) - Segura para iniciar sesión
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
// Esta es la clave maestra (SERVICE ROLE) - ¡CUIDADO! Solo para admin
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltan variables de entorno de Supabase");
}

/** Clave pública (anon). Se puede entregar al navegador: no da privilegios por sí sola. */
export const SUPABASE_ANON_KEY_PUBLICA = SUPABASE_ANON_KEY;

// 1. Cliente para acciones públicas (Login, Registro inicial)
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Cliente ADMIN (Privilegios totales - Usar con precaución)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 3. Cliente CONTEXTUAL (Simula ser el usuario logueado)
// Usaremos esto para leer/escribir datos respetando RLS
export const createClientForUser = (accessToken: string) => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
};