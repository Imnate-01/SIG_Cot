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
    });

    if (authError) return res.status(400).json({ message: authError.message });
    if (!authData.user) return res.status(500).json({ message: "Error creando usuario Auth" });

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
      // Si falla el perfil, intentamos limpiar el usuario de Auth para no dejar basura
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ message: "Error al crear perfil: " + profileError.message });
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

    // 1. Login con cliente ANON (No requiere permisos especiales)
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ message: "Credenciales inválidas" });
    if (!data.session) return res.status(500).json({ message: "Error de sesión" });

    // 2. Para leer el perfil, lo correcto es usar el cliente ADMIN aquí 
    // para asegurar que obtenemos los datos del rol sin importar las reglas RLS del usuario
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      message: "Login correcto",
      token: data.session.access_token, // Token oficial de Supabase
      usuario: {
        id: data.user.id,
        email: data.user.email,
        nombre: perfil?.nombre,
        rol: perfil?.rol,
        // ✅ AGREGADO: Enviamos el departamento para decidir la redirección en el front
        departamento: perfil?.departamento 
      },
    });

  } catch (error: any) {
    console.error("Error Login:", error);
    res.status(500).json({ message: error.message });
  }
};