import { Request, Response } from 'express'
// CAMBIO IMPORTANTE: Importamos la función para crear clientes seguros, no la instancia global
import { createClientForUser } from '../config/supabase' 

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
      
      const creado_por = user.id

      // D. Recibir datos
      let {
        cliente_id,
        facturarA,
        contactoPrincipal,
        contactoSecundario,
        condiciones,
        itemsServicio,
        total,
        estado = 'borrador',
        tipo_servicio = 'TM', 
        proveedor
      } = req.body

      // E. Lógica de Cliente Inteligente (Evita duplicados y maneja IDs de texto)
      if (!cliente_id || isNaN(Number(cliente_id))) {
        cliente_id = null;
      }

      let clienteIdFinal = cliente_id;

      // Si no hay ID numérico, buscamos o creamos
      if (!clienteIdFinal && facturarA?.nombre) {
        // 1. Buscar si existe usando el cliente seguro
        const { data: clienteExistente } = await supabaseUser
          .from('clientes')
          .select('id')
          .ilike('nombre', `%${facturarA.nombre}%`)
          .maybeSingle()

        if (clienteExistente) {
          clienteIdFinal = clienteExistente.id;
        } else {
          // 2. Crear cliente nuevo
          const { data: nuevoCliente, error: errorCliente } = await supabaseUser
            .from('clientes')
            .insert({
              nombre: facturarA.nombre,
              empresa: facturarA.nombre,
              direccion: facturarA.direccion || '',
              colonia: facturarA.colonia || '',
              ciudad: facturarA.ciudad || '',
              cp: facturarA.cp || '',
              correo: contactoSecundario?.email || '',
              telefono: contactoSecundario?.telefono || ''
            })
            .select()
            .single()

          if (errorCliente) throw errorCliente
          clienteIdFinal = nuevoCliente.id
        }
      }

      // F. Generar texto de Notas
      const notas = `
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

    // G. Insertar la Cotización Maestra
      const { data: cotizacion, error: errorCotizacion } = await supabaseUser
        .from('cotizaciones')
        .insert({
          cliente_id: clienteIdFinal,
          creado_por: creado_por,
          total: total,
          estado: estado,
          // Guardamos notas por compatibilidad, pero usaremos 'condiciones' para el PDF nuevo
          notas: notas, 
          tipo_servicio: tipo_servicio,
          estatus_po: 'pendiente',
          // agregamos esta línea para guardar el objeto condiciones completo
          condiciones: condiciones || {} 
        })
        .select()
        .single()

      if (errorCotizacion) throw errorCotizacion

     // H. Insertar los Items
      const itemsConCotizacionId = itemsServicio.map((item: any) => ({
        cotizacion_id: cotizacion.id,
        concepto: item.concepto || 'Servicio',
        cantidad: item.cantidad || 1,
        precio_unitario: item.precioUnitario || 0,
        subtotal: item.total || 0,
        // AQUÍ ESTÁ LA CORRECCIÓN: Guardamos lo que faltaba
        detalles: item.detalles || null,       
        desglose: item.desglose || [],          // Guardamos el array de ingenieros
        //  NUEVO: Guardamos la cantidad de ingenieros explícitamente
        ingenieros: item.ingenieros || 1
      }))

      const { error: errorItems } = await supabaseUser
        .from('cotizacion_items')
        .insert(itemsConCotizacionId)

      if (errorItems) throw errorItems

      // I. Calcular el folio (SIG-{ID})
      // Nota: Ahora usamos SIG, como pediste, en lugar de ST/SM
      const numero_cotizacion = `SIG-${cotizacion.id}`;

      res.status(201).json({
        success: true,
        message: 'Cotización creada exitosamente',
        data: {
          ...cotizacion,
          numero_cotizacion,
          items: itemsConCotizacionId
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

      // Formatear con la nueva nomenclatura SIG-ID
      const cotizacionesFormateadas = data.map((cot: any) => {
        return {
          ...cot,
          numero_cotizacion: `SIG-${cot.id}`,
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
          usuarios ( id, nombre, email ),
          cotizacion_items ( * )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      res.json({
        success: true,
        data: {
          ...data,
          numero_cotizacion: `SIG-${data.id}`
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
  // 5. ELIMINAR COTIZACIÓN
  // ---------------------------------------------------------
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });
      const supabaseUser = createClientForUser(token);

      const { id } = req.params

      // Primero borramos items para mantener integridad referencial (si no está en cascada)
      await supabaseUser.from('cotizacion_items').delete().eq('cotizacion_id', id);

      const { error } = await supabaseUser
        .from('cotizaciones')
        .delete()
        .eq('id', id)

      if (error) throw error

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
        .select('*')
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