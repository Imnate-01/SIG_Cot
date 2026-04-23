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
        proveedor,
        descripcion, // ← AGREGAR
        datos_forma
      } = req.body

      // Sanitizar descripción
      const descripcionFinal: string | null =
        (typeof descripcion === 'string' && descripcion.trim().length > 0)
          ? descripcion.trim().slice(0, 120)
          : null;

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
          descripcion: descripcionFinal, // Insertar descripción sanitizada
          estatus_po: 'pendiente',
          // agregamos esta línea para guardar el objeto condiciones completo
          condiciones: condiciones || {},
          datos_forma: datos_forma || null
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

      // I. Calcular el folio (SIG-[MX/US]-{ID})
      const entidad = condiciones?.entidad || 'MX';
      const numero_cotizacion = `SIG-${entidad}-${cotizacion.id}`;

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

      // Formatear con la nueva nomenclatura SIG-[ENTIDAD]-ID
      const cotizacionesFormateadas = data.map((cot: any) => {
        const entidad = cot.condiciones?.entidad || 'MX';
        return {
          ...cot,
          numero_cotizacion: `SIG-${entidad}-${cot.id}`,
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
          numero_cotizacion: `SIG-${data.condiciones?.entidad || 'MX'}-${data.id}`
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

      // C. Recibir datos completos
      let {
        cliente_id,
        facturarA,
        contactoPrincipal,
        contactoSecundario,
        condiciones,
        itemsServicio,
        total,
        // estado, // No permitimos cambiar estado aquí, solo datos
        tipo_servicio = 'TM',
        descripcion = null, // Nuevo campo
        proveedor,
        datos_forma
      } = req.body

      // D. Lógica de Cliente (Igual que Create)
      if (!cliente_id || isNaN(Number(cliente_id))) {
        cliente_id = null;
      }
      let clienteIdFinal = cliente_id;

      if (!clienteIdFinal && facturarA?.nombre) {
        const { data: clienteExistente } = await supabaseUser
          .from('clientes')
          .select('id')
          .ilike('nombre', `%${facturarA.nombre}%`)
          .maybeSingle()

        if (clienteExistente) {
          clienteIdFinal = clienteExistente.id;
        } else {
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

      // E. Construir Notas
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

      // F. Actualizar Cabecera
      const { error: errorUpdate } = await supabaseUser
        .from('cotizaciones')
        .update({
          cliente_id: clienteIdFinal,
          total: total,
          notas: notas,
          tipo_servicio: tipo_servicio,
          descripcion: descripcion, // Actualizar descripción
          condiciones: condiciones || {},
          datos_forma: datos_forma || null
        })
        .eq('id', id);

      if (errorUpdate) throw errorUpdate;

      // G. Estrategia DELETE + INSERT para Items
      // 1. Borrar anteriores
      const { error: errorDeleteItems } = await supabaseUser
        .from('cotizacion_items')
        .delete()
        .eq('cotizacion_id', id);

      if (errorDeleteItems) throw errorDeleteItems;

      // 2. Insertar nuevos
      const itemsConCotizacionId = itemsServicio.map((item: any) => ({
        cotizacion_id: id,
        concepto: item.concepto || 'Servicio',
        cantidad: item.cantidad || 1,
        precio_unitario: item.precioUnitario || 0,
        subtotal: item.total || 0,
        detalles: item.detalles || null,
        desglose: item.desglose || [],
        ingenieros: item.ingenieros || 1
      }))

      const { error: errorInsertItems } = await supabaseUser
        .from('cotizacion_items')
        .insert(itemsConCotizacionId);

      if (errorInsertItems) throw errorInsertItems;

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