import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { contextoAuth } from '../middlewares/requireAuth';
import { accesosDeRequest, registrarBitacora } from '../services/accesos';
import { esArea, textoOpcional } from '../domain/accesos';
import { responderError, ErrorHttp } from '../utils/http';

/**
 * La parte de Administración que tiene todo usuario: qué áreas tengo,
 * pedir acceso a otra y ver mi actividad. Montado en /api/accesos.
 */

// GET /api/accesos/me → { esAdmin, areas, usuario, solicitudesPendientes }
export async function misAccesos(req: Request, res: Response) {
  try {
    const { user } = contextoAuth(req);
    const accesos = await accesosDeRequest(req);
    const { data: perfil, error } = await supabaseAdmin
      .from('usuarios')
      .select('nombre, email, rol, departamento')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;

    // A un administrador le sirve saber cuántas solicitudes esperan respuesta
    let solicitudesPendientes = 0;
    if (accesos.esAdmin) {
      const { count, error: errorConteo } = await supabaseAdmin
        .from('solicitudes_acceso')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      if (errorConteo) throw errorConteo;
      solicitudesPendientes = count ?? 0;
    }

    res.json({
      success: true,
      data: {
        ...accesos,
        usuario: { id: user.id, email: perfil?.email || user.email, nombre: perfil?.nombre || '', rol: perfil?.rol || '', departamento: perfil?.departamento || '' },
        solicitudesPendientes,
      },
    });
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/accesos/me/solicitudes
export async function misSolicitudes(req: Request, res: Response) {
  try {
    const { user } = contextoAuth(req);
    const { data, error } = await supabaseAdmin
      .from('solicitudes_acceso')
      .select('id, area, motivo, estado, creada_en, resuelta_en, nota')
      .eq('usuario_id', user.id)
      .order('creada_en', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/accesos/me/solicitudes  { area, motivo? }
export async function crearSolicitud(req: Request, res: Response) {
  try {
    const { user } = contextoAuth(req);
    const area = req.body?.area;
    if (!esArea(area)) throw new ErrorHttp(400, 'Elige un área válida.');

    const accesos = await accesosDeRequest(req);
    if (accesos.esAdmin || accesos.areas.includes(area)) throw new ErrorHttp(409, 'Ya tienes acceso a esa área.');

    const motivo = textoOpcional(req.body?.motivo);
    const { data, error } = await supabaseAdmin
      .from('solicitudes_acceso')
      .insert({ usuario_id: user.id, area, motivo })
      .select('id, area, motivo, estado, creada_en, resuelta_en, nota')
      .single();
    if (error) {
      if ((error as { code?: string }).code === '23505') throw new ErrorHttp(409, 'Ya tienes una solicitud pendiente para esa área.');
      throw error;
    }

    await registrarBitacora(user.id, user.id, 'solicitud_creada', { area });
    res.status(201).json({ success: true, data });
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/accesos/me/actividad  → últimos 100 eventos de mi cuenta
export async function miActividad(req: Request, res: Response) {
  try {
    const { user } = contextoAuth(req);
    const { data, error } = await supabaseAdmin
      .from('bitacora_accesos')
      .select('id, accion, detalle, creada_en, actor_id, actor:usuarios!bitacora_accesos_actor_id_fkey(nombre)')
      .eq('usuario_id', user.id)
      .order('creada_en', { ascending: false })
      .limit(100);
    if (error) throw error;

    const eventos = (data || []).map((e) => {
      const actor = Array.isArray(e.actor) ? e.actor[0] : e.actor;
      return {
        id: e.id,
        accion: e.accion,
        detalle: e.detalle,
        creada_en: e.creada_en,
        // Si lo hizo otra persona (un administrador), se dice quién
        por: e.actor_id && e.actor_id !== user.id ? (actor as { nombre?: string } | null)?.nombre || null : null,
      };
    });
    res.json({ success: true, data: eventos });
  } catch (error) {
    responderError(res, error);
  }
}
