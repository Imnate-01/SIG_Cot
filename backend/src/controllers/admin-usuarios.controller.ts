import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { contextoAuth } from '../middlewares/requireAuth';
import { responderError, ErrorHttp } from '../utils/http';
import { generarContrasenaTemporal, traducirErrorAuth } from '../utils/authErrores';
import { accesosDeRequest, registrarBitacora } from '../services/accesos';
import { cambiosDeAreas, leerAreas, ordenarAreas, textoOpcional, type Area } from '../domain/accesos';

/**
 * Administración de usuarios (crear cuentas y restablecer contraseñas).
 *
 * Existe porque el registro y la recuperación por correo dependen del envío de
 * correos de Supabase, que con la configuración por defecto solo llega a los
 * miembros del equipo del proyecto. Desde aquí un administrador crea la cuenta
 * ya confirmada y le da al usuario una contraseña temporal.
 *
 * Solo para administradores del sistema (`usuarios.es_admin_sistema`, ver la
 * migración 20261029_01). Antes dependía de la variable ROLES_ADMIN_USUARIOS.
 */
const CONTRASENA_MINIMA = 8;

const texto = (v: unknown) => String(v ?? '').trim();

async function respuestaErrorAuth(res: Response, error: unknown) {
  const { status, message } = traducirErrorAuth(error);
  return res.status(status).json({ success: false, error: message, message });
}

// GET /api/admin/usuarios/permisos — ¿puedo ver el panel? (lo usa el menú)
export async function permisos(req: Request, res: Response) {
  try {
    res.json({ success: true, data: { adminUsuarios: (await accesosDeRequest(req)).esAdmin } });
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/admin/usuarios
export async function listar(_req: Request, res: Response) {
  try {
    const [{ data: perfiles, error }, auth, { data: filasAreas, error: errorAreas }] = await Promise.all([
      supabaseAdmin.from('usuarios').select('id, nombre, email, rol, departamento, activo, created_at, es_admin_sistema').order('nombre'),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from('usuario_areas').select('usuario_id, area'),
    ]);
    if (error) throw error;
    if (auth.error) throw auth.error;
    if (errorAreas) throw errorAreas;

    const porId = new Map(auth.data.users.map((u) => [u.id, u]));
    const areasPorUsuario = new Map<string, string[]>();
    for (const f of filasAreas || []) areasPorUsuario.set(f.usuario_id, [...(areasPorUsuario.get(f.usuario_id) || []), f.area]);
    const data = (perfiles || []).map((p) => {
      const u = porId.get(p.id);
      return {
        ...p,
        es_admin_sistema: !!p.es_admin_sistema,
        areas: ordenarAreas(areasPorUsuario.get(p.id) || []),
        email: p.email || u?.email || '',
        email_confirmado: !!u?.email_confirmed_at,
        ultimo_acceso: u?.last_sign_in_at || null,
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/admin/usuarios  { nombre, email, departamento, rol?, password? }
export async function crear(req: Request, res: Response) {
  const nombre = texto(req.body?.nombre);
  const email = texto(req.body?.email).toLowerCase();
  const departamento = texto(req.body?.departamento);
  const rol = texto(req.body?.rol) || 'vendedor';
  const passwordManual = texto(req.body?.password);
  const areas = req.body?.areas === undefined ? [] : leerAreas(req.body.areas);

  if (areas === null) {
    return res.status(400).json({ success: false, message: 'Hay un área no válida.' });
  }
  if (!nombre || !email || !departamento) {
    return res.status(400).json({ success: false, message: 'Nombre, correo y departamento son obligatorios.' });
  }
  if (!email.endsWith('@sig.biz')) {
    return res.status(400).json({ success: false, message: 'Solo se permiten correos corporativos @sig.biz.' });
  }
  if (passwordManual && passwordManual.length < CONTRASENA_MINIMA) {
    return res.status(400).json({ success: false, message: `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.` });
  }
  const password = passwordManual || generarContrasenaTemporal();

  try {
    // Cuenta ya confirmada: no depende de que llegue el correo de verificación
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) return respuestaErrorAuth(res, error);

    const { error: errorPerfil } = await supabaseAdmin
      .from('usuarios')
      .insert({ id: data.user.id, nombre, email, rol, departamento, activo: true });
    if (errorPerfil) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw errorPerfil;
    }

    const actor = contextoAuth(req).user;
    if (areas.length) {
      const { error: errorAreas } = await supabaseAdmin
        .from('usuario_areas')
        .insert(areas.map((area) => ({ usuario_id: data.user.id, area, asignada_por: actor.id })));
      if (errorAreas) throw errorAreas;
    }
    await registrarBitacora(data.user.id, actor.id, 'cuenta_creada', { areas });

    console.info(`[usuarios] ${actor.email} creó la cuenta ${email} (rol ${rol}, áreas ${areas.join(', ') || 'ninguna'})`);
    res.status(201).json({
      success: true,
      message: 'Usuario creado',
      data: { id: data.user.id, nombre, email, rol, departamento, areas, password_temporal: password },
    });
  } catch (error) {
    responderError(res, error);
  }
}

// POST /api/admin/usuarios/:id/password  { password? }  → contraseña temporal
export async function restablecerContrasena(req: Request, res: Response) {
  const id = texto(req.params.id);
  const passwordManual = texto(req.body?.password);
  if (passwordManual && passwordManual.length < CONTRASENA_MINIMA) {
    return res.status(400).json({ success: false, message: `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.` });
  }
  const password = passwordManual || generarContrasenaTemporal();
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) return respuestaErrorAuth(res, error);
    const actor = contextoAuth(req).user;
    await registrarBitacora(id, actor.id, 'contrasena_restablecida');
    console.info(`[usuarios] ${actor.email} restableció la contraseña de ${id}`);
    res.json({ success: true, message: 'Contraseña restablecida', data: { password_temporal: password } });
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/admin/usuarios/:id  { nombre?, rol?, departamento?, activo? }
export async function actualizar(req: Request, res: Response) {
  const id = texto(req.params.id);
  try {
    if (id === contextoAuth(req).user.id && req.body?.activo === false) {
      throw new ErrorHttp(400, 'No puedes desactivar tu propia cuenta.');
    }
    const cambios: Record<string, unknown> = {};
    for (const campo of ['nombre', 'rol', 'departamento'] as const) {
      if (req.body?.[campo] !== undefined) {
        const valor = texto(req.body[campo]);
        if (!valor) throw new ErrorHttp(400, `El campo ${campo} no puede quedar vacío.`);
        cambios[campo] = valor;
      }
    }
    if (typeof req.body?.activo === 'boolean') cambios.activo = req.body.activo;
    if (Object.keys(cambios).length === 0) throw new ErrorHttp(400, 'No hay cambios.');

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update(cambios)
      .eq('id', id)
      .select('id, nombre, email, rol, departamento, activo')
      .single();
    if (error) throw error;

    // Una cuenta desactivada no puede iniciar sesión (bloqueo en Supabase Auth)
    if (typeof cambios.activo === 'boolean') {
      const { error: errorBan } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: cambios.activo ? 'none' : '876000h',
      });
      if (errorBan) return respuestaErrorAuth(res, errorBan);
      await registrarBitacora(id, contextoAuth(req).user.id, cambios.activo ? 'cuenta_activada' : 'cuenta_desactivada');
    }
    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error);
  }
}

// PUT /api/admin/usuarios/:id/areas  { areas: ['cotizaciones', …] } → reemplaza las áreas
export async function actualizarAreas(req: Request, res: Response) {
  const id = texto(req.params.id);
  try {
    const nuevas = leerAreas(req.body?.areas);
    if (nuevas === null) throw new ErrorHttp(400, 'Hay un área no válida.');

    const { data: filas, error } = await supabaseAdmin.from('usuario_areas').select('area').eq('usuario_id', id);
    if (error) throw error;
    const actuales = ordenarAreas((filas || []).map((f) => f.area));
    const { agregar, quitar } = cambiosDeAreas(actuales, nuevas);
    const actor = contextoAuth(req).user;

    if (quitar.length) {
      const { error: e } = await supabaseAdmin.from('usuario_areas').delete().eq('usuario_id', id).in('area', quitar);
      if (e) throw e;
    }
    if (agregar.length) {
      const { error: e } = await supabaseAdmin
        .from('usuario_areas')
        .insert(agregar.map((area) => ({ usuario_id: id, area, asignada_por: actor.id })));
      if (e) throw e;
    }
    if (agregar.length || quitar.length) {
      await registrarBitacora(id, actor.id, 'areas_actualizadas', { agregadas: agregar, quitadas: quitar });
    }
    res.json({ success: true, data: { id, areas: nuevas } });
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/admin/usuarios/solicitudes?estado=pendiente|todas
export async function listarSolicitudes(req: Request, res: Response) {
  try {
    let consulta = supabaseAdmin
      .from('solicitudes_acceso')
      .select('id, usuario_id, area, motivo, estado, creada_en, resuelta_en, nota, usuario:usuarios!solicitudes_acceso_usuario_id_fkey(nombre, email)')
      .order('creada_en', { ascending: false })
      .limit(100);
    if (texto(req.query.estado) !== 'todas') consulta = consulta.eq('estado', 'pendiente');
    const { data, error } = await consulta;
    if (error) throw error;
    res.json({
      success: true,
      data: (data || []).map((s) => ({ ...s, usuario: Array.isArray(s.usuario) ? s.usuario[0] : s.usuario })),
    });
  } catch (error) {
    responderError(res, error);
  }
}

// PATCH /api/admin/usuarios/solicitudes/:id  { estado: 'aprobada' | 'rechazada', nota? }
export async function resolverSolicitud(req: Request, res: Response) {
  const id = texto(req.params.id);
  try {
    const estado = texto(req.body?.estado);
    if (estado !== 'aprobada' && estado !== 'rechazada') throw new ErrorHttp(400, 'El estado debe ser aprobada o rechazada.');
    const actor = contextoAuth(req).user;

    // Solo se resuelve si sigue pendiente (evita que dos administradores la resuelvan a la vez)
    const { data, error } = await supabaseAdmin
      .from('solicitudes_acceso')
      .update({ estado, nota: textoOpcional(req.body?.nota), resuelta_en: new Date().toISOString(), resuelta_por: actor.id })
      .eq('id', id)
      .eq('estado', 'pendiente')
      .select('id, usuario_id, area, estado')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ErrorHttp(409, 'La solicitud ya fue resuelta o no existe.');

    if (estado === 'aprobada') {
      const { error: e } = await supabaseAdmin
        .from('usuario_areas')
        .upsert({ usuario_id: data.usuario_id, area: data.area as Area, asignada_por: actor.id }, { onConflict: 'usuario_id,area', ignoreDuplicates: true });
      if (e) throw e;
    }
    await registrarBitacora(data.usuario_id, actor.id, estado === 'aprobada' ? 'solicitud_aprobada' : 'solicitud_rechazada', { area: data.area });
    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error);
  }
}
