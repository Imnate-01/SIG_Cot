# Base de datos (Supabase)

## Migraciones (`migrations/`)

Aplicar en orden desde **Supabase → SQL Editor** (cada archivo es idempotente).

| Archivo | Qué hace | ¿Obligatoria? |
|---|---|---|
| `20261016_01_rpc_escrituras_atomicas.sql` | Funciones `crear_cotizacion`, `actualizar_cotizacion`, `eliminar_cotizacion` y `actualizar_cliente`: cada escritura de varios pasos ocurre en una sola transacción. | ✅ Aplicada en producción (16-oct-2026). Recomendada. Sin ella, el backend usa el camino anterior (no atómico) y deja un aviso `[migración pendiente]` en el log. |
| `20261016_02_rls_tablas_expuestas.sql` | Activa RLS en 13 tablas que el rol `anon` podía leer/escribir sin sesión (FSA, direcciones y máquinas de clientes, detalles de TSR, catálogos); la vista del listado TSR respeta permisos; `es_admin()` deja de ser ejecutable por `anon`. Para usuarios con sesión no cambia nada. | **Urgente** (seguridad). |

Los SQL antiguos (`historico/`: `migracion_*.sql`, `rls_food_safety_audit.sql`) ya están aplicados en producción; se conservan como historial.

## Pruebas (`tests/`)

Las funciones se prueban contra un Postgres embebido (PGlite), sin tocar la base real:

```bash
cd supabase/tests
npm install
npm test
```
