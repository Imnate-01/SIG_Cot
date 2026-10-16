-- =============================================================================
-- Cerrar tablas expuestas al rol anónimo
-- =============================================================================
-- Hallazgo (asesor de seguridad de Supabase, 16-oct-2026): 13 tablas tenían
-- RLS desactivado y el rol `anon` con SELECT/INSERT/UPDATE/DELETE. La clave
-- anon es pública (va en el frontend como NEXT_PUBLIC_SUPABASE_ANON_KEY), así
-- que cualquiera podía leer, modificar o borrar estas tablas directamente con
-- la API REST de Supabase, sin iniciar sesión:
--   reportes Food Safety Audit (con hallazgos e imágenes), direcciones y
--   máquinas de clientes, detalles/acciones de reportes técnicos y catálogos.
--
-- Esta migración NO cambia lo que ven los usuarios de la app: todos usan
-- sesión (rol `authenticated`), y para ellos el acceso queda igual que hoy.
-- Solo se bloquea el acceso anónimo. Restringir por dueño/rol (p. ej. que
-- cada auditor vea solo sus FSA) es una decisión de negocio aparte.
--
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

do $$
declare
  t text;
  tablas text[] := array[
    'food_safety_audit_reports', 'audit_cop_findings', 'audit_evidence_images',
    'audit_section_params', 'audit_cip_flows',
    'cliente_direcciones', 'cliente_maquinas',
    'reporte_detalles', 'reporte_acciones', 'reporte_participantes', 'reporte_comentarios_seccion',
    'catalogo_items', 'catalogo_secciones'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabla public.% no existe, se omite', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_autenticados', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_autenticados', t
    );
  end loop;
end $$;

-- La vista del listado de reportes técnicos corría con los permisos de su
-- creador (salta RLS) y era legible por `anon`. Con security_invoker respeta
-- los permisos de quien consulta: para usuarios con sesión el resultado es el
-- mismo (las tablas base permiten SELECT a authenticated).
alter view public.vw_reportes_tecnicos_listado set (security_invoker = true);

-- es_admin() se usa en políticas de cotizaciones (solo para authenticated).
-- Se fija search_path y se quita la ejecución anónima vía /rest/v1/rpc/es_admin.
alter function public.es_admin() set search_path = public;
revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

notify pgrst, 'reload schema';
