import { Request, Response } from "express";
import { supabaseAnon, supabaseAdmin } from "../config/supabase";
import { esErrorDeConexion, traducirErrorAuth, MENSAJE_SIN_CONEXION } from "../utils/authErrores";

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
const CONTRASENA_MINIMA = 8;

// POST /api/auth/refresh
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ message: 'Falta el refresh_token' });
    }

    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      return res.status(401).json({ message: 'Sesión expirada. Inicia sesión nuevamente.' });
    }

    // Devolver los nuevos tokens al cliente
    res.json({
      token:         data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
    });
  } catch (error: any) {
    console.error('Error refresh token:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/register
export const registrarUsuario = async (req: Request, res: Response) => {
  try {
    // El rol NO se acepta del body: todo registro nuevo es "vendedor".
    // Los roles superiores se asignan desde la base de datos por un administrador.
    const { nombre, password, departamento } = req.body;
    const email = String(req.body?.email || "").trim().toLowerCase();
    const rol = "vendedor";

    if (!nombre || !email || !password || !departamento) {
      return res.status(400).json({ message: "Completa todos los campos." });
    }
    if (String(password).length < CONTRASENA_MINIMA) {
      return res.status(400).json({ message: `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.` });
    }
    if (!email.endsWith("@sig.biz")) {
      return res.status(400).json({ message: "Solo correos @sig.biz" });
    }

    // 1. Usamos cliente ANON para registro (Seguro)
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${FRONTEND_URL()}/verificado`
      }
    });

    if (authError) {
      console.error("Error Registro (Supabase Auth):", authError);
      const { status, message } = traducirErrorAuth(authError);
      return res.status(status).json({ message });
    }
    if (!authData.user) return res.status(500).json({ message: "Error creando usuario Auth" });

    // Detectar si el usuario ya existe en Supabase Auth
    // Cuando email confirmation está activo y el email ya existe, Supabase devuelve
    // un user con identities vacío (no crea uno nuevo por seguridad anti-enumeración)
    const identities = authData.user.identities;
    if (!identities || identities.length === 0) {
      return res.status(409).json({ 
        message: "Este correo ya está registrado. Si no has verificado tu email, revisa tu bandeja de entrada o spam." 
      });
    }

    // 2. Usamos cliente ADMIN para crear el perfil en la base de datos
    // (Necesario para saltarse RLS temporalmente y asegurar que se cree el perfil)
    const { error: profileError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        nombre,
        email,
        rol,
        departamento: departamento
      });

    if (profileError) {
      // Detectar error de duplicado (el perfil ya existe)
      if (profileError.code === '23505') {
        return res.status(409).json({ message: "Este correo ya está registrado en el sistema." });
      }
      // Detectar error de foreign key (el usuario Auth no se creó realmente)
      if (profileError.code === '23503') {
        return res.status(409).json({ 
          message: "Este correo ya está registrado. Revisa tu bandeja de entrada para verificar tu cuenta." 
        });
      }
      // Si falla el perfil por otra razón, intentamos limpiar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ message: "Error al crear tu cuenta. Intenta de nuevo más tarde." });
    }

    // Retornamos token si la sesión se creó automáticamente
    res.status(201).json({
      message: "Usuario creado correctamente.",
      token: authData.session?.access_token || null, 
      user: { ...authData.user, nombre, rol }
    });

  } catch (error: any) {
    console.error("Error Registro:", error);
    if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
    res.status(500).json({ message: "Error al crear tu cuenta. Intenta de nuevo más tarde." });
  }
};

// POST /api/auth/login
export const loginUsuario = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Login con cliente ANON
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    if (!data.session) return res.status(500).json({ message: "Error de sesión" });

    // 2. Obtener perfil — lo hacemos en paralelo con una pequeña optimización:
    //    Si el perfil ya está en user_metadata (registrado correctamente), lo usamos
    //    directamente y evitamos un roundtrip extra a Supabase.
    const meta = data.user.user_metadata as any;
    let nombre = meta?.nombre;
    let rol = meta?.rol;
    let departamento = meta?.departamento;

    // Si alguno de los campos esenciales falta, hacemos la query a la tabla
    if (!nombre || !rol) {
      const { data: perfil } = await supabaseAdmin
        .from('usuarios')
        .select('nombre, rol, departamento')
        .eq('id', data.user.id)
        .single();

      nombre = perfil?.nombre ?? nombre;
      rol = perfil?.rol ?? rol;
      departamento = perfil?.departamento ?? departamento;
    }

    res.json({
      message:       "Login correcto",
      token:         data.session.access_token,
      refresh_token: data.session.refresh_token,   // ← el cliente lo guarda para auto-renovación
      usuario: {
        id: data.user.id,
        email: data.user.email,
        nombre,
        rol,
        departamento,
      },
    });

  } catch (error: any) {
    console.error("Error Login:", error);
    if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
    res.status(500).json({ message: "Error al iniciar sesión. Intenta de nuevo." });
  }
};

// POST /api/auth/forgot-password  { email }
// Envía el correo de recuperación de Supabase. Siempre responde lo mismo para
// no revelar qué correos están registrados.
export const solicitarRecuperacion = async (req: Request, res: Response) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const respuestaGenerica = {
    message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.",
  };
  if (!email || !email.endsWith("@sig.biz")) {
    return res.status(400).json({ message: "Escribe tu correo corporativo @sig.biz." });
  }
  try {
    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${FRONTEND_URL()}/restablecer`,
    });
    if (error) {
      console.error("Error recuperación de contraseña:", error);
      // Errores de conexión o de envío de correo sí se informan (no revelan si el correo existe)
      const { status, message } = traducirErrorAuth(error);
      if (status === 503) return res.status(503).json({ message });
    }
    return res.json(respuestaGenerica);
  } catch (error) {
    console.error("Error recuperación de contraseña:", error);
    if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
    return res.json(respuestaGenerica);
  }
};

// POST /api/auth/reset-password  { access_token, password }
// El access_token es el que trae el enlace del correo de recuperación.
export const restablecerContrasena = async (req: Request, res: Response) => {
  const accessToken = String(req.body?.access_token || "");
  const password = String(req.body?.password || "");
  if (!accessToken) return res.status(400).json({ message: "El enlace no es válido. Solicita uno nuevo." });
  if (password.length < CONTRASENA_MINIMA) {
    return res.status(400).json({ message: `La contraseña debe tener al menos ${CONTRASENA_MINIMA} caracteres.` });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) {
      if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
      return res.status(401).json({ message: "El enlace expiró o ya se usó. Solicita uno nuevo." });
    }
    const { error: errorUpdate } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password });
    if (errorUpdate) {
      const { status, message } = traducirErrorAuth(errorUpdate);
      return res.status(status).json({ message });
    }
    return res.json({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    if (esErrorDeConexion(error)) return res.status(503).json({ message: MENSAJE_SIN_CONEXION });
    return res.status(500).json({ message: "No se pudo actualizar la contraseña. Intenta de nuevo." });
  }
};
