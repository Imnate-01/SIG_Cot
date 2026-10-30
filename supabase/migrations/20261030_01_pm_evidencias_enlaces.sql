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

-- Las restricciones de la migración original no tienen nombre propio; Postgres
-- las nombró pm_evidencias_tipo_check y pm_evidencias_check.
alter table public.pm_evidencias drop constraint if exists pm_evidencias_tipo_check;
alter table public.pm_evidencias drop constraint if exists pm_evidencias_check;
alter table public.pm_evidencias drop constraint if exists pm_evidencias_tipo_valido;
alter table public.pm_evidencias drop constraint if exists pm_evidencias_campos_por_tipo;

alter table public.pm_evidencias
  add constraint pm_evidencias_tipo_valido check (tipo in ('file', 'link', 'quote'));

alter table public.pm_evidencias
  add constraint pm_evidencias_campos_por_tipo check (
    (tipo = 'file'  and storage_path is not null and cotizacion_id is null and url is null) or
    (tipo = 'link'  and storage_path is null and cotizacion_id is null
                    and url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2000) or
    (tipo = 'quote' and storage_path is null and cotizacion_id is not null and url is null)
  );

-- El mismo enlace no se agrega dos veces a la misma tarea
create unique index if not exists pm_evidencias_url_uq
  on public.pm_evidencias(tarea_id, url) where url is not null;

notify pgrst, 'reload schema';
