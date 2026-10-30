import type { Request } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { accesosEfectivos, separarPorArea, type Accesos, type Area, type UsuarioParaLista } from '../domain/accesos';
import { ErrorHttp } from '../utils/http';

/**
 * Lee los accesos del usuario con la clave de servicio (las tablas de accesos
 * solo las escribe el backend). Se guarda en `req.accesos` para no repetir la
 * consulta si varias validaciones la necesitan en la misma petición.
 */
export async function obtenerAccesos(usuarioId: string): Promise<Accesos> {
  const [perfil, areas] = await Promise.all([
    supabaseAdmin.from('usuarios').select('es_admin_sistema, activo').eq('id', usuarioId).maybeSingle(),
    supabaseAdmin.from('usuario_areas').select('area').eq('usuario_id', usuarioId),
  ]);
  if (perfil.error) throw perfil.error;
  if (areas.error) throw areas.error;
  // Una cuenta desactivada no conserva permisos aunque su token siga vigente
  if (!perfil.data || perfil.data.activo === false) return accesosEfectivos(false, []);
  return accesosEfectivos(!!perfil.data.es_admin_sistema, (areas.data || []).map((r) => r.area));
}

/** Usuarios activos del área (con ella asignada o administradores) y los activos que no la tienen. */
export async function usuariosPorArea(area: Area): Promise<{ dentro: UsuarioParaLista[]; fuera: UsuarioParaLista[] }> {
  const [usuarios, areas] = await Promise.all([
    supabaseAdmin.from('usuarios').select('id, nombre, email, departamento, rol, activo, es_admin_sistema').eq('activo', true).order('nombre'),
    supabaseAdmin.from('usuario_areas').select('usuario_id, area').eq('area', area),
  ]);
  if (usuarios.error) throw usuarios.error;
  if (areas.error) throw areas.error;
  return separarPorArea(usuarios.data || [], areas.data || [], area);
}

const NOMBRE_AREA: Record<Area, string> = { cotizaciones: 'Quotations', mantenimiento: 'Maintenance', food_safety: 'Food Safety' };

/**
 * Al asignar a alguien (responsable, colaborador, "completada por"), esa persona
 * debe seguir teniendo el área. Si un administrador se la quitó, se rechaza.
 */
export async function exigirUsuarioDelArea(usuarioId: string, area: Area): Promise<void> {
  const { dentro } = await usuariosPorArea(area);
  if (!dentro.some((u) => u.id === usuarioId)) {
    throw new ErrorHttp(400, `That person no longer has access to ${NOMBRE_AREA[area]}. Pick someone from the list.`);
  }
}

export async function accesosDeRequest(req: Request): Promise<Accesos> {
  if (req.accesos) return req.accesos;
  if (!req.user) return accesosEfectivos(false, []);
  req.accesos = await obtenerAccesos(req.user.id);
  return req.accesos;
}

export type AccionBitacora =
  | 'inicio_sesion'
  | 'perfil_actualizado'
  | 'contrasena_cambiada'
  | 'contrasena_restablecida'
  | 'areas_actualizadas'
  | 'cuenta_activada'
  | 'cuenta_desactivada'
  | 'cuenta_creada'
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_rechazada';

/**
 * Registra un evento en la bitácora. Nunca hace fallar la operación principal:
 * si no se puede guardar, solo se deja aviso en el log.
 */
export async function registrarBitacora(
  usuarioId: string,
  actorId: string | null,
  accion: AccionBitacora,
  detalle: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('bitacora_accesos')
      .insert({ usuario_id: usuarioId, actor_id: actorId, accion, detalle });
    if (error) console.warn(`[bitácora] no se registró ${accion}:`, error.message);
  } catch (e) {
    console.warn(`[bitácora] no se registró ${accion}:`, (e as Error)?.message);
  }
}
