# SIG Cotizaciones

Sistema interno de cotizaciones de servicio técnico (MX / US / CA), reportes
técnicos (TSR) y reportes Food Safety Audit (FSA).

| Carpeta | Qué contiene |
|---|---|
| `frontend/` | Next.js 16 (App Router, next-intl, @react-pdf) |
| `backend/` | API Express 5 + Supabase (PostgreSQL, Auth, Storage) + Gemini + Puppeteer (PDF FSA) |
| `supabase/` | Migraciones SQL, pruebas de las funciones y diagnóstico de RLS |
| `docs/` | Checklist de pruebas manuales |
| `_privado/` | Datos de clientes y archivos de trabajo — **ignorado por git** |

## Ejecutar en local

Requisitos: Node.js 20+ y un proyecto de Supabase.

```bash
# Backend (http://localhost:3001)
cd backend
cp .env.example .env      # llena SUPABASE_*, GEMINI_API_KEY, etc.
npm install
npm run dev

# Frontend (http://localhost:3000) — en otra terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Todas las variables están documentadas en `backend/.env.example` y `frontend/.env.example`.

## Base de datos

Aplica las migraciones de `supabase/migrations/` en el SQL Editor de Supabase
(ver `supabase/README.md`). `supabase/diagnostico_rls.sql` muestra las políticas
RLS actuales y qué tablas no las tienen.

## Pruebas

```bash
cd frontend && npm test          # precios (equivalencia con el cálculo anterior), firmantes, validación
cd supabase/tests && npm install && npm test   # funciones SQL en Postgres embebido
```

Después de cada cambio importante, recorre `docs/CHECKLIST_PRUEBAS.md`.

## Arquitectura (resumen)

**Backend** (`backend/src`)
- `server.ts` — CORS, `requireAuth` en todas las rutas salvo `/auth` y `/health`, manejador de errores.
- `middlewares/` — `requireAuth` (valida el token con Supabase), `requireRole` (roles por variable de entorno).
- `controllers/` → `repositories/` (escrituras atómicas vía funciones SQL) → Supabase con la identidad del usuario (RLS).
- `domain/pricing.ts` — reglas de precio (copia idéntica de `frontend/src/features/cotizaciones/pricing.ts`).
- `services/verificacionPrecios.ts` — el servidor recalcula totales (`PRICING_ENFORCE`).
- `utils/http.ts` — errores de base de datos → códigos HTTP.

**Frontend** (`frontend/src`)
- `features/cotizaciones/` — precios, tipos, firmantes, API de catálogos, PDFs y vista previa.
- `features/reportes-tecnicos/` — utilidades y firma digital del TSR.
- `services/api.ts` — axios con token y renovación automática de sesión.
