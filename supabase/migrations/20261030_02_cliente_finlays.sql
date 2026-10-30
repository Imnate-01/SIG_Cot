-- =============================================================================
-- Datos: Leahy / IFP cambió de dueño y ahora es Finlays Solutions, Inc.
-- =============================================================================
-- Mismas direcciones y máquinas; solo cambia el nombre. Son dos registros
-- (una planta cada uno), que la lista de clientes distingue por la ciudad:
--   87  Leahy / IFP        → Minden, NV   (2232 Meridian Blvd., Ste. K)
--   90  Leahy / IFP, Inc.  → New Lenox, IL (2101 W Haven Avenue)
-- Cotizaciones, PMs y máquinas siguen ligados por id, así que no se tocan.
--
-- Solo cambia filas que todavía digan "Leahy": se puede ejecutar más de una vez.
-- Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

update public.clientes
   set nombre = 'Finlays Solutions, Inc.',
       empresa = 'Finlays Solutions, Inc.'
 where id in (87, 90)
   and (nombre ilike 'leahy%' or empresa ilike 'leahy%');

-- Comprobación: deben salir 2 filas con el nombre nuevo
select id, nombre, empresa, direccion, ciudad from public.clientes where id in (87, 90) order by id;
