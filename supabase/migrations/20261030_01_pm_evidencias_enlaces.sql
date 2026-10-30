-- =============================================================================
-- Módulo PM: evidencia por enlace (hipervínculo externo)
-- =============================================================================
-- Requiere 20261023_02_pm_evidencias.sql.
--
-- Antes, además de archivos, una tarea solo podía ligar una cotización de esta
-- misma app. Ahora se puede adjuntar cualquier enlace (SharePoint, OneDrive,
-- Google Drive, Teams, el portal del cliente…) como evidencia externa:
--
--   file   archivo o foto en el bucket privado `pm-evidencias`
--   link   enlace http(s) externo, guardado en `url`            ← nuevo
--   quote  cotización ligada; ya no se crean nuevas, las existentes se conservan
--
-- Una evidencia `link` cuenta igual que un archivo para las tareas con evidencia
-- obligatoria (la regla de pm_exigir_evidencia no cambia: basta con que exista).
--
-- Idempotente. Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

alter table public.pm_evidencias add column if not exists url text;

-- Quita las restricciones CHECK anteriores de la tabla (las de la migración
-- original no tienen nombre propio; normalmente son pm_evidencias_tipo_check y
-- pm_evidencias_check, pero se buscan por tabla para no depender del nombre).
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.pm_evidencias'::regclass and contype = 'c'
  loop
    execute format('alter table public.pm_evidencias drop constraint %I', r.conname);
  end loop;
end $$;

-- El loop también quitó la del tamaño: se vuelve a crear igual que antes.
alter table public.pm_evidencias
  add constraint pm_evidencias_tamano_valido check (tamano is null or tamano >= 0);

alter table public.pm_evidencias
  add constraint pm_evidencias_tipo_valido check (tipo in ('file', 'link', 'quote'));

alter table public.pm_evidencias
  add constraint pm_evidencias_campos_por_tipo check (
    (tipo = 'file'  and storage_path is not null and cotizacion_id is null and url is null) or
    (tipo = 'link'  and storage_path is null and cotizacion_id is null
                    and url is not null and url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2000) or
    (tipo = 'quote' and storage_path is null and cotizacion_id is not null and url is null)
  );

-- El mismo enlace no se agrega dos veces a la misma tarea
create unique index if not exists pm_evidencias_url_uq
  on public.pm_evidencias(tarea_id, url) where url is not null;

notify pgrst, 'reload schema';

-- Comprobación: deben salir pm_evidencias_campos_por_tipo, pm_evidencias_tamano_valido y pm_evidencias_tipo_valido
select conname from pg_constraint where conrelid = 'public.pm_evidencias'::regclass and contype = 'c' order by conname;
