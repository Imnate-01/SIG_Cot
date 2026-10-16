import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { responderError } from '../utils/http'
import { supabaseAdmin } from '../config/supabase'
import { pickFields } from '../utils/pickFields'

// Columnas que el usuario puede modificar en un servicio del catálogo
const CAMPOS_EDITABLES_SERVICIO = [
  'concepto', 'unidad', 'precio_sin_contrato', 'precio_con_contrato',
  'moneda', 'categoria', 'region', 'activo',
] as const

export class ServiciosController {

  // OBTENER TODOS (Solo los activos)
  // Usamos supabaseAdmin para bypassear RLS en la lectura del catálogo público de tarifas
  async getAll(req: Request, res: Response) {
    try {
      // El token ya lo validó requireAuth (ver server.ts)
      // Filtrar por region si viene como query param
      const region = req.query.region as string | undefined;
      let query = supabaseAdmin
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('id');

      if (region) {
        query = query.eq('region', region.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // CREAR
  async create(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { concepto, unidad, precio_sin_contrato, precio_con_contrato, moneda, categoria, region } = req.body

      const { data, error } = await supabaseUser
        .from('servicios')
        .insert({
          concepto, unidad, precio_sin_contrato, precio_con_contrato, moneda, categoria, region: region || 'MX'
        })
        .select()
        .single()

      if (error) throw error
      res.status(201).json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ACTUALIZAR
  async update(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { id } = req.params
      const updates = pickFields(req.body, CAMPOS_EDITABLES_SERVICIO)
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No hay campos válidos para actualizar' })
      }

      const { data, error } = await supabaseUser
        .from('servicios')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ELIMINAR (Soft Delete - Solo desactivamos para no romper cotizaciones viejas)
  async delete(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { id } = req.params

      const { error } = await supabaseUser
        .from('servicios')
        .update({ activo: false }) // Lo marcamos como inactivo
        .eq('id', id)

      if (error) throw error
      res.json({ success: true, message: 'Servicio desactivado correctamente' })
    } catch (error: any) {
      responderError(res, error);
    }
  }
}

export default new ServiciosController()