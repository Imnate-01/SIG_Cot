import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { contextoAuth } from '../middlewares/requireAuth';
import { tieneRol } from '../middlewares/requireRole';
import { responderError, ErrorHttp } from '../utils/http';
import { generarContrasenaTemporal, traducirErrorAuth } from '../utils/authErrores';

/**
 * Administración de usuarios (crear cuentas y restablecer contraseñas).
 *
 * Existe porque el registro y la recuperación por correo dependen del envío de
 * correos de Supabase, que con la configuración por defecto solo llega a los
 * miembros del equipo del proyecto. Desde aquí un administrador crea la cuenta
 * ya confirmada y le da al usuario una contraseña temporal.
 *
 * Solo para los roles de ROLES_ADMIN_USUARIOS (si no está definida, nadie entra).
 */
export const VARIABLE_ROLES_ADMIN = 'ROLES_ADMIN_USUARIOS';
const CONTRASENA_MINIMA = 8;

const texto = (v: unknown) => String(v ?? '').trim();

async function respuestaErrorAuth(res: Response, error: unknown) {
  const { status, message } = traducirErrorAuth(error);
  return res.status(status).json({ success: false, error: message, message });
}

// GET /api/admin/usuarios/permisos — ¿puedo ver el panel? (lo usa el menú)
export async function permisos(req: Request, res: Response) {
  try {
    res.json({ success: true, data: { adminUsuarios: await tieneRol(req, VARIABLE_ROLES_ADMIN) } });
  } catch (error) {
    responderError(res, error);
  }
}

// GET /api/admin/usuarios
export async function listar(_req: Request, res: Response) {
  try {
    const [{ data: perfiles, error }, auth] = await Promise.all([
      supabaseAdmin.from('usuarios').select('id, nombre, email, rol, departamento, activo, created_at').order('nombre'),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (error) throw error;
    if (auth.error) throw auth.error;

    const porId = new Map(auth.data.users.map((u) => [u.id, u]));
    const data = (perfiles || []).map((p) => {
      const u = porId.get(p.id);
      return {
        ...p,
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

    console.info(`[usuarios] ${contextoAuth(req).user.email} creó la cuenta ${email} (rol ${rol})`);
    res.status(201).json({
      success: true,
      message: 'Usuario creado',
      data: { id: data.user.id, nombre, email, rol, departamento, password_temporal: password },
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
    console.info(`[usuarios] ${contextoAuth(req).user.email} restableció la contraseña de ${id}`);
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
    }
    res.json({ success: true, data });
  } catch (error) {
    responderError(res, error);
  }
}
