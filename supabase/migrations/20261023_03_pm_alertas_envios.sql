-- =============================================================================
-- Módulo PM, fase 4: registro de los resúmenes diarios de alertas por correo
-- =============================================================================
-- Una fila por usuario y día en que se le envió el resumen. Sirve para que el
-- proceso diario no mande dos veces el mismo correo si se ejecuta de nuevo
-- (reintento, ejecución manual, etc.).
--
-- Solo el backend la usa, con la clave de servicio: RLS activo y SIN políticas,
-- así que nadie más (ni usuarios con sesión ni anónimos) puede leerla o escribirla.
--
-- Escrita con instrucciones explícitas (sin bloques dinámicos) para que el
-- editor SQL de Supabase reconozca que se activa RLS.
-- Idempotente. Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

create table if not exists public.pm_alertas_envios (
  usuario_id  uuid not null,
  fecha       date not null,                 -- día (hora de México) del resumen
  alertas     integer not null default 0 check (alertas >= 0),
  vencidas    integer not null default 0 check (vencidas >= 0),
  enviado_en  timestamptz not null default now(),
  primary key (usuario_id, fecha)
);

alter table public.pm_alertas_envios enable row level security;
revoke all on public.pm_alertas_envios from anon, authenticated;

notify pgrst, 'reload schema';
