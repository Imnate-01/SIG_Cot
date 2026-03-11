import { Request, Response } from 'express'
import { createClientForUser } from '../config/supabase' // Importamos la función segura

export class ClientesController {

  // 1. OBTENER TODOS
  async getAll(req: Request, res: Response) {
    try {
      // A. Extraer el token del header (Bearer token)
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ success: false, error: "No autorizado: Falta token" });
      }

      // B. Crear cliente seguro para este usuario
      const supabaseUser = createClientForUser(token);

      // C. Consultar usando el cliente seguro (RLS se aplicará automáticamente)
      const { data, error } = await supabaseUser
        .from('clientes')
        .select('*, cliente_direcciones(*), cliente_maquinas(*)')
        .order('nombre')

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // 2. CREAR CLIENTE
  async create(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { nombre, empresa, direccion, colonia, ciudad, cp, correo, telefono, cliente_direcciones } = req.body

      const { data, error } = await supabaseUser
        .from('clientes')
        .insert({
          nombre,
          empresa: empresa || nombre,
          direccion, colonia, ciudad, cp, correo, telefono
        })
        .select()
        .single()

      if (error) throw error

      if (cliente_direcciones && Array.isArray(cliente_direcciones) && cliente_direcciones.length > 0) {
        const direccionesToInsert = cliente_direcciones.map((d: any) => ({
          cliente_id: data.id,
          nombre_ubicacion: d.nombre_ubicacion || 'Principal',
          direccion: d.direccion,
          colonia: d.colonia,
          ciudad: d.ciudad,
          cp: d.cp
        }));
        await supabaseUser.from('cliente_direcciones').insert(direccionesToInsert);
      }

      res.status(201).json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // 3. ACTUALIZAR CLIENTE
  async update(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params
      const { cliente_direcciones, cliente_maquinas, ...updates } = req.body

      const { data, error } = await supabaseUser
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      if (cliente_direcciones && Array.isArray(cliente_direcciones)) {
        // Simple sync strategy: Delete existing and insert new ones
        await supabaseUser.from('cliente_direcciones').delete().eq('cliente_id', id);
        
        if (cliente_direcciones.length > 0) {
          const direccionesToInsert = cliente_direcciones.map((d: any) => ({
            cliente_id: id,
            nombre_ubicacion: d.nombre_ubicacion || 'Principal',
            direccion: d.direccion,
            colonia: d.colonia,
            ciudad: d.ciudad,
            cp: d.cp
          }));
          await supabaseUser.from('cliente_direcciones').insert(direccionesToInsert);
        }
      }

      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // 4. ELIMINAR CLIENTE
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params
      const { error } = await supabaseUser.from('clientes').delete().eq('id', id)

      if (error) throw error
      res.json({ success: true, message: 'Cliente eliminado' })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

export default new ClientesController()