-- =============================================================================
-- Diagnóstico de seguridad (solo lectura) — ejecutar en Supabase → SQL Editor
-- =============================================================================
-- Las políticas RLS de las tablas principales no están versionadas en el
-- repositorio. Este script muestra qué hay hoy en la base de datos para
-- poder revisarlas y guardarlas como migración.

-- 1) Tablas del esquema public SIN RLS activado (cualquiera con la anon key
--    podría leerlas/escribirlas directamente vía la API de Supabase)
select c.relname as tabla
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by 1;

-- 2) Políticas existentes por tabla
select tablename as tabla, policyname as politica, cmd as operacion,
       roles, qual as condicion_using, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3) Buckets de Storage y si son públicos
select id, name, public from storage.buckets order by name;
