# Plan de Implementación — Food Safety Audit Report
> Módulo para auditoría de inocuidad alimentaria en llenadora aséptica CFA-312-3X  
> Migración y rediseño completo desde el módulo de Reportes Técnicos (PMs)

---

## Índice

1. [Visión general](#1-visión-general)
2. [Fase 1 — Limpieza y renombrado del módulo](#2-fase-1--limpieza-y-renombrado-del-módulo)
3. [Fase 2 — Modelo de datos](#3-fase-2--modelo-de-datos)
4. [Fase 3 — Portada del reporte (Paso 0 del wizard)](#4-fase-3--portada-del-reporte-paso-0-del-wizard)
5. [Fase 4 — Secciones del formulario de reporte](#5-fase-4--secciones-del-formulario-de-reporte)
6. [Fase 5 — Manejo de evidencias fotográficas](#6-fase-5--manejo-de-evidencias-fotográficas)
7. [Fase 6 — Generación del reporte PDF final](#7-fase-6--generación-del-reporte-pdf-final)
8. [Fase 7 — Listado, roles y flujo de aprobación](#8-fase-7--listado-roles-y-flujo-de-aprobación)
9. [Equipo de auditores](#9-equipo-de-auditores)
10. [Criterios de aceptación globales](#10-criterios-de-aceptación-globales)

---

## 1. Visión general

### ¿Qué se construye?

Un módulo web para que los auditores de SIG documenten sus hallazgos durante una auditoría de Food Safety en una llenadora aséptica. El reporte cubre:

- Inspección visual de limpieza por secciones (**COP**)
- Verificación de parámetros técnicos con rangos de alarma (**HH / HS / SP / L / LL**)
- Evidencias fotográficas con calidad suficiente para el reporte PDF final
- Flujo borrador → revisión → finalizado con firma del auditor responsable

### Stack tecnológico asumido (basado en el código existente)

| Capa | Tecnología |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Internacionalización | `next-intl` |
| Autenticación / API | Servicio interno vía `api` (Axios wrapper) |
| PDF | A definir — recomendación: **React-PDF** o **Puppeteer** headless |
| Almacenamiento de imágenes | A definir — recomendación: **S3 / Cloudflare R2** |

### Rutas del nuevo módulo

```
/food-safety-audit                    → Listado de reportes
/food-safety-audit/nuevo              → Crear reporte (portada + wizard 7 secciones)
/food-safety-audit/[id]               → Ver / editar reporte existente
/food-safety-audit/[id]/pdf           → Vista previa y descarga del PDF
```

### Estructura del wizard (pasos)

```
[Paso 0: Portada]  →  [Paso 1: COP]  →  [Paso 2: Dedusting / Sterile Air]
→  [Paso 3: H₂O₂]  →  [Paso 4: Preheating & SST]  →  [Paso 5: CIP]
→  [Paso 6: Misceláneos & Resumen]
```

> **El Paso 0 (Portada) es obligatorio y bloqueante**: el usuario no puede avanzar
> al resto del wizard sin completar todos los campos requeridos de la portada.

---

## 2. Fase 1 — Limpieza y renombrado del módulo

**Duración estimada:** 2–3 días  
**Responsable:** Frontend lead

### 2.1 Eliminar rutas y componentes del módulo anterior

- [ ] Archivar (no borrar aún) el directorio `app/reportestec/`
- [ ] Crear directorio `app/food-safety-audit/` con la nueva estructura de páginas
- [ ] Crear página de redirección temporal `app/reportestec/page.tsx` → `redirect('/food-safety-audit')`

### 2.2 Actualizar traducciones i18n

Archivo `messages/es.json` (y sus equivalentes por locale):

```json
{
  "FoodSafetyAudit": {
    "title": "Food Safety Audit",
    "subtitle": "Reportes de auditoría de inocuidad alimentaria",
    "newReport": "Nuevo reporte",
    "searchPlaceholder": "Buscar por folio, empresa o llenadora...",
    "filters": "Filtros",
    "loading": "Cargando reportes...",
    "noResults": "Sin resultados",
    "noResultsDesc": "No se encontraron reportes con ese criterio.",
    "colFolio": "Folio",
    "colLlenadora": "Llenadora",
    "colClient": "Empresa / Planta",
    "colDate": "Fecha auditoría",
    "colAuditor": "Auditor",
    "colStatus": "Estado",
    "colActions": "Acciones",
    "statusDraft": "Borrador",
    "statusInReview": "En revisión",
    "statusCompleted": "Finalizado",
    "showingOf": "{count} reportes",
    "viewDetails": "Ver detalle"
  }
}
```

### 2.3 Actualizar navegación

- [ ] Cambiar ítem de menú lateral: `"Reportes Técnicos"` → `"Food Safety Audit"`
- [ ] Ícono sugerido: `shield-check` o `clipboard-check` (Lucide / Tabler)
- [ ] Actualizar breadcrumbs en todas las páginas del módulo

### 2.4 Actualizar el servicio API base

```typescript
// services/foodSafetyAudit.ts
const BASE = '/food-safety-audit';

export const foodSafetyAuditApi = {
  list:    () => api.get(`${BASE}/listado`),
  get:     (id: number) => api.get(`${BASE}/${id}`),
  create:  (data: CreateAuditDto) => api.post(`${BASE}`, data),
  update:  (id: number, data: UpdateAuditDto) => api.put(`${BASE}/${id}`, data),
  submit:  (id: number) => api.post(`${BASE}/${id}/submit`),
  approve: (id: number) => api.post(`${BASE}/${id}/approve`),
  pdf:     (id: number) => api.get(`${BASE}/${id}/pdf`, { responseType: 'blob' }),
};
```

---

## 3. Fase 2 — Modelo de datos

**Duración estimada:** 3–4 días  
**Responsable:** Backend

### 3.1 Tabla principal: `food_safety_audit_reports`

```sql
CREATE TABLE food_safety_audit_reports (
  id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
  folio                   VARCHAR(30)  NOT NULL UNIQUE,  -- Auto: FSA-2024-0001

  -- ── Datos de la portada ──────────────────────────────────────────────────
  cliente_empresa         VARCHAR(200) NOT NULL,         -- "Alpura, Cuautitlán"
  fecha_auditoria         DATE         NOT NULL,         -- "Noviembre, 2025"
  location_of_audit       VARCHAR(300),                  -- "Cuautitlán Izcalli, Estado de México"
  llenadora               VARCHAR(100) NOT NULL,         -- Filling machine type: "CFA 1824-37"
  llenadora_serial        VARCHAR(100),                  -- Serial number: "874251005"
  llenadora_horas_op      DECIMAL(10,2),                 -- Operating hours (puede ser NULL si "-")

  -- Personas a cargo de la auditoría (array JSON de objetos)
  -- Estructura: [{ nombre, puesto, empresa }]
  -- Ej: [{"nombre":"Abraham Cabrera","puesto":"Quality Specialist","empresa":"SIG Combibloc México"}]
  personas_a_cargo        JSON,

  -- Autorización SIG Combibloc
  autorizacion_sig_nombre VARCHAR(200),                  -- "Ruben Castro"
  autorizacion_sig_puesto VARCHAR(200),                  -- "Service Account Manager"
  autorizacion_sig_empresa VARCHAR(200),                 -- "SIG Combibloc México"
  autorizacion_sig_firma  VARCHAR(500),                  -- URL imagen de firma (opcional)

  -- Autorización del cliente
  autorizacion_cliente_nombre  VARCHAR(200),             -- "Jose Antonio Perez"
  autorizacion_cliente_puesto  VARCHAR(200),             -- "Jefe de Mantenimiento"
  autorizacion_cliente_empresa VARCHAR(200),             -- "Alpura, Cuautitlán"
  autorizacion_cliente_firma   VARCHAR(500),             -- URL imagen de firma (opcional)
  -- ─────────────────────────────────────────────────────────────────────────

  estado                  ENUM('borrador','en_revision','finalizado') DEFAULT 'borrador',
  observaciones_gen       TEXT,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.2 Tabla de parámetros técnicos: `audit_section_params`

Almacena cada fila de las tablas HH/HS/SP/L/LL del reporte.

```sql
CREATE TABLE audit_section_params (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  audit_id       BIGINT       NOT NULL REFERENCES food_safety_audit_reports(id),
  seccion        VARCHAR(60)  NOT NULL,  -- 'dedusting','sterile_air','h2o2','sst','cip','misc'
  subseccion     VARCHAR(100),           -- Ej: 'sterile_air_household', 'condensate_barrier'
  feature        VARCHAR(255) NOT NULL,  -- Nombre exacto del parámetro
  unidad         VARCHAR(30),            -- mbar, °C, l/min, µl/s…
  valor_hh       DECIMAL(10,3),          -- Límite High-High (alarma máxima)
  valor_hs       DECIMAL(10,3),          -- Límite High-Setpoint
  valor_sp       DECIMAL(10,3),          -- Setpoint (valor objetivo)
  valor_l        DECIMAL(10,3),          -- Límite Low
  valor_ll       DECIMAL(10,3),          -- Límite Low-Low (alarma mínima)
  ultimo_valor   DECIMAL(10,3),          -- Last value (auditoría anterior)
  valor_actual   DECIMAL(10,3),          -- Valor capturado hoy
  dentro_rango   BOOLEAN GENERATED ALWAYS AS (
                   valor_actual BETWEEN valor_ll AND valor_hh
                 ) STORED,
  observacion    TEXT,
  track          TINYINT DEFAULT NULL,   -- 1,2,3,4 para parámetros por track
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_params ON audit_section_params(audit_id, seccion);
```

### 3.3 Tabla de hallazgos COP: `audit_cop_findings`

```sql
CREATE TABLE audit_cop_findings (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  audit_id     BIGINT       NOT NULL REFERENCES food_safety_audit_reports(id),
  seccion_cop  VARCHAR(100) NOT NULL,
  -- Secciones válidas:
  -- 'alimentacion_envase','magazine','dedusting','preheating_drying',
  -- 'llenado','ultrasonido','mesa_salida','cadena_celdas',
  -- 'bloque_valvulas','areas_circundantes'
  cam_on       DECIMAL(6,2),            -- Ángulo CAM ON (°), default 60
  cam_off      DECIMAL(6,2),            -- Ángulo CAM OFF (°), default 220
  descripcion  TEXT,                    -- Hallazgo / desviación / recomendación
  tiene_falla  BOOLEAN DEFAULT FALSE,   -- TRUE = requiere foto de evidencia
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 Tabla de imágenes de evidencia: `audit_evidence_images`

```sql
CREATE TABLE audit_evidence_images (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  audit_id        BIGINT       NOT NULL REFERENCES food_safety_audit_reports(id),
  cop_finding_id  BIGINT       REFERENCES audit_cop_findings(id),
  param_id        BIGINT       REFERENCES audit_section_params(id),
  -- cop_finding_id y param_id son mutuamente excluyentes
  -- (una imagen pertenece a un hallazgo COP o a un parámetro, no a ambos)

  storage_key     VARCHAR(500) NOT NULL,  -- Ruta en S3/R2: 'fsa/2024/001/cop_magazine_01.jpg'
  url_original    VARCHAR(1000),          -- URL firmada de la imagen original (alta resolución)
  url_thumbnail   VARCHAR(1000),          -- URL de miniatura (400×300) para preview en UI
  url_report      VARCHAR(1000),          -- URL de versión para PDF (1200×900, max 300KB)
  nombre_archivo  VARCHAR(255),
  mime_type       VARCHAR(50),            -- image/jpeg, image/png, image/webp
  size_bytes      INT,
  width_px        INT,
  height_px       INT,
  caption         VARCHAR(500),           -- Leyenda que aparecerá en el PDF
  orden           TINYINT DEFAULT 0,      -- Orden de aparición en el reporte
  uploaded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 Tabla de flujo de CIP por cabezal: `audit_cip_flows`

```sql
CREATE TABLE audit_cip_flows (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  audit_id         BIGINT NOT NULL REFERENCES food_safety_audit_reports(id),
  paso             ENUM('pre_rinsing','otros') NOT NULL,
  track            TINYINT NOT NULL,       -- 1,2,3,4
  cabezal          TINYINT NOT NULL,       -- 1,2
  tipo_cabezal     VARCHAR(100),           -- Tipo de filling head
  flujo_ml_s       DECIMAL(8,3),
  volumen_total_hmi DECIMAL(10,3),
  volumen_total_cip DECIMAL(10,3)
);
```

### 3.6 Tipos TypeScript del frontend

```typescript
// types/foodSafetyAudit.ts

export type AuditStatus = 'borrador' | 'en_revision' | 'finalizado';

export type AuditSectionKey =
  | 'dedusting'
  | 'sterile_air'
  | 'h2o2'
  | 'preheating'
  | 'sst'
  | 'cip'
  | 'misc';

export type CopSection =
  | 'alimentacion_envase' | 'magazine' | 'dedusting'
  | 'preheating_drying'   | 'llenado'  | 'ultrasonido'
  | 'mesa_salida'         | 'cadena_celdas'
  | 'bloque_valvulas'     | 'areas_circundantes';

export interface EvidenceImage {
  id: number;
  url_thumbnail: string;
  url_report: string;
  caption: string;
  orden: number;
}

export interface CopFinding {
  id: number;
  seccion_cop: CopSection;
  cam_on: number | null;
  cam_off: number | null;
  descripcion: string;
  tiene_falla: boolean;
  images: EvidenceImage[];
}

export interface SectionParam {
  id: number;
  feature: string;
  unidad: string;
  valor_hh: number;
  valor_hs: number;
  valor_sp: number;
  valor_l: number;
  valor_ll: number;
  ultimo_valor: number | null;
  valor_actual: number | null;
  dentro_rango: boolean;
  observacion: string;
  track: number | null;
}

export interface AuditReport {
  id: number;
  folio: string;
  llenadora: string;
  cliente_empresa: string;
  planta: string;
  auditor_id: number;
  auditor_nombre: string;
  estado: AuditStatus;
  fecha_auditoria: string;
  cop_findings: CopFinding[];
  params: Record<AuditSectionKey, SectionParam[]>;
  cip_flows: CipFlow[];
  observaciones_gen: string;
  created_at: string;
}
```

---

## 4. Fase 3 — Portada del reporte (Paso 0 del wizard)

**Duración estimada:** 3–4 días  
**Responsable:** Frontend + Backend

Este es el **primer paso del wizard** al crear o editar un reporte. Se basa directamente en la portada del reporte físico de SIG Combibloc y debe reproducir fielmente su estructura en el PDF generado.

### 4.1 Referencia visual de la portada

La portada real del reporte contiene exactamente estos campos:

| Campo (etiqueta en PDF) | Campo en sistema | Requerido |
|---|---|---|
| Client | `cliente_empresa` | Sí |
| Date of audit | `fecha_auditoria` | Sí |
| Location of audit | `location_of_audit` | Sí |
| Filling machine type | `llenadora` | Sí |
| Filling machine serial number | `llenadora_serial` | Sí |
| Operating hours of filling machine | `llenadora_horas_op` | No (puede ser `—`) |
| Persons in charge conducting the audit | `personas_a_cargo` (lista) | Sí (mínimo 1) |
| Authorization SIG Combibloc | `autorizacion_sig_*` | Sí |
| Authorization client | `autorizacion_cliente_*` | Sí |

### 4.2 Diseño del formulario de portada en el wizard

```
┌─────────────────────────────────────────────────────────────────┐
│  PASO 0 DE 6 — Datos generales del reporte                      │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  INFORMACIÓN DEL CLIENTE Y LLENADORA                             │
│                                                                   │
│  Client *                  Date of audit *                       │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Ej: Alpura, Cuautitlán│  │ Noviembre, 2025       │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
│  Location of audit *                                              │
│  ┌────────────────────────────────────────────────┐              │
│  │ Cuautitlán Izcalli, Estado de México           │              │
│  └────────────────────────────────────────────────┘              │
│                                                                   │
│  Filling machine type *     Serial number *                      │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ CFA 1824-37           │  │ 874251005             │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                   │
│  Operating hours                                                  │
│  ┌──────────────────────┐                                        │
│  │ — (opcional)          │                                        │
│  └──────────────────────┘                                        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  PERSONS IN CHARGE CONDUCTING THE AUDIT                          │
│                                                                   │
│  Persona 1                                                        │
│  Nombre *               Puesto *              Empresa *           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │Abraham Cabrera│  │Quality Spec. │  │SIG Combibloc Méx.│       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
│                                                                   │
│  [+ Agregar otra persona]                                         │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  AUTHORIZATION SIG COMBIBLOC                                     │
│                                                                   │
│  Nombre *               Puesto *              Empresa *           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │ Ruben Castro  │  │Svc Acc Mgr   │  │SIG Combibloc Méx.│       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  AUTHORIZATION CLIENT                                             │
│                                                                   │
│  Nombre *               Puesto *              Empresa *           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐       │
│  │Jose A. Perez  │  │Jefe Mantenim.│  │Alpura, Cuautitlán│       │
│  └──────────────┘  └──────────────┘  └──────────────────┘       │
│                                                                   │
│                          [Guardar y continuar →]                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Tipo TypeScript de la portada

```typescript
// types/auditCoverPage.ts

export interface PersonInCharge {
  nombre:  string;   // "Abraham Cabrera"
  puesto:  string;   // "Quality Specialist"
  empresa: string;   // "SIG Combibloc México"
}

export interface AuthorizationParty {
  nombre:  string;   // "Ruben Castro"
  puesto:  string;   // "Service Account Manager"
  empresa: string;   // "SIG Combibloc México"
  firma_url?: string; // URL de imagen de firma digitalizada (opcional)
}

export interface AuditCoverPage {
  cliente_empresa:          string;           // "Alpura, Cuautitlán"
  fecha_auditoria:          string;           // "Noviembre, 2025" (texto libre) o ISO date
  location_of_audit:        string;           // "Cuautitlán Izcalli, Estado de México"
  llenadora:                string;           // "CFA 1824-37"
  llenadora_serial:         string;           // "874251005"
  llenadora_horas_op:       number | null;    // null → muestra "—" en el PDF
  personas_a_cargo:         PersonInCharge[]; // mínimo 1
  autorizacion_sig:         AuthorizationParty;
  autorizacion_cliente:     AuthorizationParty;
}
```

### 4.4 Validaciones del formulario de portada

```typescript
// schemas/coverPage.schema.ts (Zod)
import { z } from 'zod';

const PersonSchema = z.object({
  nombre:  z.string().min(2, 'El nombre es requerido'),
  puesto:  z.string().min(2, 'El puesto es requerido'),
  empresa: z.string().min(2, 'La empresa es requerida'),
});

export const CoverPageSchema = z.object({
  cliente_empresa:      z.string().min(2),
  fecha_auditoria:      z.string().min(4),       // "Noviembre, 2025" texto libre
  location_of_audit:    z.string().min(5),
  llenadora:            z.string().min(2),
  llenadora_serial:     z.string().min(1),
  llenadora_horas_op:   z.number().positive().nullable().optional(),
  personas_a_cargo:     z.array(PersonSchema).min(1, 'Al menos una persona en cargo'),
  autorizacion_sig:     PersonSchema,
  autorizacion_cliente: PersonSchema,
});
```

### 4.5 Componente: `PersonCardField`

Componente reutilizable para los tres bloques de personas (en cargo, autorización SIG, autorización cliente):

```typescript
interface PersonCardFieldProps {
  label: string;           // "Person in charge" | "Authorization SIG" | etc.
  value: PersonInCharge;
  onChange: (val: PersonInCharge) => void;
  onRemove?: () => void;   // Solo si es lista (personas_a_cargo)
  showRemove?: boolean;
}
```

Renderiza tres inputs en fila (Nombre | Puesto | Empresa) dentro de una card con borde izquierdo de color. Si `showRemove = true`, muestra botón de eliminar en la esquina superior derecha.

### 4.6 Cómo se pre-llena automáticamente

Para agilizar la captura, el sistema pre-rellena algunos campos si hay contexto disponible:

| Campo | Fuente de pre-llenado |
|---|---|
| Personas en cargo | Usuario autenticado (nombre, puesto, empresa desde perfil) |
| Autorización SIG | Auditor senior asignado al reporte |
| `fecha_auditoria` | Fecha actual formateada como "Mes, Año" |
| `autorizacion_sig_empresa` | Constante `"SIG Combibloc México"` |

El usuario puede editar o sobreescribir cualquier valor pre-llenado antes de continuar.

### 4.7 Portada en el PDF generado

La portada del PDF replica exactamente la tabla del reporte físico de SIG:

```css
/* Estilos para la página de portada del PDF */
.cover-page {
  page-break-after: always;    /* La portada ocupa su propia página */
  font-family: Arial, sans-serif;
}

.cover-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #2e7d32; /* Verde SIG Combibloc */
  margin-top: 20mm;
}

.cover-table td {
  padding: 6mm 8mm;
  vertical-align: top;
  border-bottom: 1px solid #c8e6c9;
  font-size: 10pt;
}

.cover-table td:first-child {
  width: 45%;
  font-weight: 500;
  color: #1b5e20;
  background: #f9fbe7;
}

/* Celda con múltiples personas: separar con línea tenue */
.cover-table .person-block {
  padding-bottom: 4mm;
  margin-bottom: 4mm;
  border-bottom: 0.5px solid #e8f5e9;
}

.cover-table .person-block:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
```

**Ejemplo de la tabla en HTML para el PDF:**

```html
<table class="cover-table">
  <tr>
    <td>Client</td>
    <td>{{ cliente_empresa }}</td>
  </tr>
  <tr>
    <td>Date of audit</td>
    <td>{{ fecha_auditoria }}</td>
  </tr>
  <tr>
    <td>Location of audit</td>
    <td>{{ location_of_audit }}</td>
  </tr>
  <tr>
    <td>Filling machine type</td>
    <td>{{ llenadora }}</td>
  </tr>
  <tr>
    <td>Filling machine serial number</td>
    <td>{{ llenadora_serial }}</td>
  </tr>
  <tr>
    <td>Operating hours of filling machine</td>
    <td>{{ llenadora_horas_op ?? '—' }}</td>
  </tr>
  <tr>
    <td>Persons in charge conducting the audit</td>
    <td>
      {% for persona in personas_a_cargo %}
      <div class="person-block">
        <strong>{{ persona.nombre }}</strong><br>
        {{ persona.puesto }}<br>
        {{ persona.empresa }}
      </div>
      {% endfor %}
    </td>
  </tr>
  <tr>
    <td>Authorization SIG Combibloc</td>
    <td>
      <strong>{{ autorizacion_sig.nombre }}</strong><br>
      {{ autorizacion_sig.puesto }}<br>
      {{ autorizacion_sig.empresa }}
    </td>
  </tr>
  <tr>
    <td>Authorization client</td>
    <td>
      <strong>{{ autorizacion_cliente.nombre }}</strong><br>
      {{ autorizacion_cliente.puesto }}<br>
      {{ autorizacion_cliente.empresa }}
    </td>
  </tr>
</table>
```

---

## 5. Fase 4 — Secciones del formulario de reporte

**Duración estimada:** 6–8 días  
**Responsable:** Frontend

El formulario es un **wizard de 7 pasos** con guardado automático en modo borrador al cambiar de sección.

### 4.1 Estructura del wizard

```
[Datos generales] → [COP] → [Dedusting / Sterile Air] → [H₂O₂]
→ [Preheating & SST] → [CIP] → [Misceláneos & Resumen]
```

Barra de progreso en la parte superior con indicador de sección completada (✓) / en progreso / pendiente.

### 4.2 Componente: `ParameterRangeRow`

Componente reutilizable para cada fila de parámetros con umbrales:

```typescript
interface ParameterRangeRowProps {
  feature: string;
  unidad: string;
  hh: number; hs: number; sp: number; l: number; ll: number;
  ultimoValor?: number;
  valorActual?: number;
  onChange: (val: number) => void;
  track?: number; // Si aplica por track
}
```

**Comportamiento visual:**
- Si `valorActual > hh` o `valorActual < ll` → celda roja con ícono de alerta
- Si `valorActual` entre `l` y `ll`, o entre `hs` y `hh` → celda amarilla (advertencia)
- Si `valorActual` entre `l` y `hs` → celda verde (dentro de rango)
- Celda vacía → gris neutral, no se valida hasta que el usuario captura

### 4.3 Sección 1: Datos generales

| Campo | Tipo | Requerido |
|---|---|---|
| Llenadora | `text` (con autocomplete) | Sí |
| Empresa / Cliente | `text` | Sí |
| Planta | `text` | Sí |
| Fecha de auditoría | `date` | Sí |
| Auditor responsable | `select` → lista de usuarios | Sí |
| Observaciones generales | `textarea` | No |

### 4.4 Sección 2: COP (Cleaning Out of Place)

10 subsecciones. Cada una tiene:

- Nombre de la sección (ej. "Magazine", "Llenado")
- Ángulos **CAM ON** (default: 60°) y **CAM OFF** (default: 220°) — editables
- Campo de texto: "Descripción general de desempeño / hallazgos"
- Toggle: **"¿Se detectó falla o área de oportunidad?"** (Sí / No)
- Si `tiene_falla = true` → mostrar uploader de imágenes (ver Fase 4)

**Subsecciones COP:**

| Clave | Nombre para mostrar |
|---|---|
| `alimentacion_envase` | 4.1 Alimentación de envase |
| `magazine` | Magazine |
| `dedusting` | Dedusting unit |
| `preheating_drying` | Preheating and Drying |
| `llenado` | Llenado |
| `ultrasonido` | Ultrasonido |
| `mesa_salida` | Mesa de Salida |
| `cadena_celdas` | Cadena de Celdas / Guía de fondo |
| `bloque_valvulas` | Bloque de Válvulas |
| `areas_circundantes` | Áreas circundantes a la llenadora |

### 4.5 Sección 3: Dedusting Unit + Sterile Air Balance

**Dedusting Unit — Parametrización:**

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Tank Pressure Dedusting | mbar | 5.500 | 5.000 | 4.000 | 3.500 | 3.000 |
| CAM ON | ° | — | — | 60 | — | — |
| CAM OFF | ° | — | — | 220 | — | — |

**Sterile Air Balance:**

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Pressure sterile air fan Production | mbar | +5 | +2 | 30 | -2 | -5 |
| Pressure sterile air fan outside production | mbar | 10 | 5 | 3 | 7 | 0 |
| Pressure loss prefilter | mbar | 5 | 4 | 2 | 0 | 0 |
| Pressure loss (HEPA) filter | mbar | 8 | 6 | 2 | 0 | 0 |
| Exhaust output | µbar | 1.500 | 1.400 | 1.200 | 800 | 700 |
| Pressure loss flap exhaust | µbar | — | — | 100 | — | — |

Más tabla de **Sterile Air Household** (Infeed / Exhaust total con valores por defecto y actuales).

### 4.6 Sección 4: H₂O₂

Capturar: proveedor, tipo y concentración del H₂O₂.

Tabla de parámetros de dosificación (por track 1/2 y track 3/4):

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Spray qty H₂O₂ Production A / wine (≥500ml) | µl/s | 380 | 355 | 330 | 305 | 280 |
| Spray qty H₂O₂ Production AL (≥500ml) | µl/s | 500 | 475 | 450 | 425 | 400 |
| Spray qty H₂O₂ Prod. Reduced | µl/s | 275 | 250 | 225 | 200 | 175 |
| Spray qty H₂O₂ Sterilization | µl/s | 350 | 325 | 300 | 275 | 250 |
| H₂O₂ medium temperature | °C | +20 | +15 | 270 | -15 | -20 |
| Temperature upper H₂O₂ heater | °C | +20 | +20 | 160 | -20 | -20 |
| Transporting air H₂O₂ Sterilization | l/min | 183 | — | 166 | — | 150 |
| Transporting air Production | l/min | 220 | — | 200 | — | 180 |
| Power factor H₂O₂ Sterilization | l/min | 100 | 100 | 40 | 30 | 25 |
| Power factor Production ≥500ml A/AL | % | 100 | 100 | 33/43/50 | 25/32/35 | 21/27/30 |
| Pressure transporting air (dosing piston) | mbar | 2.000 | 1.800 | 1.000 | 600 | 500 |
| Pressure transporting air (analogue 2015) | mbar | 4.500 | 4.000 | 3.000 | 1.500 | 1.000 |

Campos adicionales: posición final del pistón, diámetro de condensado, diámetro de mangueras de aire.

### 4.7 Sección 5: Preheating, Drying y SST

**Preheating & Drying** — valores por track (1–4) y por nozzle:

| Feature | Unidad | Default |
|---|---|---|
| pdyn preheating (NW 19) | mmwc | 34 ± 2 |
| Temperature preheating | °C | 100 ± 10 |
| pdyn drying (NW 19) | mmwc | 26 ± 2 |
| Temperature drying | °C | 100 ± 10 |

Tabla de setpoints por volumen (500ml / 750ml / 960-1000ml / All volumes):

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Temp. Preheating 500ml / Drive ON | °C | +5 | +5 | 130 | -5 | -5 |
| Temp. Preheating 750ml / Drive ON | °C | +5 | +5 | 170 | -5 | -5 |
| Temp. Preheating 960/1000ml / Drive ON | °C | +5 | +5 | 230 | -5 | -5 |
| Temp. Preheating All / Drive OFF | °C | +5 | +5 | 100 | -5 | -5 |
| Temp. Drying 500ml / Drive ON | °C | +5 | +5 | 120 | -5 | -5 |
| Temp. Drying 750ml / Drive ON | °C | +5 | +5 | 140 | -5 | -5 |
| Temp. Drying 960/1000ml / Drive ON | °C | +5 | +5 | 180 | -5 | -5 |
| Temp. Drying All / Drive OFF | °C | +5 | +5 | 100 | -5 | -5 |

**SST (Steam Sterilization):**

| Feature | Unidad | HH | HS | SP | L | LL | L (FDA) | LL (FDA) |
|---|---|---|---|---|---|---|---|---|
| Steam supply | °C | 170 | 165 | 155 | 130 | 125 | — | — |
| Temperatures SST | °C | 140 | 135 | 125 | 121 | 115 | 123 | 121 |

Puntos de medición a capturar por track:
- Swivel coupling tr 1/2 y tr 3/4
- Sterile air filter
- Nitrogen filter filling station
- Nitrogen injection filling station
- Nitrogen filter steam injection
- Nitrogen injection steam inj. tr 1/2 y tr 3/4
- Steam barrier outside (R)
- Steam barrier behind controller (A+R)
- Steam injection tr 1/2 y tr 3/4

**Steam temperatures — Steam barriers:**

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Steam barrier behind controller (R) | °C | 140 | 135 | 125 | 115 | 102 |
| Steam barrier behind controller (A) | °C | 140 | 135 | 115 | 110 | 102 |
| Steam barrier (R) — passive | °C | 140 | 135 | 40 | 30 | 25 |
| Steam injection tr 1/2 | °C | 140 | 135 | 125 | ≥110 | ≥102 |
| Steam injection tr 3/4 | °C | 140 | 135 | 125 | ≥110 | ≥102 |

Parámetros especiales para condensate barrier (dairy):

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Condensate barrier with steam | °C | 140 | 135 | 115 | 110 | 102 |
| Condensate barrier flushing | °C | 135 | 130 | 90 | 80 | 75 |
| Condensate barrier with condensate | °C | 75 | 65 | 35 | 25 | 20 |

### 4.8 Sección 6: CIP (Cleaning in Place)

**Parámetros de medios de limpieza:**

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Temperatura agua | °C | 100 | 100 | 20 | 0 | 0 |
| Temperatura soda cáustica | °C | 80 | 75 | 70 | 65 | 60 |
| Temperatura ácido | °C | 75 | 70 | 65 | 60 | 55 |
| Total flow volume during CIP | l/h | — | — | 10.000 | — | 8.000 |

Para cada agente de limpieza (soda cáustica y ácido): conductividad (mS/cm) y concentración (% por titulación).

**Flujos por cabezal (tabla por track 1–4 y cabezal 1–2):**

Capturar ml/s para:
- Pre-rinsing (filling head individual)
- Otros pasos de limpieza (todos los cabezales abiertos)
- Display HMI vs Display CIP (para comparativa)
- Tipo de filling head por track

### 4.9 Sección 7: Esterilización y Misceláneos

**Esterilización:**

| Campo | Tipo | Valor esperado |
|---|---|---|
| Paso funcional SST | `select` (Sí / No) | — |
| Paso funcional AZS | `select` (Sí / No) | — |
| Concentración de H₂O₂ | `number` | % |

**Presión del tanque de producto:**

| Feature | Unidad | HH | HS | SP | L | LL |
|---|---|---|---|---|---|---|
| Pressure product tank — Production | mbar | 0 | 0 | 0 | 0 | 0 |
| Pressure product tank (A)&(R) — Cleaning | mbar | 3.000 | — | 1.200 | — | 50 |
| Pressure product tank (A)&(R) — Sterilization | mbar | 2.000 | — | 250 | — | 0 |
| Pressure product tank — Cooling | mbar | 100 | — | 60 | — | 10 |
| Pressure product tank — Special filling | mbar | +30 | +20 | 100 | -20 | -30 |
| Level product tank | % | 90 | 85 | — | — | — |
| Time cooling down filling heads | min | — | — | 10 | — | — |

---

## 6. Fase 5 — Manejo de evidencias fotográficas

**Duración estimada:** 4–5 días  
**Responsable:** Frontend + Backend + DevOps (storage)

Esta fase es crítica: las imágenes deben verse con buena resolución en el reporte PDF final, pero sin hacer el archivo demasiado pesado.

### 5.1 Flujo completo de una imagen

```
[Usuario toma/selecciona foto]
         ↓
[Frontend: validación local]
  - Formato: JPEG, PNG, WEBP
  - Tamaño mínimo: 800 × 600 px
  - Peso máximo: 20 MB
         ↓
[Frontend → Backend: upload a presigned URL]
         ↓
[Backend / Worker: procesamiento de 3 versiones]
  ├── original/  → sin cambios   (para descarga)
  ├── report/    → 1200 × 900 px (para PDF)
  └── thumb/     → 400 × 300 px  (para UI web)
         ↓
[Backend: guarda URLs en audit_evidence_images]
         ↓
[Frontend: muestra thumbnail con caption editable]
```

### 5.2 Especificaciones de cada versión de imagen

| Versión | Resolución | Formato | Calidad | Uso |
|---|---|---|---|---|
| `original` | Sin redimensionar | JPEG/PNG original | 100% | Descarga auditor |
| `report` | 1200 × 900 px (max) | JPEG | 85% | Inserción en PDF |
| `thumb` | 400 × 300 px | JPEG | 70% | Preview en UI web |

> **¿Por qué 1200 × 900 para el PDF?**  
> En un PDF A4 impreso a 300 DPI, una imagen que ocupa ¾ del ancho de página necesita aprox. 1.240 px de ancho para verse nítida. Con 1200 px cubrimos ese caso sin inflar el archivo.

### 5.3 Configuración del worker de imágenes (Sharp / Node.js)

```typescript
// workers/imageProcessor.ts
import sharp from 'sharp';

const VERSIONS = [
  { key: 'report', width: 1200, height: 900, quality: 85 },
  { key: 'thumb',  width: 400,  height: 300, quality: 70 },
];

export async function processAuditImage(
  inputBuffer: Buffer,
  storageKeyBase: string   // Ej: 'fsa/2024/FSA-0001/cop_magazine'
): Promise<ProcessedImages> {
  const results: Record<string, string> = {};

  // Guardar original
  const originalKey = `${storageKeyBase}_original.jpg`;
  await uploadToStorage(inputBuffer, originalKey);
  results.original = getSignedUrl(originalKey);

  // Generar versiones procesadas
  for (const version of VERSIONS) {
    const processed = await sharp(inputBuffer)
      .resize(version.width, version.height, {
        fit: 'inside',          // Mantiene aspecto, no recorta
        withoutEnlargement: true // No agranda imágenes pequeñas
      })
      .jpeg({ quality: version.quality, progressive: true })
      .toBuffer();

    const key = `${storageKeyBase}_${version.key}.jpg`;
    await uploadToStorage(processed, key);
    results[version.key] = getSignedUrl(key);
  }

  return results;
}
```

### 5.4 Componente frontend: `EvidenceUploader`

```typescript
// components/EvidenceUploader.tsx
interface EvidenceUploaderProps {
  auditId: number;
  findingId: number;
  images: EvidenceImage[];
  onUploaded: (img: EvidenceImage) => void;
  onDeleted: (id: number) => void;
  onCaptionChange: (id: number, caption: string) => void;
}
```

**Comportamiento:**

- Área de drag-and-drop visible cuando `tiene_falla = true`
- Acepta múltiples archivos simultáneos (máx. 5 por hallazgo COP)
- Muestra barra de progreso durante el upload
- Preview inmediato con thumbnail tras la carga
- Campo de caption editable debajo de cada imagen (aparecerá al pie en el PDF)
- Botón de eliminar con confirmación
- Las imágenes se ordenan con drag-and-drop (`orden` se actualiza)

### 5.5 Validaciones del lado del cliente

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

async function validateImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Formato no soportado. Use JPEG, PNG o WEBP.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'La imagen excede 20 MB.';
  }
  // Verificar dimensiones mínimas
  const dimensions = await getImageDimensions(file);
  if (dimensions.width < MIN_WIDTH || dimensions.height < MIN_HEIGHT) {
    return `La imagen debe ser mínimo ${MIN_WIDTH} × ${MIN_HEIGHT} px para buena calidad en el PDF.`;
  }
  return null; // válida
}
```

### 5.6 Política de almacenamiento (S3 / Cloudflare R2)

```
Bucket: food-safety-audit-[env]
├── fsa/
│   └── {año}/
│       └── {folio}/
│           ├── cop_{seccion}_{n}_original.jpg
│           ├── cop_{seccion}_{n}_report.jpg
│           └── cop_{seccion}_{n}_thumb.jpg
```

- URLs firmadas con expiración de 24 horas para visualización en UI
- Para el PDF: el servicio generador accede directamente al bucket (sin URL firmada)
- Lifecycle rule: las imágenes de reportes en estado `borrador` > 30 días sin actividad → mover a storage frío (Glacier / Infrequent Access)

---

## 7. Fase 6 — Generación del reporte PDF final

**Duración estimada:** 5–6 días  
**Responsable:** Backend + Frontend

### 6.1 Tecnología recomendada: Puppeteer headless

Renderizar una página web interna (`/food-safety-audit/[id]/pdf-template`) y capturarla como PDF. Esto permite:
- Reutilizar los componentes React para el PDF
- Control total sobre el layout y las imágenes
- Fácil mantenimiento (solo HTML/CSS)

Alternativa: `@react-pdf/renderer` si se quiere generación 100% server-side sin Puppeteer.

### 6.2 Estructura del PDF (orden de secciones)

```
Página 1 — Portada (tabla exacta del reporte físico SIG)
  ├── Logo SIG Combibloc
  ├── Título: "Food Safety Audit Report"
  ├── Tabla de portada:
  │     ├── Client
  │     ├── Date of audit
  │     ├── Location of audit
  │     ├── Filling machine type
  │     ├── Filling machine serial number
  │     ├── Operating hours of filling machine
  │     ├── Persons in charge conducting the audit  ← lista de personas
  │     ├── Authorization SIG Combibloc             ← nombre / puesto / empresa
  │     └── Authorization client                    ← nombre / puesto / empresa
  └── Folio interno del sistema (pie de página)

Páginas 2-N — Secciones técnicas
  ├── COP — Resultados de inspección visual
  │     └── Por cada subsección con hallazgo: descripción + IMÁGENES
  ├── Dedusting Unit + Sterile Air Balance
  ├── H₂O₂ — Parámetros y dosificación
  ├── Preheating, Drying y SST
  ├── CIP — Parámetros y flujos
  └── Misceláneos y Esterilización

Página final — Resumen ejecutivo
  ├── Tabla de parámetros fuera de rango (si existen)
  ├── Total de hallazgos COP con falla
  └── Espacio para firma manuscrita del auditor y fecha de cierre
```

### 6.3 Layout de imágenes en el PDF

Cada hallazgo COP con imágenes se muestra así en el PDF:

```
┌─────────────────────────────────────────────────────────────────┐
│  SECCIÓN: Magazine                                              │
│  CAM ON: 60° | CAM OFF: 220°                                    │
│  ────────────────────────────────────────────────────────────── │
│  Descripción: Se detectó acumulación de residuos en la guía...  │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────┐           │
│  │                      │    │                      │           │
│  │    IMAGEN 1          │    │    IMAGEN 2           │           │
│  │  (1200 × 900 px)     │    │  (1200 × 900 px)     │           │
│  │  ~85 mm × 64 mm      │    │  ~85 mm × 64 mm      │           │
│  │                      │    │                      │           │
│  └──────────────────────┘    └──────────────────────┘           │
│  Fig. 1: Acumulación zona...  Fig. 2: Vista lateral...          │
└─────────────────────────────────────────────────────────────────┘
```

**Reglas de layout de imágenes:**

| Número de imágenes | Layout |
|---|---|
| 1 imagen | Centrada, ancho completo (~170 mm) |
| 2 imágenes | 2 columnas (~80 mm cada una) |
| 3 imágenes | 2 columnas arriba + 1 centrada abajo |
| 4–5 imágenes | 2 filas de 2 + 1 si aplica |

### 6.4 CSS para el PDF (página A4, 300 DPI)

```css
/* pdf-template.css */
@page {
  size: A4;
  margin: 20mm 15mm 20mm 15mm;
}

.section-images {
  display: grid;
  gap: 8mm;
  margin-top: 6mm;
}

/* 1 imagen: ancho completo */
.images-1 { grid-template-columns: 1fr; }

/* 2 imágenes: dos columnas iguales */
.images-2 { grid-template-columns: 1fr 1fr; }

/* 3+ imágenes: dos columnas */
.images-3,
.images-4,
.images-5 { grid-template-columns: 1fr 1fr; }

.evidence-img {
  width: 100%;
  height: auto;
  object-fit: cover;
  border-radius: 2mm;
  border: 0.3mm solid #ddd;
  /* Las imágenes son versión 'report' (1200×900px, JPEG 85%)
     → se ven nítidas incluso imprimiendo en A4 300 DPI */
}

.img-caption {
  font-size: 8pt;
  color: #666;
  text-align: center;
  margin-top: 2mm;
  font-style: italic;
}
```

### 6.5 Endpoint de generación de PDF

```typescript
// app/api/food-safety-audit/[id]/pdf/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const report = await getFullAuditReport(Number(params.id));

  // Las imágenes se obtienen directamente del bucket (sin URL firmada)
  // para garantizar acceso durante la generación
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${process.env.INTERNAL_URL}/pdf-template/${params.id}`, {
    waitUntil: 'networkidle0' // Esperar a que carguen todas las imágenes
  });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });

  await browser.close();

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="FSA-${report.folio}.pdf"`,
    }
  });
}
```

---

## 8. Fase 7 — Listado, roles y flujo de aprobación

**Duración estimada:** 3–4 días  
**Responsable:** Frontend + Backend

### 7.1 Tipo `AuditRow` para el listado

```typescript
type AuditRow = {
  id: number;
  folio: string;
  estado: AuditStatus;
  llenadora: string;           // Nuevo
  cliente_empresa: string | null;
  planta: string | null;
  auditor_nombre: string | null;
  fecha_auditoria: string | null;  // Nuevo (reemplaza fecha_inicio/fecha_fin)
  total_hallazgos: number;         // Nuevo: suma de COP findings con falla
  params_fuera_rango: number;      // Nuevo: parámetros con valor_actual fuera de rango
  created_at: string;
};
```

### 7.2 Columnas de la tabla de listado

| Columna | Contenido |
|---|---|
| Folio | Badge monospace |
| Llenadora | Ej: CFA-312-3X |
| Empresa / Planta | Empresa con sublabel de planta |
| Fecha auditoría | Fecha formateada |
| Auditor | Avatar con iniciales + nombre |
| Hallazgos | Badge rojo si `total_hallazgos > 0` |
| Parámetros fuera de rango | Badge amarillo si `params_fuera_rango > 0` |
| Estado | Pill con color por estado |
| Acciones | Botón ver detalle + botón descargar PDF |

### 7.3 Flujo de estados

```
[borrador] ──→ [en_revision] ──→ [finalizado]
                    ↓
              (con comentarios)
                    ↓
              [borrador] (regresado para corrección)
```

- **borrador**: el auditor puede editar todas las secciones
- **en_revision**: solo lectura para el auditor; el revisor puede aprobar o regresar
- **finalizado**: bloqueado para edición; PDF disponible para descarga

### 7.4 Seeder de auditores

```sql
INSERT INTO users (nombre, email, rol) VALUES
  ('Sabina García',    'sabina.garciadelaluz@sig.biz',   'auditor'),
  ('Abraham Cabrera',  'abraham.cabrerahidalgo@sig.biz', 'auditor'),
  ('Rodrigo Carrillo', 'rodrigo.carrillolopez@sig.biz',  'auditor'),
  ('Omar Serrato',     'omar.serrato@sig.biz',           'auditor'),
  ('Karina Alvarado',  'Karina.Alvarado@sig.biz',        'auditor'),
  ('Ervin Mellott',    'ervin.mellott@sig.biz',          'auditor_senior'),
  ('Patrick Pimenta',  'patrick.pimenta@sig.biz',        'auditor_senior');
-- Nota: Ervin y Patrick como senior (pueden aprobar reportes)
```

---

## 9. Equipo de auditores

| Nombre | Email | Rol sugerido |
|---|---|---|
| Sabina García | sabina.garciadelaluz@sig.biz | Auditor |
| Abraham Cabrera | abraham.cabrerahidalgo@sig.biz | Auditor |
| Rodrigo Carrillo | rodrigo.carrillolopez@sig.biz | Auditor |
| Omar Serrato | omar.serrato@sig.biz | Auditor |
| Karina Alvarado | Karina.Alvarado@sig.biz | Auditor |
| Ervin Mellott | ervin.mellott@sig.biz | Auditor Senior |
| Patrick Pimenta | patrick.pimenta@sig.biz | Auditor Senior |

---

## 10. Criterios de aceptación globales

### Portada del reporte

- [ ] El Paso 0 (Portada) bloquea el avance si faltan campos requeridos
- [ ] Se pueden agregar múltiples personas en cargo (mínimo 1, sin máximo fijo)
- [ ] El sistema pre-llena nombre y empresa del auditor autenticado
- [ ] La portada PDF es visualmente idéntica a la del reporte físico SIG (tabla con borde verde)
- [ ] `fecha_auditoria` acepta texto libre ("Noviembre, 2025") además de fecha ISO
- [ ] Los campos de horas de operación aceptan `—` o vacío (nullable)

### Imágenes

- [ ] El auditor puede subir fotos desde móvil (cámara) o escritorio (archivo)
- [ ] Se rechaza cualquier imagen menor a 800 × 600 px con mensaje claro
- [ ] El thumbnail carga en menos de 2 segundos en la UI
- [ ] Las imágenes en el PDF se ven nítidas al imprimir en A4 (300 DPI)
- [ ] El PDF final con 10 imágenes pesa menos de 8 MB
- [ ] Las captions editadas aparecen correctamente al pie de cada imagen en el PDF

### Parámetros técnicos

- [ ] Los valores fuera del rango HH/LL se marcan en rojo automáticamente
- [ ] El sistema precarga los valores default de la hoja de cálculo como referencia
- [ ] La columna `dentro_rango` se calcula automáticamente en backend

### Flujo general

- [ ] El reporte se guarda automáticamente como borrador cada vez que el auditor cambia de sección
- [ ] El auditor puede retomar un borrador en cualquier momento
- [ ] El PDF solo está disponible cuando el estado es `finalizado`
- [ ] Los auditores senior pueden aprobar o regresar un reporte con comentario

### Accesibilidad y usabilidad

- [ ] El formulario funciona correctamente en móvil (para captura en campo)
- [ ] El uploader de imágenes acepta fotos tomadas directamente desde la cámara del móvil
- [ ] Hay indicador de progreso claro durante el upload de cada imagen

---

*Documento generado a partir de: `Arquitectura_reporte_Food_Safety_Audit.xlsx`*  
*Última actualización: Mayo 2026*
