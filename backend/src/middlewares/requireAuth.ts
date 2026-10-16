import { Request, Response, NextFunction } from 'express';
import { createClientForUser } from '../config/supabase';

/**
 * Extrae el access token del header `Authorization: Bearer <token>`.
 * Devuelve `null` si el header no existe o no tiene el formato esperado.
 */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * supabase-js no lanza excepción cuando Auth está caído: devuelve un error con
 * status 0 / AuthRetryableFetchError. Eso no es un token inválido, y responder
 * 401 haría que el frontend cierre la sesión del usuario sin motivo.
 */
function isAuthServiceUnavailable(error: { name?: string; status?: number }): boolean {
  return error.name === 'AuthRetryableFetchError' || error.status === 0 || (error.status ?? 0) >= 500;
}

/**
 * Middleware de autenticación.
 *
 * Valida el token contra Supabase Auth (no basta con que "exista" un token)
 * y deja disponibles para el controlador:
 *   - req.user        → usuario autenticado de Supabase
 *   - req.supabase    → cliente de Supabase con la identidad del usuario (respeta RLS)
 *   - req.accessToken → el token crudo
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'No autorizado: falta token' });
  }

  try {
    const supabase = createClientForUser(token);
    const { data, error } = await supabase.auth.getUser(token);

    if (error && isAuthServiceUnavailable(error)) {
      console.error('[requireAuth] Supabase Auth no respondió:', error.message);
      return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' });
    }
    if (error || !data?.user) {
      return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }

    req.user = data.user;
    req.supabase = supabase;
    req.accessToken = token;
    return next();
  } catch (err) {
    // Falla de red/servicio al validar el token: no es culpa del cliente.
    console.error('[requireAuth] No se pudo validar el token:', err);
    return res.status(503).json({ success: false, error: 'Servicio de autenticación no disponible' });
  }
}
