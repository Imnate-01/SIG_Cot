import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { responderError } from '../utils/http'
import { pickFields } from '../utils/pickFields'
import { actualizarClienteConDirecciones, type DireccionCliente } from '../repositories/cotizaciones.repository'

/** Dirección del formulario → fila de cliente_direcciones (sin cliente_id). */
function mapearDireccion(d: any): DireccionCliente {
  return {
    empresa_planta_nombre: d.empresa_planta_nombre || d.nombre_ubicacion || 'Principal',
    tipo: d.tipo || 'ship_to',
    direccion: d.direccion,
    colonia: d.colonia,
    ciudad: d.ciudad,
    cp: d.cp,
    contacto_nombre: d.contacto_nombre || null,
    contacto_correo: d.contacto_correo || null,
    contacto_telefono: d.contacto_telefono || null,
    activo: d.activo !== undefined ? d.activo : true,
  }
}

// Columnas de `clientes` que se pueden modificar desde el formulario
const CAMPOS_EDITABLES_CLIENTE = [
  'nombre', 'empresa', 'contacto_nombre', 'direccion', 'colonia',
  'ciudad', 'cp', 'correo', 'telefono', 'pais',
] as const

export class ClientesController {

  // 1. OBTENER TODOS
  async getAll(req: Request, res: Response) {
    try {
      // A. Extraer el token del header (Bearer token)
      const supabaseUser = contextoAuth(req).supabase;

      // C. Consultar usando el cliente seguro (RLS se aplicará automáticamente)
      const { data, error } = await supabaseUser
        .from('clientes')
        .select('*, cliente_direcciones(*), cliente_maquinas(*)')
        .order('nombre')

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // 2. CREAR CLIENTE
  async create(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { nombre, empresa, direccion, colonia, ciudad, cp, correo, telefono, cliente_direcciones, pais } = req.body

      const { data, error } = await supabaseUser
        .from('clientes')
        .insert({
          nombre,
          empresa: empresa || nombre,
          direccion, colonia, ciudad, cp, correo, telefono, pais: pais || 'MX'
        })
        .select()
        .single()

      if (error) throw error

      if (cliente_direcciones && Array.isArray(cliente_direcciones) && cliente_direcciones.length > 0) {
        const direccionesToInsert = cliente_direcciones.map((d: any) => ({ ...mapearDireccion(d), cliente_id: data.id }));
        const { error: insertError } = await supabaseUser.from('cliente_direcciones').insert(direccionesToInsert);
        if (insertError) throw insertError;
      }

      res.status(201).json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // 3. ACTUALIZAR CLIENTE
  async update(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { id } = req.params
      const { cliente_direcciones } = req.body
      const updates = pickFields(req.body, CAMPOS_EDITABLES_CLIENTE)

      // null = no tocar direcciones (el body no las trae)
      const direcciones = Array.isArray(cliente_direcciones)
        ? cliente_direcciones.map(mapearDireccion)
        : null

      // Cliente + direcciones en una sola transacción (antes: si fallaba el
      // insert, el cliente se quedaba sin direcciones)
      const data = await actualizarClienteConDirecciones(supabaseUser, id, updates, direcciones)

      res.json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // 4. ELIMINAR CLIENTE
  async delete(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { id } = req.params
      const { error } = await supabaseUser.from('clientes').delete().eq('id', id)

      if (error) throw error
      res.json({ success: true, message: 'Cliente eliminado' })
    } catch (error: any) {
      responderError(res, error);
    }
  }
}

export default new ClientesController()