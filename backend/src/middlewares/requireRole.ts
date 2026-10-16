import { Request, Response, NextFunction } from 'express';
import { contextoAuth } from './requireAuth';
import { responderError } from '../utils/http';

/**
 * Restringe una ruta a ciertos roles de la tabla `usuarios`.
 *
 * Se configura con una variable de entorno (lista separada por comas, sin
 * distinguir mayúsculas), p. ej.:
 *   ROLES_GESTION_CATALOGO=admin,back office
 *
 * Si la variable NO está definida, la ruta queda abierta a cualquier usuario
 * autenticado (comportamiento actual). Así se puede activar sin tocar código.
 */
export function requireRole(variableEntorno: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const configurado = process.env[variableEntorno];
    if (!configurado || !configurado.trim()) return next();

    const permitidos = configurado.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
    try {
      const { supabase, user } = contextoAuth(req);
      const { data, error } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
      if (error) throw error;

      const rol = String(data?.rol || '').trim().toLowerCase();
      if (!permitidos.includes(rol)) {
        return res.status(403).json({
          success: false,
          error: 'Tu rol no tiene permiso para esta operación',
          message: 'Tu rol no tiene permiso para esta operación',
        });
      }
      return next();
    } catch (error) {
      return responderError(res, error);
    }
  };
}
