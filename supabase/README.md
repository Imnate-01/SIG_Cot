# Base de datos (Supabase)

## Migraciones (`migrations/`)

Aplicar en orden desde **Supabase → SQL Editor** (cada archivo es idempotente).

| Archivo | Qué hace | ¿Obligatoria? |
|---|---|---|
| `20261016_01_rpc_escrituras_atomicas.sql` | Funciones `crear_cotizacion`, `actualizar_cotizacion`, `eliminar_cotizacion` y `actualizar_cliente`: cada escritura de varios pasos ocurre en una sola transacción. | ✅ Aplicada en producción (16-oct-2026). Recomendada. Sin ella, el backend usa el camino anterior (no atómico) y deja un aviso `[migración pendiente]` en el log. |
| `20261016_02_rls_tablas_expuestas.sql` | Activa RLS en 13 tablas que el rol `anon` podía leer/escribir sin sesión (FSA, direcciones y máquinas de clientes, detalles de TSR, catálogos); la vista del listado TSR respeta permisos; `es_admin()` deja de ser ejecutable por `anon`. Para usuarios con sesión no cambia nada. | **Urgente** (seguridad). |
| `20261023_01_modulo_pm.sql` | Módulo PM Tracker: tablas `pm_plantilla_tareas` (las 31 tareas), `pm_expedientes`, `pm_tareas`, `pm_tarea_colaboradores`, `pm_tarea_historial`, con RLS, y las funciones `pm_crear_expediente` y `pm_cambiar_fecha_inicio`. Prueba: `cd supabase/tests && npm install && node pm.test.mjs`. | **Requerida** para que /pm funcione (aplicar ANTES de desplegar el backend). Idempotente. |
| `20261023_02_pm_evidencias.sql` | PM Tracker fase 2: tabla `pm_evidencias` (archivos/fotos y cotizaciones ligadas a una tarea), RLS, y regla que impide completar una tarea con evidencia obligatoria sin evidencia. El bucket privado `pm-evidencias` lo crea el backend la primera vez (usa `SUPABASE_SERVICE_ROLE_KEY`). Prueba: `node pm_evidencias.test.mjs`. | **Requerida** para las evidencias. Sin ella el detalle del PM sigue funcionando, sin evidencias. |

Los SQL antiguos (`historico/`: `migracion_*.sql`, `rls_food_safety_audit.sql`) ya están aplicados en producción; se conservan como historial.

## Pruebas (`tests/`)

Las funciones se prueban contra un Postgres embebido (PGlite), sin tocar la base real:

```bash
cd supabase/tests
npm install
npm test
```

## Correos de Auth (registro y recuperación de contraseña)
El servidor de correo **por defecto** de Supabase solo envía a los miembros del equipo
del proyecto y tiene un límite muy bajo por hora. Para que lleguen los correos de
confirmación y de "¿Olvidaste tu contraseña?" a cualquier `@sig.biz`:

1. Authentication → Emails → **SMTP Settings**: configurar un SMTP propio (p. ej. el de SIG o SendGrid).
2. Authentication → URL Configuration → **Redirect URLs**: agregar
   `https://<dominio-del-frontend>/restablecer` y `https://<dominio-del-frontend>/verificado`.
3. Mientras tanto, un administrador puede crear cuentas y restablecer contraseñas desde
   el panel **Usuarios** (backend: variable `ROLES_ADMIN_USUARIOS`).
