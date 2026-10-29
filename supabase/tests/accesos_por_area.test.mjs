// Prueba de la migración 20261029_01 (acceso por área) contra PGlite.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const db = new PGlite();
const q = (s, p) => db.query(s, p);
let ok = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { ok++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x); } };
const expectError = async (n, fn) => { try { await fn(); check(n, false, '(no lanzó error)'); } catch { check(n, true); } };

// Entorno mínimo de Supabase: roles, auth.uid() y la tabla usuarios como en producción
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create table public.usuarios (id uuid primary key, nombre text, email text, rol text, departamento text, activo boolean, created_at timestamptz default now());
  alter table public.usuarios enable row level security;
`);
const ids = {
  luis: '00000000-0000-0000-0000-000000000001',
  eduardo: '00000000-0000-0000-0000-000000000002',
  geovanni: '00000000-0000-0000-0000-000000000003',
  julio: '00000000-0000-0000-0000-000000000004',
  karina: '00000000-0000-0000-0000-000000000005',
  otro: '00000000-0000-0000-0000-000000000006',
};
await q(`insert into usuarios (id, nombre, email) values
  ($1, 'Luis David Martinez Alvarado', 'luis.martinezalvarado@sig.biz'),
  ($2, 'Javier Eduardo Molina Valdez', 'Eduardo.Molina@sig.biz'),
  ($3, 'Geovanni Zayas', 'geovanni.zayas@sig.biz'),
  ($4, 'Julio Anteliz Tello', 'julio.anteliz@sig.biz'),
  ($5, 'Karina Alvarado', 'karina.alvarado@sig.biz'),
  ($6, 'Sin áreas', 'nuevo@sig.biz')`, Object.values(ids));

const sql = readFileSync(new URL('../migrations/20261029_01_accesos_por_area.sql', import.meta.url), 'utf8');
await db.exec(sql);
console.log('Migración aplicada ✓');

const areas = async (id) => (await q(`select area from usuario_areas where usuario_id = $1 order by area`, [id])).rows.map((r) => r.area);
const admins = (await q(`select email from usuarios where es_admin_sistema order by email`)).rows.map((r) => r.email.toLowerCase());
check('solo Luis David y Eduardo son administradores', JSON.stringify(admins) === JSON.stringify(['eduardo.molina@sig.biz', 'luis.martinezalvarado@sig.biz']), JSON.stringify(admins));
check('Geovanni: solo cotizaciones', JSON.stringify(await areas(ids.geovanni)) === '["cotizaciones"]');
check('Julio: cotizaciones y mantenimiento', JSON.stringify(await areas(ids.julio)) === '["cotizaciones","mantenimiento"]');
check('Karina: food_safety y mantenimiento', JSON.stringify(await areas(ids.karina)) === '["food_safety","mantenimiento"]');
check('usuario no listado: sin áreas', (await areas(ids.otro)).length === 0);

// Un administrador quita un área y la migración se vuelve a ejecutar: no la repone
await q(`delete from usuario_areas where usuario_id = $1 and area = 'mantenimiento'`, [ids.julio]);
await db.exec(sql);
check('re-ejecutar es idempotente y no repone áreas quitadas', JSON.stringify(await areas(ids.julio)) === '["cotizaciones"]');

await expectError('área desconocida → error', () => q(`insert into usuario_areas (usuario_id, area) values ($1, 'ventas')`, [ids.otro]));
await q(`insert into solicitudes_acceso (usuario_id, area) values ($1, 'mantenimiento')`, [ids.geovanni]);
await expectError('segunda solicitud pendiente de la misma área → error', () => q(`insert into solicitudes_acceso (usuario_id, area) values ($1, 'mantenimiento')`, [ids.geovanni]));
await q(`update solicitudes_acceso set estado = 'rechazada' where usuario_id = $1`, [ids.geovanni]);
await q(`insert into solicitudes_acceso (usuario_id, area) values ($1, 'mantenimiento')`, [ids.geovanni]);
check('tras resolverla se puede volver a pedir', (await q(`select count(*)::int n from solicitudes_acceso where usuario_id = $1`, [ids.geovanni])).rows[0].n === 2);
await expectError('motivo de más de 500 caracteres → error', () => q(`insert into solicitudes_acceso (usuario_id, area, motivo) values ($1, 'food_safety', $2)`, [ids.otro, 'x'.repeat(501)]));
await q(`insert into bitacora_accesos (usuario_id, actor_id, accion) values ($1, $1, 'inicio_sesion'), ($2, $2, 'inicio_sesion')`, [ids.geovanni, ids.julio]);

// RLS: un usuario con sesión solo lee lo suyo y no puede escribir
for (const t of ['usuario_areas', 'solicitudes_acceso', 'bitacora_accesos']) {
  check(`${t}: RLS activa`, (await q(`select relrowsecurity r from pg_class where relname = $1`, [t])).rows[0].r === true);
  check(`${t}: anon sin permisos`, (await q(`select count(*)::int n from information_schema.role_table_grants where grantee = 'anon' and table_name = $1`, [t])).rows[0].n === 0);
}
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.geovanni}';`);
check('Geovanni solo ve sus áreas', JSON.stringify((await q(`select area from usuario_areas`)).rows.map((r) => r.area)) === '["cotizaciones"]');
check('Geovanni solo ve sus solicitudes', (await q(`select count(*)::int n from solicitudes_acceso where usuario_id <> auth.uid()`)).rows[0].n === 0);
check('Geovanni solo ve su bitácora', (await q(`select count(*)::int n from bitacora_accesos`)).rows[0].n === 1);
await expectError('un usuario no puede asignarse áreas', () => q(`insert into usuario_areas (usuario_id, area) values (auth.uid(), 'mantenimiento')`));
await expectError('un usuario no puede aprobar su solicitud', () => q(`update solicitudes_acceso set estado = 'aprobada'`));
await db.exec(`reset role;`);

console.log(`\n${ok} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
