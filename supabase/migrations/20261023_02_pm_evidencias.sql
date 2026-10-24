-- =============================================================================
-- Módulo PM, fase 2: evidencias (archivos, fotos y cotizaciones ligadas)
-- =============================================================================
-- Requiere 20261023_01_modulo_pm.sql.
--
-- Cada tarea puede tener varias evidencias de dos tipos:
--   file   archivo o foto guardado en el bucket PRIVADO `pm-evidencias`
--          (Supabase Storage; el backend crea el bucket y entrega enlaces
--          temporales, nunca son públicos)
--   quote  una cotización de esta misma app (p. ej. PM-31)
--
-- Regla: una tarea con evidencia `required` no puede marcarse como completada
-- si no tiene al menos una evidencia. Se valida en el backend (mensaje claro)
-- y aquí como red de seguridad. Las tareas ya completadas antes de esta
-- migración no se tocan: la regla solo aplica al pasar de pendiente a completada.
--
-- Idempotente: se puede ejecutar más de una vez.
-- Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

create table if not exists public.pm_evidencias (
  id             uuid primary key default gen_random_uuid(),
  tarea_id       uuid not null references public.pm_tareas(id) on delete cascade,
  expediente_id  uuid not null references public.pm_expedientes(id) on delete cascade,
  tipo           text not null check (tipo in ('file', 'quote')),
  nombre         text not null,                       -- nombre original del archivo o número de cotización
  storage_path   text,                                -- ruta en el bucket (solo file)
  mime           text,
  tamano         bigint check (tamano is null or tamano >= 0),
  cotizacion_id  bigint references public.cotizaciones(id) on delete cascade,   -- si se borra la cotización, desaparece su vínculo
  subido_por     uuid,
  created_at     timestamptz not null default now(),
  check (
    (tipo = 'file'  and storage_path is not null and cotizacion_id is null) or
    (tipo = 'quote' and storage_path is null and cotizacion_id is not null)
  )
);
create index if not exists pm_evidencias_tarea_idx on public.pm_evidencias(tarea_id, created_at);
create index if not exists pm_evidencias_expediente_idx on public.pm_evidencias(expediente_id);
-- Una misma cotización no se liga dos veces a la misma tarea
create unique index if not exists pm_evidencias_cotizacion_uq
  on public.pm_evidencias(tarea_id, cotizacion_id) where cotizacion_id is not null;

alter table public.pm_evidencias enable row level security;
drop policy if exists pm_evidencias_autenticados on public.pm_evidencias;
create policy pm_evidencias_autenticados on public.pm_evidencias
  for all to authenticated using (true) with check (true);
revoke all on public.pm_evidencias from anon;

-- La evidencia debe pertenecer al mismo PM que su tarea
create or replace function public.pm_evidencia_coherente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.pm_tareas t where t.id = new.tarea_id and t.expediente_id = new.expediente_id) then
    raise exception 'La tarea no pertenece a ese PM' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists pm_evidencia_coherente_trg on public.pm_evidencias;
create trigger pm_evidencia_coherente_trg
  before insert or update of tarea_id, expediente_id on public.pm_evidencias
  for each row execute function public.pm_evidencia_coherente();

-- Tarea con evidencia obligatoria: no se completa sin evidencia
create or replace function public.pm_exigir_evidencia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.completada and not old.completada and new.evidencia = 'required'
     and not exists (select 1 from public.pm_evidencias e where e.tarea_id = new.id) then
    raise exception 'Esta tarea requiere al menos una evidencia antes de completarse' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists pm_exigir_evidencia_trg on public.pm_tareas;
create trigger pm_exigir_evidencia_trg
  before update of completada on public.pm_tareas
  for each row execute function public.pm_exigir_evidencia();

notify pgrst, 'reload schema';
