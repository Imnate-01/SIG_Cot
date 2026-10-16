import { Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
// Importamos la función para crear clientes seguros, no la instancia global
import { createClientForUser } from '../config/supabase'
import { verificarCotizacion, registrarDiferencias, PRICING_ENFORCE, type ResultadoVerificacion } from '../services/verificacionPrecios'
import {
  buscarOCrearCliente,
  crearCotizacionConPartidas,
  actualizarCotizacionConPartidas,
  eliminarCotizacion,
  type CabeceraCotizacion,
  type PartidaCotizacion,
} from '../repositories/cotizaciones.repository'

// ─── Helpers compartidos por crear y editar ─────────────────────────────────

/** Folio visible: SIG-{MX|US|CA}-{id} */
export function formatearFolio(cot: { id: number | string; condiciones?: { entidad?: string } | null }): string {
  return `SIG-${cot.condiciones?.entidad || 'MX'}-${cot.id}`
}

/** Descripción corta: sin espacios sobrantes, máximo 120 caracteres, null si vacía. */
function sanitizarDescripcion(descripcion: unknown): string | null {
  return (typeof descripcion === 'string' && descripcion.trim().length > 0)
    ? descripcion.trim().slice(0, 120)
    : null
}

/** Texto plano de notas (compatibilidad con cotizaciones antiguas). */
function construirNotas(body: any): string {
  const { proveedor, facturarA, contactoPrincipal, contactoSecundario, condiciones } = body
  return `
PROVEEDOR:
${proveedor?.nombre || ''}
${proveedor?.direccion || ''}

FACTURAR A:
${facturarA?.nombre || ''}

CONTACTOS:
Principal: ${contactoPrincipal?.nombre || ''} (${contactoPrincipal?.email || ''})
Secundario: ${contactoSecundario?.nombre || ''} (${contactoSecundario?.email || ''})

CONDICIONES:
Precios: ${condiciones?.precios || ''}
Moneda: ${condiciones?.moneda || 'USD'}
Observaciones: ${condiciones?.observaciones || ''}
      `.trim()
}

/**
 * cliente_id del body si es numérico; si no, busca/crea el cliente por el
 * nombre de "Facturar a". Devuelve null si no hay datos de cliente.
 */
async function resolverCliente(supabase: SupabaseClient, body: any): Promise<number | string | null> {
  const { cliente_id, facturarA, contactoSecundario, condiciones } = body
  if (cliente_id && !isNaN(Number(cliente_id))) return cliente_id
  if (!facturarA?.nombre || !String(facturarA.nombre).trim()) return null

  return buscarOCrearCliente(supabase, {
    nombre: String(facturarA.nombre),
    direccion: facturarA.direccion,
    colonia: facturarA.colonia,
    ciudad: facturarA.ciudad,
    cp: facturarA.cp,
    correo: contactoSecundario?.email,
    telefono: contactoSecundario?.telefono,
    pais: condiciones?.entidad || 'MX',
  })
}

/** Partidas del formulario → filas de cotizacion_items. */
function mapearPartidas(itemsServicio: any[], verificacion: ResultadoVerificacion): PartidaCotizacion[] {
  return itemsServicio.map((item: any, idx: number) => ({
    concepto: item.concepto || 'Servicio',
    cantidad: item.cantidad || 1,
    precio_unitario: item.precioUnitario || 0,
    subtotal: PRICING_ENFORCE ? verificacion.subtotales[idx] : (item.total || 0),
    detalles: item.detalles || null,
    desglose: item.desglose || [],   // horas por ingeniero (servicios de viaje)
    ingenieros: item.ingenieros || 1,
  }))
}

export class CotizacionesController {

  // ---------------------------------------------------------
  // 1. CREAR COTIZACIÓN
  // ---------------------------------------------------------
  async create(req: Request, res: Response) {
    try {
      // A. Validar Token
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado: Falta token' })

      // B. Crear el cliente seguro (Identidad del Usuario)
      const supabaseUser = createClientForUser(token);

      // C. Obtener el ID del usuario para el campo 'creado_por'
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
      if (authError || !user) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
      }

      // D. Recibir datos
      const {
        cliente_id,
        facturarA,
        contactoSecundario,
        condiciones,
        itemsServicio,
        total,
        estado = 'borrador',
        tipo_servicio = 'TM',
        descripcion,
        datos_forma
      } = req.body

      // Validar partidas ANTES de escribir nada
      if (!Array.isArray(itemsServicio) || itemsServicio.length === 0) {
        return res.status(400).json({ success: false, message: 'La cotización debe tener al menos una partida' })
      }

      // Recalcular totales en el servidor (ver services/verificacionPrecios.ts)
      const verificacion = verificarCotizacion(itemsServicio, total)
      registrarDiferencias(`crear cotización (usuario ${user.id})`, verificacion.diferencias)

      // E. Cliente: el seleccionado, o buscar/crear por nombre exacto
      const clienteIdFinal = await resolverCliente(supabaseUser, req.body)

      // F. Cabecera + partidas en una sola transacción
      const cabecera: CabeceraCotizacion = {
        cliente_id: clienteIdFinal,
        creado_por: user.id,
        total: PRICING_ENFORCE ? verificacion.total : total,
        estado,
        // Guardamos notas por compatibilidad, pero el PDF usa 'condiciones'
        notas: construirNotas(req.body),
        tipo_servicio,
        descripcion: sanitizarDescripcion(descripcion),
        estatus_po: 'pendiente',
        condiciones: condiciones || {},
        datos_forma: datos_forma || null,
      }
      const partidas = mapearPartidas(itemsServicio, verificacion)
      const cotizacion = await crearCotizacionConPartidas(supabaseUser, cabecera, partidas)

      res.status(201).json({
        success: true,
        message: 'Cotización creada exitosamente',
        data: {
          ...cotizacion,
          numero_cotizacion: formatearFolio(cotizacion),
          items: partidas.map((p) => ({ ...p, cotizacion_id: cotizacion.id }))
        }
      })

    } catch (error: any) {
      console.error('Error al crear cotización:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno al crear cotización'
      })
    }
  }

  // ---------------------------------------------------------
  // 2. OBTENER TODAS (DASHBOARD)
  // ---------------------------------------------------------
  async getAll(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { data, error } = await supabaseUser
        .from('cotizaciones')
        .select(`
          *,
          clientes ( nombre, empresa ),
          usuarios ( nombre, email )
        `)
        .order('fecha_creacion', { ascending: false })

      if (error) throw error

      // Formatear con la nueva nomenclatura SIG-[ENTIDAD]-ID
      const cotizacionesFormateadas = data.map((cot: any) => {
        return {
          ...cot,
          numero_cotizacion: formatearFolio(cot),
          creado_por_nombre: cot.usuarios?.nombre || 'Desconocido'
        }
      })

      res.json({ success: true, data: cotizacionesFormateadas })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // ---------------------------------------------------------
  // 3. OBTENER UNA POR ID (DETALLE)
  // ---------------------------------------------------------
  async getById(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params

      const { data, error } = await supabaseUser
        .from('cotizaciones')
        .select(`
          *,
          clientes ( * ),
          usuarios ( id, nombre, email, departamento ),
          cotizacion_items ( * )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      res.json({
        success: true,
        data: {
          ...data,
          numero_cotizacion: formatearFolio(data)
        }
      })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // ---------------------------------------------------------
  // 4. ACTUALIZAR ESTADO Y PO
  // ---------------------------------------------------------
  async updateEstado(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params
      const { estado, orden_compra, estatus_po } = req.body

      const updateData: any = { estado }

      if (estado === 'aceptada') {
        if (orden_compra !== undefined) updateData.orden_compra = orden_compra;
        if (estatus_po !== undefined) updateData.estatus_po = estatus_po;
      }

      if (estado === 'borrador' || estado === 'rechazada') {
        updateData.estatus_po = 'pendiente';
      }

      const { data, error } = await supabaseUser
        .from('cotizaciones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // ---------------------------------------------------------
  // 4.5. ACTUALIZAR COTIZACIÓN (EDICIÓN DE BORRADOR)
  // ---------------------------------------------------------
  async update(req: Request, res: Response) {
    try {
      // A. Validar Token
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado: Falta token' })

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      // B. Verificar que exista y sea borrador
      const { data: cotizacionActual, error: errorCheck } = await supabaseUser
        .from('cotizaciones')
        .select('estado')
        .eq('id', id)
        .single();

      if (errorCheck || !cotizacionActual) {
        return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
      }

      if (cotizacionActual.estado !== 'borrador') {
        return res.status(400).json({ success: false, message: 'Solo se pueden editar cotizaciones en estado borrador.' });
      }

      // C. Recibir datos (el estado no se cambia aquí, solo datos)
      const {
        condiciones,
        itemsServicio,
        total,
        tipo_servicio = 'TM',
        descripcion = null,
        datos_forma
      } = req.body

      if (!Array.isArray(itemsServicio) || itemsServicio.length === 0) {
        return res.status(400).json({ success: false, message: 'La cotización debe tener al menos una partida' })
      }

      // Recalcular totales en el servidor (ver services/verificacionPrecios.ts)
      const verificacion = verificarCotizacion(itemsServicio, total)
      registrarDiferencias(`editar cotización ${id}`, verificacion.diferencias)

      // D. Cliente (misma lógica que al crear)
      const clienteIdFinal = await resolverCliente(supabaseUser, req.body)

      // E. Cabecera + reemplazo de partidas en una sola transacción
      await actualizarCotizacionConPartidas(
        supabaseUser,
        id,
        {
          cliente_id: clienteIdFinal,
          total: PRICING_ENFORCE ? verificacion.total : total,
          notas: construirNotas(req.body),
          tipo_servicio,
          descripcion: sanitizarDescripcion(descripcion),
          condiciones: condiciones || {},
          datos_forma: datos_forma || null,
        },
        mapearPartidas(itemsServicio, verificacion),
      )

      res.json({
        success: true,
        message: 'Cotización actualizada correctamente',
        data: { id }
      })

    } catch (error: any) {
      console.error('Error al actualizar cotización:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno al actualizar cotización'
      })
    }
  }

  // ---------------------------------------------------------
  // 5. ELIMINAR COTIZACIÓN
  // ---------------------------------------------------------
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params

      // Partidas y cabecera en una sola transacción
      await eliminarCotizacion(supabaseUser, id)

      res.json({ success: true, message: 'Cotización eliminada correctamente' })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // ---------------------------------------------------------
  // 6. UTILS (USANDO CLIENTE SEGURO)
  // ---------------------------------------------------------
  async getClientes(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

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

  async getUsuarios(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { data, error } = await supabaseUser
        .from('usuarios')
        .select('id, nombre, email, departamento')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      res.json({ success: true, data })
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

export default new CotizacionesController()