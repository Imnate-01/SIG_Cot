/**
 * Reglas de las alertas del módulo PM: qué tarea avisa, con qué nivel y a quién.
 *
 * ⚠️ Este archivo existe en DOS lugares con contenido idéntico:
 *    - frontend/src/features/pm/alertas.ts
 *    - backend/src/domain/pmAlertas.ts
 * La prueba `alertas.test.ts` falla si dejan de ser iguales.
 *
 * Una tarea PENDIENTE de un PM ACTIVO genera alerta cuando:
 *   - ya venció (fecha límite anterior a hoy)            → "overdue"
 *   - vence hoy o en los próximos DIAS_AVISO días         → "due_soon"
 * Le llega a un usuario si:
 *   - es el responsable asignado de la tarea              → "assigned"
 *   - es colaborador de la tarea                          → "collaborator"
 *   - la tarea no tiene responsable y él creó el PM       → "creator"
 */

export const DIAS_AVISO = 7;

export type NivelAlerta = "overdue" | "due_soon";
export type MotivoAlerta = "assigned" | "collaborator" | "creator";

export interface TareaParaAlerta {
  completada: boolean;
  fecha_limite: string | null; // AAAA-MM-DD
  asignado_a: string | null;
  colaboradores: string[];
}

export interface PmParaAlerta {
  estado: string;
  creado_por: string | null;
}

const MS_DIA = 24 * 60 * 60 * 1000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaValida(f: unknown): f is string {
  if (typeof f !== "string" || !FECHA.test(f)) return false;
  const [y, m, d] = f.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Días de `hoy` a `fecha` (negativo = ya pasó). Fechas AAAA-MM-DD, sin zona horaria. */
export function diasEntre(fecha: string, hoy: string): number {
  const a = fecha.split("-").map(Number);
  const b = hoy.split("-").map(Number);
  return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / MS_DIA);
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDiasISO(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Por qué le toca esta tarea al usuario (el motivo más directo), o null si no le toca. */
export function motivoParaUsuario(t: TareaParaAlerta, pm: PmParaAlerta, usuarioId: string): MotivoAlerta | null {
  if (t.asignado_a === usuarioId) return "assigned";
  if (t.colaboradores.includes(usuarioId)) return "collaborator";
  if (!t.asignado_a && pm.creado_por === usuarioId) return "creator";
  return null;
}

/** Nivel y días de la alerta de una tarea, o null si no amerita alerta. */
export function nivelAlerta(t: TareaParaAlerta, pm: PmParaAlerta, hoy: string): { nivel: NivelAlerta; dias: number } | null {
  if (t.completada || pm.estado !== "active" || !t.fecha_limite) return null;
  const dias = diasEntre(t.fecha_limite, hoy);
  if (dias < 0) return { nivel: "overdue", dias };
  if (dias <= DIAS_AVISO) return { nivel: "due_soon", dias };
  return null;
}

/**
 * Alerta de una tarea para un usuario. Con `usuarioId = null` (vista "todas")
 * se evalúa sin filtrar por destinatario.
 */
export function evaluarAlerta(
  t: TareaParaAlerta, pm: PmParaAlerta, hoy: string, usuarioId: string | null,
): { nivel: NivelAlerta; dias: number; motivo: MotivoAlerta | null } | null {
  const n = nivelAlerta(t, pm, hoy);
  if (!n) return null;
  const motivo = usuarioId ? motivoParaUsuario(t, pm, usuarioId) : null;
  if (usuarioId && !motivo) return null;
  return { ...n, motivo };
}

/** Orden: vencidas primero (la más atrasada arriba), luego por vencer (la más próxima arriba). */
export function compararAlertas(a: { nivel: NivelAlerta; dias: number }, b: { nivel: NivelAlerta; dias: number }): number {
  if (a.nivel !== b.nivel) return a.nivel === "overdue" ? -1 : 1;
  return a.dias - b.dias;
}
