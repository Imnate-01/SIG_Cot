-- =============================================================================
-- Service Operations Workspace: acceso por área (mínimo privilegio)
-- =============================================================================
-- Antes el menú decidía qué ver adivinando por palabras dentro de `usuarios.rol`
-- ("aseptic", "intern", …) y el backend no restringía casi nada por área.
-- Ahora cada usuario tiene áreas asignadas explícitamente y el backend las
-- valida en cada petición:
--
--   usuarios.es_admin_sistema  → administrador del sistema: ve todas las áreas,
--                                administra usuarios, roles y solicitudes.
--   usuario_areas              → áreas de trabajo de cada usuario
--                                (cotizaciones, mantenimiento, food_safety).
--   solicitudes_acceso         → un usuario pide un área; un administrador
--                                la aprueba o la rechaza.
--   bitacora_accesos           → registro de inicios de sesión, cambios de
--                                perfil, de áreas y de solicitudes.
--
-- "Administración" no se guarda como área: todos tienen su parte personal
-- (perfil, solicitudes, actividad); la gestión de usuarios es solo para
-- es_admin_sistema.
--
-- Las escrituras las hace únicamente el backend con la clave de servicio.
-- Un usuario con sesión solo puede LEER sus propias filas.
--
-- Escrita con instrucciones explícitas (sin bloques dinámicos) para que el
-- editor SQL de Supabase reconozca que se activa RLS.
-- Idempotente. Cómo aplicarla: Supabase → SQL Editor → pegar y ejecutar.
-- =============================================================================

-- 1. Administradores del sistema ---------------------------------------------
alter table public.usuarios
  add column if not exists es_admin_sistema boolean not null default false;

-- 2. Áreas por usuario ---------------------------------------------------------
create table if not exists public.usuario_areas (
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  area         text not null check (area in ('cotizaciones', 'mantenimiento', 'food_safety')),
  asignada_en  timestamptz not null default now(),
  asignada_por uuid references public.usuarios(id) on delete set null,
  primary key (usuario_id, area)
);

alter table public.usuario_areas enable row level security;
revoke all on public.usuario_areas from anon, authenticated;
grant select on public.usuario_areas to authenticated;
drop policy if exists usuario_areas_leer_propias on public.usuario_areas;
create policy usuario_areas_leer_propias on public.usuario_areas
  for select to authenticated using (usuario_id = auth.uid());

-- 3. Solicitudes de acceso -----------------------------------------------------
create table if not exists public.solicitudes_acceso (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references public.usuarios(id) on delete cascade,
  area           text not null check (area in ('cotizaciones', 'mantenimiento', 'food_safety')),
  motivo         text check (motivo is null or char_length(motivo) <= 500),
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  creada_en      timestamptz not null default now(),
  resuelta_en    timestamptz,
  resuelta_por   uuid references public.usuarios(id) on delete set null,
  nota           text check (nota is null or char_length(nota) <= 500)
);

-- Solo una solicitud pendiente por usuario y área
create unique index if not exists solicitudes_acceso_una_pendiente
  on public.solicitudes_acceso (usuario_id, area) where estado = 'pendiente';
create index if not exists solicitudes_acceso_por_estado
  on public.solicitudes_acceso (estado, creada_en desc);

alter table public.solicitudes_acceso enable row level security;
revoke all on public.solicitudes_acceso from anon, authenticated;
grant select on public.solicitudes_acceso to authenticated;
drop policy if exists solicitudes_acceso_leer_propias on public.solicitudes_acceso;
create policy solicitudes_acceso_leer_propias on public.solicitudes_acceso
  for select to authenticated using (usuario_id = auth.uid());

-- 4. Bitácora --------------------------------------------------------------------
create table if not exists public.bitacora_accesos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,  -- a quién se refiere
  actor_id    uuid references public.usuarios(id) on delete set null,          -- quién lo hizo
  accion      text not null check (char_length(accion) between 1 and 60),
  detalle     jsonb not null default '{}'::jsonb,
  creada_en   timestamptz not null default now()
);
create index if not exists bitacora_accesos_por_usuario
  on public.bitacora_accesos (usuario_id, creada_en desc);

alter table public.bitacora_accesos enable row level security;
revoke all on public.bitacora_accesos from anon, authenticated;
grant select on public.bitacora_accesos to authenticated;
drop policy if exists bitacora_accesos_leer_propia on public.bitacora_accesos;
create policy bitacora_accesos_leer_propia on public.bitacora_accesos
  for select to authenticated using (usuario_id = auth.uid());

-- 5. Datos iniciales (por correo, nunca por id) -----------------------------------
-- Únicos administradores del sistema
update public.usuarios set es_admin_sistema = true
 where lower(email) in ('luis.martinezalvarado@sig.biz', 'eduardo.molina@sig.biz');

-- Áreas de partida: solo se cargan si la tabla está vacía, para que volver a
-- ejecutar la migración no reponga un área que un administrador ya quitó.
insert into public.usuario_areas (usuario_id, area)
select u.id, a.area
  from public.usuarios u
  join (values
    ('geovanni.zayas@sig.biz',            'cotizaciones'),
    ('julio.anteliz@sig.biz',             'cotizaciones'),
    ('julio.anteliz@sig.biz',             'mantenimiento'),
    ('arthur.alves@sig.biz',              'cotizaciones'),
    ('john.santoyo@sig.biz',              'cotizaciones'),
    ('sabina.garciadelaluz@sig.biz',      'mantenimiento'),
    ('sabina.garciadelaluz@sig.biz',      'food_safety'),
    ('abraham.cabrerahidalgo@sig.biz',    'mantenimiento'),
    ('abraham.cabrerahidalgo@sig.biz',    'food_safety'),
    ('karina.alvarado@sig.biz',           'mantenimiento'),
    ('karina.alvarado@sig.biz',           'food_safety')
  ) as a(email, area) on lower(u.email) = a.email
 where not exists (select 1 from public.usuario_areas)
on conflict do nothing;

notify pgrst, 'reload schema';
