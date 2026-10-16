import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { responderError } from '../utils/http'
import { supabaseAdmin } from '../config/supabase'

export class UsuariosController {

  // ---------------------------------------------------------
  // 1. OBTENER TODOS LOS USUARIOS (Faltaba esta función)
  // ---------------------------------------------------------
  async getAll(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      // Traemos los datos necesarios para el selector
      const { data, error } = await supabaseUser
        .from('usuarios')
        .select('id, nombre, email, departamento, rol')
        .eq('activo', true) // Opcional: Solo usuarios activos
        .order('nombre')

      if (error) throw error

      res.json({ success: true, data })
    } catch (error: any) {
      console.error('Error al obtener usuarios:', error);
      responderError(res, error);
    }
  }

  // ---------------------------------------------------------
  // 2. OBTENER MI PERFIL
  // ---------------------------------------------------------
  async getMe(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      // Validar token real
      const { user } = contextoAuth(req);

      // Buscar perfil
      const { data: perfil, error } = await supabaseUser
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      res.json({ success: true, data: { ...perfil, email: user.email } })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ---------------------------------------------------------
  // 3. ACTUALIZAR MI PERFIL
  // ---------------------------------------------------------
  async updateMe(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      
      const { user } = contextoAuth(req);

      const { nombre, departamento } = req.body

      const { data, error } = await supabaseUser
        .from('usuarios')
        .update({ 
          nombre, 
          departamento,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ---------------------------------------------------------
  // 4. CAMBIAR CONTRASEÑA
  // ---------------------------------------------------------
  async updatePassword(req: Request, res: Response) {
    try {
      const { password } = req.body
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres', message: 'La contraseña debe tener al menos 6 caracteres' })
      }

      // Usuario validado por requireAuth
      const { user } = contextoAuth(req);

      // Usamos el cliente admin para actualizar la contraseña usando el ID del usuario
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: password
      })

      if (error) throw error

      res.json({ success: true, message: 'Contraseña actualizada correctamente' })

    } catch (error: any) {
      console.error('Error al cambiar password:', error)
      responderError(res, error);
    }
  }
}

export default new UsuariosController()