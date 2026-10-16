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
 * Con `{ cerradoSiNoConfigurado: true }` es al revés: sin variable, nadie entra
 * (se usa en la administración de usuarios).
 */
export function rolesPermitidos(variableEntorno: string): string[] {
  return String(process.env[variableEntorno] || '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
}

/** ¿El usuario autenticado tiene uno de los roles configurados en la variable? */
export async function tieneRol(req: Request, variableEntorno: string): Promise<boolean> {
  const permitidos = rolesPermitidos(variableEntorno);
  if (permitidos.length === 0) return false;
  const { supabase, user } = contextoAuth(req);
  const { data, error } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
  if (error) throw error;
  return permitidos.includes(String(data?.rol || '').trim().toLowerCase());
}

export function requireRole(variableEntorno: string, opciones: { cerradoSiNoConfigurado?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const permitidos = rolesPermitidos(variableEntorno);
    if (permitidos.length === 0) {
      if (!opciones.cerradoSiNoConfigurado) return next();
      return res.status(403).json({
        success: false,
        error: 'Función desactivada',
        message: `Ningún rol tiene permiso todavía. Configura la variable ${variableEntorno} en el backend.`,
      });
    }

    try {
      if (!(await tieneRol(req, variableEntorno))) {
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
