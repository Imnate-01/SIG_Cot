-- =============================================================================
-- Escrituras atómicas para cotizaciones y clientes
-- =============================================================================
-- Problema: el backend hacía varias escrituras seguidas (cabecera, borrar
-- partidas, insertar partidas). Si una fallaba a la mitad, quedaban datos
-- incompletos: cotizaciones sin partidas o clientes sin direcciones.
--
-- Solución: cada operación es UNA función de Postgres. Todo lo que hace una
-- función ocurre en una sola transacción: o se aplica completo o nada.
--
-- Notas de diseño:
--  * SECURITY INVOKER: se ejecutan con los permisos del usuario que llama, así
--    que las políticas RLS siguen aplicando igual que antes.
--  * Los tipos de columna se toman de las tablas existentes
--    (jsonb_populate_record / %TYPE), no se asumen aquí.
--  * El backend detecta si estas funciones aún no existen y usa el camino
--    anterior, así que el orden de despliegue no importa.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar (es idempotente).
-- =============================================================================

-- ─── 1. Crear cotización con sus partidas ───────────────────────────────────
create or replace function public.crear_cotizacion(p_cabecera jsonb, p_items jsonb)
returns public.cotizaciones
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cot public.cotizaciones;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La cotización debe tener al menos una partida' using errcode = '22023';
  end if;

  insert into public.cotizaciones
    (cliente_id, creado_por, total, estado, notas, tipo_servicio, descripcion, estatus_po, condiciones, datos_forma)
  select r.cliente_id, r.creado_por, r.total, r.estado, r.notas, r.tipo_servicio, r.descripcion, r.estatus_po, r.condiciones, r.datos_forma
  from jsonb_populate_record(null::public.cotizaciones, p_cabecera) r
  returning * into v_cot;

  insert into public.cotizacion_items
    (cotizacion_id, concepto, cantidad, precio_unitario, subtotal, detalles, desglose, ingenieros)
  select v_cot.id, r.concepto, r.cantidad, r.precio_unitario, r.subtotal, r.detalles, r.desglose, r.ingenieros
  from jsonb_populate_recordset(null::public.cotizacion_items, p_items) r;

  return v_cot;
end;
$$;

-- ─── 2. Editar cotización (solo borradores) y reemplazar sus partidas ──────
create or replace function public.actualizar_cotizacion(
  p_id public.cotizaciones.id%type,
  p_cabecera jsonb,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La cotización debe tener al menos una partida' using errcode = '22023';
  end if;

  update public.cotizaciones c
     set (cliente_id, total, notas, tipo_servicio, descripcion, condiciones, datos_forma) =
         (select r.cliente_id, r.total, r.notas, r.tipo_servicio, r.descripcion, r.condiciones, r.datos_forma
            from jsonb_populate_record(null::public.cotizaciones, p_cabecera) r)
   where c.id = p_id
     and c.estado = 'borrador';

  if not found then
    raise exception 'Cotización % no encontrada o no está en borrador', p_id using errcode = 'P0002';
  end if;

  delete from public.cotizacion_items where cotizacion_id = p_id;

  insert into public.cotizacion_items
    (cotizacion_id, concepto, cantidad, precio_unitario, subtotal, detalles, desglose, ingenieros)
  select p_id, r.concepto, r.cantidad, r.precio_unitario, r.subtotal, r.detalles, r.desglose, r.ingenieros
  from jsonb_populate_recordset(null::public.cotizacion_items, p_items) r;
end;
$$;

-- ─── 3. Eliminar cotización con sus partidas ────────────────────────────────
create or replace function public.eliminar_cotizacion(p_id public.cotizaciones.id%type)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.cotizacion_items where cotizacion_id = p_id;
  delete from public.cotizaciones where id = p_id;
  if not found then
    -- Si la cabecera no se borró (no existe o RLS lo impide), se deshacen
    -- también los borrados de partidas.
    raise exception 'Cotización % no encontrada o sin permiso para eliminarla', p_id using errcode = 'P0002';
  end if;
end;
$$;

-- ─── 4. Editar cliente y reemplazar sus direcciones ─────────────────────────
-- p_campos: solo las columnas que se quieren cambiar (las ausentes no se tocan).
-- p_direcciones: null = no tocar direcciones; [] = borrarlas todas.
create or replace function public.actualizar_cliente(
  p_id public.clientes.id%type,
  p_campos jsonb,
  p_direcciones jsonb
)
returns public.clientes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cli public.clientes;
  c jsonb := coalesce(p_campos, '{}'::jsonb);
begin
  update public.clientes t set
    nombre          = case when c ? 'nombre'          then r.nombre          else t.nombre          end,
    empresa         = case when c ? 'empresa'         then r.empresa         else t.empresa         end,
    contacto_nombre = case when c ? 'contacto_nombre' then r.contacto_nombre else t.contacto_nombre end,
    direccion       = case when c ? 'direccion'       then r.direccion       else t.direccion       end,
    colonia         = case when c ? 'colonia'         then r.colonia         else t.colonia         end,
    ciudad          = case when c ? 'ciudad'          then r.ciudad          else t.ciudad          end,
    cp              = case when c ? 'cp'              then r.cp              else t.cp              end,
    correo          = case when c ? 'correo'          then r.correo          else t.correo          end,
    telefono        = case when c ? 'telefono'        then r.telefono        else t.telefono        end,
    pais            = case when c ? 'pais'            then r.pais            else t.pais            end
  from jsonb_populate_record(null::public.clientes, c) r
  where t.id = p_id
  returning t.* into v_cli;

  if not found then
    raise exception 'Cliente % no encontrado o sin permiso', p_id using errcode = 'P0002';
  end if;

  if p_direcciones is not null then
    if jsonb_typeof(p_direcciones) <> 'array' then
      raise exception 'p_direcciones debe ser un arreglo' using errcode = '22023';
    end if;

    delete from public.cliente_direcciones where cliente_id = p_id;

    insert into public.cliente_direcciones
      (cliente_id, empresa_planta_nombre, tipo, direccion, colonia, ciudad, cp,
       contacto_nombre, contacto_correo, contacto_telefono, activo)
    select p_id, r.empresa_planta_nombre, r.tipo, r.direccion, r.colonia, r.ciudad, r.cp,
           r.contacto_nombre, r.contacto_correo, r.contacto_telefono, r.activo
    from jsonb_populate_recordset(null::public.cliente_direcciones, p_direcciones) r;
  end if;

  return v_cli;
end;
$$;

-- ─── Permisos: solo usuarios autenticados ───────────────────────────────────
revoke all on function public.crear_cotizacion(jsonb, jsonb) from public, anon;
revoke all on function public.actualizar_cotizacion(public.cotizaciones.id%type, jsonb, jsonb) from public, anon;
revoke all on function public.eliminar_cotizacion(public.cotizaciones.id%type) from public, anon;
revoke all on function public.actualizar_cliente(public.clientes.id%type, jsonb, jsonb) from public, anon;

grant execute on function public.crear_cotizacion(jsonb, jsonb) to authenticated;
grant execute on function public.actualizar_cotizacion(public.cotizaciones.id%type, jsonb, jsonb) to authenticated;
grant execute on function public.eliminar_cotizacion(public.cotizaciones.id%type) to authenticated;
grant execute on function public.actualizar_cliente(public.clientes.id%type, jsonb, jsonb) to authenticated;

-- Que PostgREST (la API de Supabase) vea las funciones nuevas de inmediato
notify pgrst, 'reload schema';
