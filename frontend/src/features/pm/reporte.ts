import { agruparPorEtapa, formatearFecha, nombreUsuario, progreso, semaforoTarea, type PmDetalle } from "./pm";

/** Estado de una tarea tal como se imprime en el reporte. */
export type EstadoReporte = "Completed" | "Overdue" | "Due soon" | "Pending";

export interface FilaReporte {
  codigo: string;
  titulo: string;
  fecha: string;          // fecha límite ya formateada
  estado: EstadoReporte;
  responsable: string;    // quién la completó, o el responsable asignado si sigue pendiente
  cuando: string;         // fecha en que se completó
  colaboradores: string;
  evidencias: string;     // "2 files, 1 link" / "Required — missing" / ""
  notas: string;
}

export interface EtapaReporte { nombre: string; fecha: string; completadas: number; total: number; filas: FilaReporte[] }

export interface Reporte {
  resumen: { total: number; completadas: number; porcentaje: number; restantes: number; vencidas: number; archivos: number; enlaces: number; cotizaciones: number; faltaEvidencia: number };
  etapas: EtapaReporte[];
}

const ESTADO: Record<string, EstadoReporte> = { done: "Completed", overdue: "Overdue", due_soon: "Due soon", on_track: "Pending", no_date: "Pending" };

function textoEvidencias(t: PmDetalle["tareas"][number]): string {
  const ev = t.evidencias ?? [];
  const archivos = ev.filter((e) => e.tipo === "file").length;
  const enlaces = ev.filter((e) => e.tipo === "link").length;
  const cot = ev.filter((e) => e.tipo === "quote").length;
  const partes = [
    archivos ? `${archivos} file${archivos === 1 ? "" : "s"}` : "",
    enlaces ? `${enlaces} link${enlaces === 1 ? "" : "s"}` : "",
    cot ? `${cot} quote${cot === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  if (partes.length) return partes.join(", ");
  if (t.evidencia === "required") return "Missing (required)";
  return "";
}

/** Datos del reporte de un PM (sin React): lo que el PDF imprime, ya calculado. */
export function prepararReporte(pm: PmDetalle, hoy: string): Reporte {
  const avance = progreso(pm.tareas);
  const todas = pm.tareas.flatMap((t) => t.evidencias ?? []);
  const etapas = agruparPorEtapa(pm.tareas).map((e) => ({
    nombre: e.nombre,
    fecha: formatearFecha(e.fecha_limite),
    completadas: e.completadas,
    total: e.tareas.length,
    filas: e.tareas.map((t) => ({
      codigo: t.codigo,
      titulo: t.titulo,
      fecha: formatearFecha(t.fecha_limite),
      estado: ESTADO[semaforoTarea(t, hoy)],
      responsable: t.completada ? nombreUsuario(pm.usuarios, t.completada_por) : t.asignado_a ? nombreUsuario(pm.usuarios, t.asignado_a) : "",
      cuando: t.completada && t.completada_en ? formatearFecha(t.completada_en.slice(0, 10)) : "",
      colaboradores: t.colaboradores.map((c) => nombreUsuario(pm.usuarios, c)).join(", "),
      evidencias: textoEvidencias(t),
      notas: t.notas || "",
    })),
  }));
  return {
    resumen: {
      total: avance.total,
      completadas: avance.completadas,
      porcentaje: avance.porcentaje,
      restantes: avance.restantes,
      vencidas: pm.tareas.filter((t) => semaforoTarea(t, hoy) === "overdue").length,
      archivos: todas.filter((e) => e.tipo === "file").length,
      enlaces: todas.filter((e) => e.tipo === "link").length,
      cotizaciones: todas.filter((e) => e.tipo === "quote").length,
      faltaEvidencia: pm.tareas.filter((t) => t.evidencia === "required" && !(t.evidencias?.length)).length,
    },
    etapas,
  };
}

/** Nombre del archivo: PM_<cliente>_<planta>_<fecha de inicio>.pdf, sin caracteres raros. */
export function nombreArchivoReporte(pm: Pick<PmDetalle, "clientes" | "planta" | "fecha_inicio">): string {
  const limpio = (s: string | null | undefined) =>
    (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return ["PM", limpio(pm.clientes?.nombre), limpio(pm.planta), pm.fecha_inicio].filter(Boolean).join("_") + ".pdf";
}
