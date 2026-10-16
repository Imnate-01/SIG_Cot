/**
 * Acceso a datos de cotizaciones y clientes.
 *
 * Las escrituras de varios pasos usan funciones de Postgres (una transacción
 * cada una). Si la migración aún no está aplicada, se usa el camino anterior.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { esFuncionNoDisponible, avisarMigracionPendiente, escaparLike } from '../utils/rpc';

export interface CabeceraCotizacion {
  cliente_id: number | string | null;
  creado_por?: string;
  total: number;
  estado?: string;
  notas: string;
  tipo_servicio: string;
  descripcion: string | null;
  estatus_po?: string;
  condiciones: Record<string, unknown>;
  datos_forma: unknown;
}

/** Fila de `cotizaciones` devuelta por la base de datos. */
export interface CotizacionGuardada {
  id: number | string;
  condiciones?: { entidad?: string } | null;
  [columna: string]: unknown;
}

export interface PartidaCotizacion {
  concepto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  detalles: string | null;
  desglose: unknown;   // arreglo de horas por ingeniero, o { tipo: "servicio_externo" }
  ingenieros: number;
}

// ─── Clientes ───────────────────────────────────────────────────────────────

export interface DatosClienteNuevo {
  nombre: string;
  direccion?: string;
  colonia?: string;
  ciudad?: string;
  cp?: string;
  correo?: string;
  telefono?: string;
  pais?: string;
}

/**
 * Busca un cliente por nombre EXACTO (sin distinguir mayúsculas ni espacios
 * al inicio/fin) y, si no existe, lo crea.
 *
 * Antes se buscaba con `ilike '%nombre%'`: "Nestle" coincidía con
 * "Nestle Waters" (cliente equivocado) y, si había 2+ coincidencias, el error
 * se ignoraba y se creaba un cliente duplicado.
 */
export async function buscarOCrearCliente(supabase: SupabaseClient, datos: DatosClienteNuevo): Promise<number | string> {
  const nombre = datos.nombre.trim();

  const { data: existentes, error: errorBusqueda } = await supabase
    .from('clientes')
    .select('id')
    .ilike('nombre', escaparLike(nombre))
    .order('id', { ascending: true })
    .limit(1);
  if (errorBusqueda) throw errorBusqueda;
  if (existentes && existentes.length > 0) return existentes[0].id;

  const { data: nuevo, error } = await supabase
    .from('clientes')
    .insert({
      nombre,
      empresa: nombre,
      direccion: datos.direccion || '',
      colonia: datos.colonia || '',
      ciudad: datos.ciudad || '',
      cp: datos.cp || '',
      correo: datos.correo || '',
      telefono: datos.telefono || '',
      pais: datos.pais || 'MX',
    })
    .select('id')
    .single();
  if (error) throw error;
  return nuevo.id;
}

// ─── Cotizaciones ───────────────────────────────────────────────────────────

/** Crea la cotización y sus partidas en una sola transacción. */
export async function crearCotizacionConPartidas(
  supabase: SupabaseClient,
  cabecera: CabeceraCotizacion,
  partidas: PartidaCotizacion[],
): Promise<CotizacionGuardada> {
  const { data, error } = await supabase.rpc('crear_cotizacion', { p_cabecera: cabecera, p_items: partidas });
  if (!error) return data as CotizacionGuardada;
  if (!esFuncionNoDisponible(error)) throw error;

  // ── Respaldo (sin transacción): comportamiento anterior ──
  avisarMigracionPendiente('crear_cotizacion');
  const { data: cotizacion, error: errorCabecera } = await supabase
    .from('cotizaciones').insert(cabecera).select().single();
  if (errorCabecera) throw errorCabecera;

  const { error: errorPartidas } = await supabase
    .from('cotizacion_items')
    .insert(partidas.map((p) => ({ ...p, cotizacion_id: cotizacion.id })));
  if (errorPartidas) throw errorPartidas;
  return cotizacion;
}

/** Actualiza cabecera y reemplaza partidas en una sola transacción. */
export async function actualizarCotizacionConPartidas(
  supabase: SupabaseClient,
  id: string | number,
  cabecera: Omit<CabeceraCotizacion, 'creado_por' | 'estado' | 'estatus_po'>,
  partidas: PartidaCotizacion[],
): Promise<void> {
  const { error } = await supabase.rpc('actualizar_cotizacion', { p_id: id, p_cabecera: cabecera, p_items: partidas });
  if (!error) return;
  if (!esFuncionNoDisponible(error)) throw error;

  avisarMigracionPendiente('actualizar_cotizacion');
  const { error: errorCabecera } = await supabase.from('cotizaciones').update(cabecera).eq('id', id);
  if (errorCabecera) throw errorCabecera;
  const { error: errorBorrar } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id);
  if (errorBorrar) throw errorBorrar;
  const { error: errorInsertar } = await supabase
    .from('cotizacion_items')
    .insert(partidas.map((p) => ({ ...p, cotizacion_id: id })));
  if (errorInsertar) throw errorInsertar;
}

/** Elimina la cotización y sus partidas en una sola transacción. */
export async function eliminarCotizacion(supabase: SupabaseClient, id: string | number): Promise<void> {
  const { error } = await supabase.rpc('eliminar_cotizacion', { p_id: id });
  if (!error) return;
  if (!esFuncionNoDisponible(error)) throw error;

  avisarMigracionPendiente('eliminar_cotizacion');
  await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id);
  const { error: errorCabecera } = await supabase.from('cotizaciones').delete().eq('id', id);
  if (errorCabecera) throw errorCabecera;
}

// ─── Clientes: edición con direcciones ──────────────────────────────────────

export interface DireccionCliente {
  empresa_planta_nombre: string;
  tipo: string;
  direccion?: string;
  colonia?: string;
  ciudad?: string;
  cp?: string;
  contacto_nombre: string | null;
  contacto_correo: string | null;
  contacto_telefono: string | null;
  activo: boolean;
}

/**
 * Actualiza el cliente y (si `direcciones` no es null) reemplaza sus
 * direcciones, todo en una sola transacción.
 */
export async function actualizarClienteConDirecciones(
  supabase: SupabaseClient,
  id: string | number,
  campos: Record<string, unknown>,
  direcciones: DireccionCliente[] | null,
): Promise<Record<string, any>> {
  const { data, error } = await supabase.rpc('actualizar_cliente', {
    p_id: id,
    p_campos: campos,
    p_direcciones: direcciones,
  });
  if (!error) return data as Record<string, any>;
  if (!esFuncionNoDisponible(error)) throw error;

  avisarMigracionPendiente('actualizar_cliente');
  const { data: cliente, error: errorCliente } = await supabase
    .from('clientes').update(campos).eq('id', id).select().single();
  if (errorCliente) throw errorCliente;

  if (direcciones) {
    const { error: errorBorrar } = await supabase.from('cliente_direcciones').delete().eq('cliente_id', id);
    if (errorBorrar) throw errorBorrar;
    if (direcciones.length > 0) {
      const { error: errorInsertar } = await supabase
        .from('cliente_direcciones')
        .insert(direcciones.map((d) => ({ ...d, cliente_id: id })));
      if (errorInsertar) throw errorInsertar;
    }
  }
  return cliente;
}
