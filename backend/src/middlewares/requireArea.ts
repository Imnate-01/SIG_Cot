import type { Request, Response, NextFunction } from 'express';
import { accesosDeRequest } from '../services/accesos';
import { puedeEntrar, type Area } from '../domain/accesos';
import { responderError } from '../utils/http';

const MENSAJE_AREA = 'No tienes acceso a esta área. Solicítalo desde Administración → Solicitudes de acceso.';

function prohibido(res: Response, mensaje: string) {
  return res.status(403).json({ success: false, error: mensaje, message: mensaje });
}

/**
 * Restringe un grupo de rutas a quien tenga alguna de las áreas indicadas
 * (los administradores del sistema entran a todas). Va después de requireAuth.
 */
export function requireArea(...areas: Area[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!puedeEntrar(await accesosDeRequest(req), areas)) return prohibido(res, MENSAJE_AREA);
      return next();
    } catch (error) {
      return responderError(res, error);
    }
  };
}

/**
 * Catálogo compartido: leer lo permite `lectura`; crear, editar o borrar solo
 * `escritura`. Ej.: los clientes los consulta Mantenimiento pero los administra
 * Cotizaciones.
 */
export function requireAreaPorMetodo(opciones: { lectura: Area[]; escritura: Area[]; esLectura?: (req: Request) => boolean }) {
  const esLectura = opciones.esLectura ?? ((req: Request) => req.method === 'GET' || req.method === 'HEAD');
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permitidas = esLectura(req) ? opciones.lectura : opciones.escritura;
      if (!puedeEntrar(await accesosDeRequest(req), permitidas)) return prohibido(res, MENSAJE_AREA);
      return next();
    } catch (error) {
      return responderError(res, error);
    }
  };
}

/** Solo administradores del sistema (usuarios.es_admin_sistema). */
export async function requireAdminSistema(req: Request, res: Response, next: NextFunction) {
  try {
    if (!(await accesosDeRequest(req)).esAdmin) {
      return prohibido(res, 'Solo los administradores del sistema pueden hacer esto.');
    }
    return next();
  } catch (error) {
    return responderError(res, error);
  }
}
