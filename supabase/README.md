# Base de datos (Supabase)

## Migraciones (`migrations/`)

Aplicar en orden desde **Supabase → SQL Editor** (cada archivo es idempotente).

| Archivo | Qué hace | ¿Obligatoria? |
|---|---|---|
| `20261016_01_rpc_escrituras_atomicas.sql` | Funciones `crear_cotizacion`, `actualizar_cotizacion`, `eliminar_cotizacion` y `actualizar_cliente`: cada escritura de varios pasos ocurre en una sola transacción. | Recomendada. Sin ella, el backend usa el camino anterior (no atómico) y deja un aviso `[migración pendiente]` en el log. |

Los SQL antiguos (`historico/`: `migracion_*.sql`, `rls_food_safety_audit.sql`) ya están aplicados en producción; se conservan como historial.

## Pruebas (`tests/`)

Las funciones se prueban contra un Postgres embebido (PGlite), sin tocar la base real:

```bash
cd supabase/tests
npm install
npm test
```
