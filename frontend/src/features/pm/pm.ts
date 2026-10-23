/**
 * Módulo PM (Preventive Maintenance): tipos y reglas de presentación.
 *
 * Las fechas límite las calcula la base de datos (inicio + semanas × 7 días);
 * aquí solo se interpretan para mostrar el avance y el semáforo.
 */

export type Evidencia = "none" | "optional" | "required";
export type EstadoPm = "active" | "completed" | "cancelled";

export interface PmTarea {
  id: string;
  codigo: string;
  etapa_orden: number;
  etapa: string;
  semanas: number;
  titulo: string;
  evidencia: Evidencia;
  orden: number;
  fecha_limite: string | null; // AAAA-MM-DD
  asignado_a: string | null;
  completada: boolean;
  completada_por: string | null;
  completada_en: string | null;
  notas: string | null;
  colaboradores: string[];
}

export interface UsuarioPm {
  id: string;
  nombre: string | null;
  email: string | null;
}

export interface PmExpediente {
  id: string;
  cliente_id: number;
  clientes?: { id: number; nombre: string; empresa: string | null } | null;
  planta: string | null;
  linea: string | null;
  contacto_nombre: string | null;
  contacto_telefono: string | null;
  contacto_correo: string | null;
  sam: string | null;
  po_numero: string | null;
  fse_filler: string | null;
  fse_downline: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: EstadoPm;
  notas_abiertas: string | null;
  creado_por: string | null;
}

export interface PmResumen extends PmExpediente {
  progreso: { total: number; completadas: number; vencidas: number; proxima_fecha: string | null };
}

export interface PmDetalle extends PmExpediente {
  tareas: PmTarea[];
  usuarios: Record<string, UsuarioPm>;
}

/** Días antes del vencimiento en que una tarea pasa a "por vencer". */
export const DIAS_POR_VENCER = 7;

export type SemaforoTarea = "done" | "overdue" | "due_soon" | "on_track" | "no_date";

const MS_DIA = 24 * 60 * 60 * 1000;

/** AAAA-MM-DD → Date a medianoche UTC (sin corrimientos por zona horaria). */
export function parseFecha(f: string): Date {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Hoy como AAAA-MM-DD en la zona horaria local del usuario. */
export function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Días que faltan para la fecha (negativo = ya pasó). */
export function diasHasta(fecha: string, hoy: string): number {
  return Math.round((parseFecha(fecha).getTime() - parseFecha(hoy).getTime()) / MS_DIA);
}

export function semaforoTarea(
  t: Pick<PmTarea, "completada" | "fecha_limite">,
  hoy: string,
): SemaforoTarea {
  if (t.completada) return "done";
  if (!t.fecha_limite) return "no_date";
  const dias = diasHasta(t.fecha_limite, hoy);
  if (dias < 0) return "overdue";
  if (dias <= DIAS_POR_VENCER) return "due_soon";
  return "on_track";
}

export interface Etapa {
  orden: number;
  nombre: string;
  fecha_limite: string | null;
  tareas: PmTarea[];
  completadas: number;
}

/** Agrupa las tareas por etapa, en el orden del checklist. */
export function agruparPorEtapa(tareas: PmTarea[]): Etapa[] {
  const mapa = new Map<number, Etapa>();
  for (const t of [...tareas].sort((a, b) => a.orden - b.orden)) {
    let e = mapa.get(t.etapa_orden);
    if (!e) {
      e = { orden: t.etapa_orden, nombre: t.etapa, fecha_limite: t.fecha_limite, tareas: [], completadas: 0 };
      mapa.set(t.etapa_orden, e);
    }
    e.tareas.push(t);
    if (t.completada) e.completadas += 1;
  }
  return [...mapa.values()].sort((a, b) => a.orden - b.orden);
}

/** Etapa que se abre por defecto: la primera con tareas pendientes. */
export function etapaActual(etapas: Etapa[]): number | null {
  return etapas.find((e) => e.completadas < e.tareas.length)?.orden ?? null;
}

export function progreso(tareas: Array<{ completada: boolean }>) {
  const total = tareas.length;
  const completadas = tareas.filter((t) => t.completada).length;
  return { total, completadas, restantes: total - completadas, porcentaje: total ? Math.round((completadas / total) * 100) : 0 };
}

/** Semáforo del PM completo: el peor estado entre sus tareas pendientes. */
export function semaforoPm(
  p: { estado: EstadoPm; progreso: { vencidas: number; proxima_fecha: string | null } },
  hoy: string,
): "done" | "cancelled" | "overdue" | "due_soon" | "on_track" {
  if (p.estado === "completed") return "done";
  if (p.estado === "cancelled") return "cancelled";
  if (p.progreso.vencidas > 0) return "overdue";
  if (p.progreso.proxima_fecha && diasHasta(p.progreso.proxima_fecha, hoy) <= DIAS_POR_VENCER) return "due_soon";
  return "on_track";
}

/** "2027-08-08" → "Aug 8, 2027" */
export function formatearFecha(f: string | null | undefined): string {
  if (!f) return "—";
  return parseFecha(f).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function nombreUsuario(usuarios: Record<string, UsuarioPm>, id: string | null | undefined): string {
  if (!id) return "—";
  const u = usuarios[id];
  return u?.nombre || u?.email || "Unknown user";
}

/** Suma días a una fecha AAAA-MM-DD (misma aritmética que la base de datos: inicio + semanas × 7). */
export function sumarDias(fecha: string, dias: number): string {
  const d = parseFecha(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Etapas del checklist estándar, solo para la vista previa al crear un PM.
 * Las fechas reales las calcula la base de datos con la plantilla vigente.
 */
export const ETAPAS_ESTANDAR: Array<{ nombre: string; semanas: number; tareas: number }> = [
  { nombre: "18 weeks before PM", semanas: -18, tareas: 4 },
  { nombre: "17 weeks before PM", semanas: -17, tareas: 3 },
  { nombre: "16 weeks before PM", semanas: -16, tareas: 2 },
  { nombre: "4 weeks before PM", semanas: -4, tareas: 1 },
  { nombre: "2 weeks before PM", semanas: -2, tareas: 6 },
  { nombre: "PM execution", semanas: 0, tareas: 5 },
  { nombre: "1 week post PM", semanas: 1, tareas: 6 },
  { nombre: "3 weeks post PM", semanas: 3, tareas: 4 },
];
