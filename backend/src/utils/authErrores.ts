/**
 * Mensajes claros para errores de Supabase Auth.
 *
 * "fetch failed" (lo que vio el usuario al registrarse) NO es un error de datos:
 * significa que el backend no logró conectarse con Supabase (proyecto pausado,
 * red caída, URL mal configurada o tiempo de espera agotado).
 */
import { randomInt } from 'crypto';

type ErrorAuth = { message?: string; status?: number; name?: string; code?: string };

export function esErrorDeConexion(error: unknown): boolean {
  const e = (error || {}) as ErrorAuth;
  const msg = String(e.message || '').toLowerCase();
  return e.name === 'AuthRetryableFetchError'
    || e.status === 0
    || msg.includes('fetch failed')
    || msg.includes('econnrefused')
    || msg.includes('etimedout')
    || msg.includes('enotfound')
    || msg.includes('network');
}

export const MENSAJE_SIN_CONEXION =
  'No se pudo conectar con el servicio de cuentas (Supabase). Intenta de nuevo en unos minutos; si continúa, pide a un administrador que cree tu cuenta desde el panel de Usuarios.';

/** Convierte un error de Supabase Auth en { status, message } para responder. */
export function traducirErrorAuth(error: unknown): { status: number; message: string } {
  if (esErrorDeConexion(error)) return { status: 503, message: MENSAJE_SIN_CONEXION };
  const e = (error || {}) as ErrorAuth;
  const msg = String(e.message || '');
  const bajo = msg.toLowerCase();
  if (bajo.includes('sending confirmation email') || bajo.includes('sending recovery email') || bajo.includes('email rate limit')) {
    return {
      status: 503,
      message: 'No se pudo enviar el correo (límite o configuración de correo de Supabase). Pide a un administrador que cree tu cuenta o restablezca tu contraseña desde el panel de Usuarios.',
    };
  }
  if (bajo.includes('already registered') || bajo.includes('already been registered') || e.code === 'email_exists') {
    return { status: 409, message: 'Este correo ya está registrado.' };
  }
  if (bajo.includes('password')) return { status: 400, message: msg };
  return { status: e.status && e.status >= 400 && e.status < 600 ? e.status : 400, message: msg || 'Error de autenticación' };
}

/** Contraseña temporal legible: 12 caracteres con mayúscula, minúscula, número y símbolo. */
export function generarContrasenaTemporal(): string {
  const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '#$%*+-?'];
  const todos = grupos.join('');
  const chars = grupos.map((g) => g[randomInt(g.length)]);
  while (chars.length < 12) chars.push(todos[randomInt(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
