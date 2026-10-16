import { PGlite } from '@electric-sql/pglite'; import { readFileSync } from 'node:fs';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as 'select null::uuid';
 create table usuarios(id uuid, rol text); create table clientes(id int, nombre text); create table reportes_tecnicos(id int, usuario_id uuid, cliente_id int, folio text, estado text, planta text, fecha_inicio date, fecha_fin date, created_at timestamptz);
 create view vw_reportes_tecnicos_listado as select rt.id, c.nombre from reportes_tecnicos rt left join clientes c on c.id=rt.cliente_id;
 create function es_admin() returns boolean language plpgsql stable security definer as $f$ begin return (select rol from public.usuarios where id = auth.uid()) = 'admin'; end $f$;`);
for (const t of ['food_safety_audit_reports','audit_cop_findings','audit_evidence_images','audit_section_params','audit_cip_flows','cliente_direcciones','cliente_maquinas','reporte_detalles','reporte_acciones','reporte_participantes','reporte_comentarios_seccion','catalogo_items','catalogo_secciones'])
  await db.exec(`create table ${t}(id int); grant all on ${t} to anon, authenticated; insert into ${t} values (1);`);
const sql = readFileSync(new URL("../migrations/20261016_02_rls_tablas_expuestas.sql", import.meta.url), "utf8");
await db.exec(sql); await db.exec(sql);
const r = await db.query(`select count(*) filter (where relrowsecurity)::int con_rls, count(*)::int total from pg_class where relkind='r' and relnamespace='public'::regnamespace and relname not in ('usuarios','clientes','reportes_tecnicos')`);
const p = await db.query(`select count(*)::int n from pg_policies where policyname like '%_autenticados'`);
const v = await db.query(`select reloptions from pg_class where relname='vw_reportes_tecnicos_listado'`);
const f = await db.query(`select has_function_privilege('anon','es_admin()','execute') anon, has_function_privilege('authenticated','es_admin()','execute') auth, proconfig from pg_proc where proname='es_admin'`);
await db.exec(`set role anon`); const a = await db.query(`select count(*)::int n from food_safety_audit_reports`); await db.exec(`reset role`);
await db.exec(`set role authenticated`); const b = await db.query(`select count(*)::int n from food_safety_audit_reports`); await db.exec(`reset role`);
console.log({ ...r.rows[0], politicas: p.rows[0].n, vista: v.rows[0].reloptions, es_admin: f.rows[0], filas_vistas_por_anon: a.rows[0].n, filas_vistas_por_authenticated: b.rows[0].n });
