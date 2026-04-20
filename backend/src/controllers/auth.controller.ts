import { Request, Response } from "express";
import { supabaseAnon, supabaseAdmin } from "../config/supabase"; // Importamos los clientes seguros

// POST /api/auth/register
export const registrarUsuario = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol, departamento } = req.body;

    if (!email.endsWith("@sig.biz")) {
      return res.status(400).json({ message: "Solo correos @sig.biz" });
    }

    // 1. Usamos cliente ANON para registro (Seguro)
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificado`
      }
    });

    if (authError) return res.status(400).json({ message: authError.message });
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
        rol: rol || "vendedor",
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
    res.status(500).json({ message: error.message });
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

    if (error) return res.status(401).json({ message: "Credenciales inválidas" });
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
      message: "Login correcto",
      token: data.session.access_token,
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
    res.status(500).json({ message: error.message });
  }
};