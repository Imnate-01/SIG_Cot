-- =============================================================================
-- Módulo PM: acciones de seguimiento asignables (comentario 3 de la revisión)
-- =============================================================================
-- Requiere 20261023_01_modulo_pm.sql.
--
-- Las "Open notes" de un PM eran solo texto. Ahora, además del texto, cada PM
-- tiene una lista de acciones de seguimiento: cada una con descripción,
-- responsable (opcional), fecha compromiso (opcional) y si ya se hizo.
-- El texto libre de notas_abiertas se conserva tal cual.
--
-- Mismo acceso que el resto del módulo: cualquier usuario con sesión (el backend
-- además exige el área "mantenimiento").
--
-- Escrita con instrucciones explícitas (sin bloques dinámicos) para que el
-- editor SQL de Supabase reconozca que se activa RLS.
-- Idempotente. Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

create table if not exists public.pm_acciones (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid not null references public.pm_expedientes(id) on delete cascade,
  texto          text not null check (char_length(btrim(texto)) between 1 and 1000),
  asignado_a     uuid,                       -- usuario responsable (opcional)
  fecha_limite   date,                       -- fecha compromiso (opcional)
  completada     boolean not null default false,
  completada_por uuid,
  completada_en  timestamptz,
  creado_por     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (completada or (completada_por is null and completada_en is null))
);
create index if not exists pm_acciones_expediente_idx on public.pm_acciones(expediente_id, created_at);
create index if not exists pm_acciones_pendientes_idx on public.pm_acciones(asignado_a, fecha_limite) where not completada;

alter table public.pm_acciones enable row level security;
drop policy if exists pm_acciones_autenticados on public.pm_acciones;
create policy pm_acciones_autenticados on public.pm_acciones
  for all to authenticated using (true) with check (true);
revoke all on public.pm_acciones from anon;
grant select, insert, update, delete on public.pm_acciones to authenticated;

notify pgrst, 'reload schema';
