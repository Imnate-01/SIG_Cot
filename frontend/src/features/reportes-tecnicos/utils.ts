/** Utilidades del formulario de reporte técnico (TSR). */

export const todayISO = () => new Date().toISOString().split("T")[0];
export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");
export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function safeParse<T>(v: string | null): T | null {
  try {
    if (!v) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}
