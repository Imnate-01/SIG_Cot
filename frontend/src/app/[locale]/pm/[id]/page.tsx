"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ChevronDown, Download, History, Loader2, Paperclip, Pencil, StickyNote, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import EvidenciasPanel from "@/features/pm/EvidenciasPanel";
import { avisarCambioAlertas } from "@/features/pm/useAlertasPm";
import {
  agruparPorEtapa, cuentaRegresiva, fechaEtapa, fechaLocalDe, estadoEtapa, estadoEvidencia, etapaActual, etiquetaSemana, formatearFecha, hoyISO, nombreUsuario, progreso, puedeCompletar, semaforoTarea,
  type PmDetalle, type PmTarea, type UsuarioPm,
} from "@/features/pm/pm";
import { Avatar, BarraEtapas, Campo, EstadoBadge, btnPrimario, btnSecundario, campo } from "@/features/pm/ui";

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTranslations("PM");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="flex items-center justify-between border-b border-sig-line dark:border-zinc-700 px-5 py-4">
          <h2 className="text-lg font-bold text-black dark:text-white">{titulo}</h2>
          <button onClick={onClose} className="rounded p-1 text-sig-muted hover:bg-sig-sand dark:hover:bg-zinc-800" aria-label={t("close")}><X size={18} /></button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

interface HistorialItem { id: number; usuario_id: string | null; accion: string; detalle: Record<string, unknown> | null; created_at: string }

export default function PmDetallePage() {
  const t = useTranslations("PM");
  const { id } = useParams<{ id: string }>();
  const [pm, setPm] = useState<PmDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<number>>(new Set());
  const [expandida, setExpandida] = useState<string | null>(null);
  const [usuariosLista, setUsuariosLista] = useState<UsuarioPm[]>([]);
  const [modalEditar, setModalEditar] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [historial, setHistorial] = useState<{ tarea: PmTarea; items: HistorialItem[]; usuarios: Record<string, UsuarioPm> } | null>(null);
  const hoy = hoyISO();

  const cargar = useCallback(async (inicial = false) => {
    try {
      const { data } = await api.get(`/pm/${id}`);
      const detalle: PmDetalle = data.data;
      setPm(detalle);
      setError(false);
      if (inicial) {
        const actual = etapaActual(agruparPorEtapa(detalle.tareas));
        // Enlace desde Alertas: /pm/<id>?tarea=<tarea> abre su etapa y la tarea
        const pedida = new URLSearchParams(window.location.search).get("tarea");
        const destino = pedida ? detalle.tareas.find((x) => x.id === pedida) : undefined;
        const abrir = new Set<number>(actual !== null ? [actual] : []);
        if (destino) {
          abrir.add(destino.etapa_orden);
          setExpandida(destino.id);
          setTimeout(() => document.getElementById(`tarea-${destino.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
        }
        setAbiertas(abrir);
      }
    } catch {
      if (inicial) setError(true);
      else toast.error(t("loadError"));
    } finally {
      setCargando(false);
    }
  }, [id, t]);

  useEffect(() => { cargar(true); }, [cargar]);
  useEffect(() => {
    api.get("/usuarios").then(({ data }) => setUsuariosLista(data.data || [])).catch(() => {});
  }, []);

  const etapas = useMemo(() => (pm ? agruparPorEtapa(pm.tareas) : []), [pm]);
  const avance = useMemo(() => progreso(pm?.tareas || []), [pm]);
  const vencidas = useMemo(() => (pm?.tareas || []).filter((x) => semaforoTarea(x, hoy) === "overdue").length, [pm, hoy]);

  /** Cambio local inmediato; si el servidor falla se vuelve a cargar el estado real. */
  const parchearTarea = (tareaId: string, cambios: Partial<PmTarea>) =>
    setPm((p) => (p ? { ...p, tareas: p.tareas.map((x) => (x.id === tareaId ? { ...x, ...cambios } : x)) } : p));

  const enviarTarea = async (tarea: PmTarea, cuerpo: Record<string, unknown>, local: Partial<PmTarea>) => {
    parchearTarea(tarea.id, local);
    try {
      await api.patch(`/pm/${id}/tareas/${tarea.id}`, cuerpo);
      avisarCambioAlertas();
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      await cargar();
    }
  };

  const alternar = (tarea: PmTarea) => {
    // Evidencia obligatoria: se pide antes de completar (el servidor también lo exige)
    if (!puedeCompletar(tarea)) {
      toast.warning(t("evidenceNeeded"));
      setExpandida(tarea.id);
      return;
    }
    return enviarTarea(tarea, { completada: !tarea.completada }, { completada: !tarea.completada });
  };

  const guardarNotas = (tarea: PmTarea, texto: string) => {
    if (texto === (tarea.notas || "")) return;
    return enviarTarea(tarea, { notas: texto }, { notas: texto || null });
  };

  const agregarColaborador = async (tarea: PmTarea, usuarioId: string) => {
    if (!usuarioId || tarea.colaboradores.includes(usuarioId)) return;
    parchearTarea(tarea.id, { colaboradores: [...tarea.colaboradores, usuarioId] });
    try {
      await api.post(`/pm/${id}/tareas/${tarea.id}/colaboradores`, { usuario_id: usuarioId });
      avisarCambioAlertas();
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      await cargar();
    }
  };

  const quitarColaborador = async (tarea: PmTarea, usuarioId: string) => {
    parchearTarea(tarea.id, { colaboradores: tarea.colaboradores.filter((c) => c !== usuarioId) });
    try {
      await api.delete(`/pm/${id}/tareas/${tarea.id}/colaboradores/${usuarioId}`);
      avisarCambioAlertas();
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      await cargar();
    }
  };

  const verHistorial = async (tarea: PmTarea) => {
    try {
      const { data } = await api.get(`/pm/${id}/tareas/${tarea.id}/historial`);
      setHistorial({ tarea, items: data.data || [], usuarios: data.usuarios || {} });
    } catch (e) {
      toast.error(mensajeError(e, t("loadError")));
    }
  };

  const guardarNotasAbiertas = async (texto: string) => {
    if (!pm || texto === (pm.notas_abiertas || "")) return;
    try {
      await api.patch(`/pm/${id}`, { notas_abiertas: texto });
      setPm((p) => (p ? { ...p, notas_abiertas: texto || null } : p));
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
    }
  };

  /** Reporte de cierre en PDF: se arma en el navegador (no carga al servidor). */
  const descargarReporte = async () => {
    if (!pm) return;
    setGenerandoPdf(true);
    try {
      const [{ pdf }, { default: ReportePmPDF }, { prepararReporte, nombreArchivoReporte }] = await Promise.all([
        import("@react-pdf/renderer"), import("@/features/pm/pdf/ReportePmPDF"), import("@/features/pm/reporte"),
      ]);
      const generado = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
      const blob = await pdf(<ReportePmPDF pm={pm} reporte={prepararReporte(pm, hoy)} generado={generado} logoUrl={`${window.location.origin}/SIG_logo.png`} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivoReporte(pm);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      console.error(e);
      toast.error(t("reportError"));
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (cargando) return <div className="flex items-center justify-center py-32 text-sig-muted"><Loader2 className="animate-spin" size={22} /></div>;
  if (error || !pm) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="mb-4 font-semibold text-black dark:text-white">{t("notFound")}</p>
        <Link href="/pm" className={btnSecundario}>{t("backToList")}</Link>
      </div>
    );
  }

  const tonoPm = pm.estado === "completed" ? "done" : pm.estado === "cancelled" ? "cancelled" : vencidas > 0 ? "overdue" : "on_track";
  const ordenActual = etapaActual(etapas);
  const etapasConVencidas = new Set(etapas.filter((e) => e.tareas.some((x) => semaforoTarea(x, hoy) === "overdue")).map((e) => e.orden));
  const faltaEvidencia = pm.tareas.filter((x) => estadoEvidencia(x) === "missing").length;
  const cuenta = cuentaRegresiva(pm.fecha_inicio, hoy);
  const cuentaNumero = cuenta.tipo === "hoy" ? t("countdownToday") : cuenta.unidad === "dias" ? t("countdownDays", { count: cuenta.valor }) : t("countdownWeeks", { count: cuenta.valor });
  const cuentaTexto = cuenta.tipo === "hoy" ? t("countdownIsToday") : cuenta.tipo === "antes" ? t("untilPmDay") : t("sincePmDay");
  const alternarEtapa = (orden: number) => setAbiertas((s) => { const n = new Set(s); if (n.has(orden)) n.delete(orden); else n.add(orden); return n; });
  const ficha: Array<{ titulo: string; filas: Array<[string, React.ReactNode]> }> = [
    { titulo: t("customerSection"), filas: [
      [t("shortContact"), pm.contacto_nombre || "—"],
      [t("shortPhone"), pm.contacto_telefono ? <a href={`tel:${pm.contacto_telefono}`} className="text-sig-blue hover:underline">{pm.contacto_telefono}</a> : "—"],
      [t("shortEmail"), pm.contacto_correo ? <a href={`mailto:${pm.contacto_correo}`} className="break-all text-sig-blue hover:underline">{pm.contacto_correo}</a> : "—"],
    ] },
    { titulo: t("teamSection"), filas: [
      [t("fieldSam"), pm.sam || "—"],
      [t("shortFseFiller"), pm.fse_filler || "—"],
      [t("shortFseDownline"), pm.fse_downline || "—"],
      [t("shortCreatedBy"), nombreUsuario(pm.usuarios, pm.creado_por)],
    ] },
    { titulo: t("orderSection"), filas: [
      [t("shortPo"), pm.po_numero || "—"],
      [t("shortStart"), formatearFecha(pm.fecha_inicio)],
      [t("shortEnd"), formatearFecha(pm.fecha_fin)],
    ] },
  ];

  const NODO: Record<string, string> = {
    done: "border-sig-success bg-sig-success text-white",
    overdue: "border-sig-danger bg-white dark:bg-zinc-900",
    current: "border-sig-blue bg-sig-blue-soft dark:bg-zinc-800 shadow-[0_0_0_4px_var(--sig-blue-focus)]",
    upcoming: "border-sig-line-strong bg-white dark:bg-zinc-900",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href="/pm" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sig-muted hover:text-black dark:hover:text-white">
        <ArrowLeft size={16} /> {t("backToList")}
      </Link>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold leading-tight text-black dark:text-white">{pm.clientes?.nombre || "—"}</h1>
            <EstadoBadge tono={tonoPm} />
          </div>
          <p className="mt-1 text-sm text-sig-muted">{[pm.planta, pm.linea].filter(Boolean).join(", ") || t("noPlantLine")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnSecundario} onClick={() => setModalEditar(true)}><Pencil size={14} /> {t("editDetails")}</button>
          <button className={btnPrimario} onClick={descargarReporte} disabled={generandoPdf}>
            {generandoPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {t("downloadReport")}
          </button>
        </div>
      </header>

      <section className="mb-6 grid overflow-hidden rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="border-b border-sig-line dark:border-zinc-700 p-5 sm:border-b-0 sm:border-r">
          <div className="text-4xl font-bold tabular-nums leading-none text-black dark:text-white">{cuentaNumero}</div>
          <div className="mt-2 text-sm text-sig-muted">{cuentaTexto}, {formatearFecha(pm.fecha_inicio)}</div>
        </div>
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-sm text-black dark:text-white">
              <span className="text-2xl font-bold tabular-nums">{avance.completadas}</span>
              <span className="text-sig-muted"> {t("ofTasksDone", { total: avance.total })}</span>
            </div>
            <div className="text-sm font-bold tabular-nums text-black dark:text-white">{avance.porcentaje}%</div>
          </div>
          <BarraEtapas etapas={etapas} conVencidas={etapasConVencidas} />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="text-sig-muted">{t("remaining", { count: avance.restantes })}</span>
            {vencidas > 0 && <span className="font-semibold text-sig-danger">{t("overdueCount", { count: vencidas })}</span>}
            {faltaEvidencia > 0 && <span className="font-semibold text-black dark:text-white">{t("missingEvidenceCount", { count: faltaEvidencia })}</span>}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ol aria-label={t("timelineLabel")}>
          {etapas.map((e, i) => {
            const abierta = abiertas.has(e.orden);
            const estado = estadoEtapa(e, hoy, ordenActual);
            const esDiaPm = e.semanas === 0;
            const ultima = i === etapas.length - 1;
            return (
              <li key={e.orden} className="grid grid-cols-1 gap-3 sm:grid-cols-[72px_minmax(0,1fr)]">
                <div className="hidden pt-3.5 text-right sm:block">
                  <div className={`text-sm font-bold tabular-nums ${esDiaPm ? "text-sig-blue" : "text-black dark:text-white"}`}>{etiquetaSemana(e.semanas)}</div>
                  <div className="text-[11px] tabular-nums text-sig-muted">{formatearFecha(fechaEtapa(pm.fecha_inicio, e.semanas)).replace(/, \d{4}$/, "")}</div>
                </div>
                <div className={`relative pl-7 ${ultima ? "" : "pb-4"}`}>
                  {!ultima && <span className="absolute bottom-0 left-[9px] top-5 w-px bg-sig-line-strong dark:bg-zinc-600" aria-hidden />}
                  <span
                    className={`absolute left-0 top-4 flex h-5 w-5 items-center justify-center border-2 ${esDiaPm ? "rotate-45 rounded-[3px]" : "rounded-full"} ${NODO[estado]}`}
                    aria-hidden
                  >
                    {estado === "done" && <Check size={12} strokeWidth={3} className={esDiaPm ? "-rotate-45" : ""} />}
                    {estado === "overdue" && <span className="h-2 w-2 rounded-full bg-sig-danger" />}
                  </span>

                  <section className={`overflow-hidden rounded border bg-white dark:bg-zinc-900 ${estado === "current" ? "border-sig-blue" : "border-sig-line dark:border-zinc-700"}`}>
                    <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sig-sand/50 dark:hover:bg-zinc-800" aria-expanded={abierta} onClick={() => alternarEtapa(e.orden)}>
                      <span className="min-w-0 flex-1">
                        <span className="mb-0.5 block text-xs font-bold tabular-nums text-sig-muted sm:hidden">{etiquetaSemana(e.semanas)}, {formatearFecha(fechaEtapa(pm.fecha_inicio, e.semanas))}</span>
                        <span className="block font-bold text-black dark:text-white">{e.nombre}</span>
                        <span className="mt-0.5 block text-xs text-sig-muted">
                          {estado === "done" ? t("stageDone") : estado === "overdue" ? <span className="font-semibold text-sig-danger">{t("stageOverdue")}</span> : estado === "current" ? t("stageCurrent") : t("stageUpcoming")}
                        </span>
                      </span>
                      <span className="text-sm font-bold tabular-nums text-black dark:text-white">{e.completadas}/{e.tareas.length}</span>
                      <ChevronDown size={18} className={`text-sig-muted transition-transform ${abierta ? "rotate-180" : ""}`} />
                    </button>

                    {abierta && (
                      <ul className="divide-y divide-sig-line border-t border-sig-line dark:divide-zinc-700 dark:border-zinc-700">
                        {e.tareas.map((tarea) => {
                          const sem = semaforoTarea(tarea, hoy);
                          const abiertaTarea = expandida === tarea.id;
                          const ee = estadoEvidencia(tarea);
                          const nEv = tarea.evidencias?.length ?? 0;
                          const responsable = tarea.completada ? tarea.completada_por : tarea.asignado_a;
                          return (
                            <li key={tarea.id} id={`tarea-${tarea.id}`} className="scroll-mt-24">
                              <div className={`flex items-start gap-3 px-4 py-3 ${abiertaTarea ? "bg-sig-sand/50 dark:bg-zinc-800/60" : ""}`}>
                                <button
                                  role="checkbox"
                                  aria-checked={tarea.completada}
                                  aria-label={`${tarea.codigo} ${tarea.titulo}`}
                                  onClick={() => alternar(tarea)}
                                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${tarea.completada ? "border-sig-success bg-sig-success text-white" : "border-sig-line-strong bg-white dark:bg-zinc-800 hover:border-sig-blue"}`}
                                >
                                  {tarea.completada && <Check size={16} strokeWidth={3} />}
                                </button>
                                <button className="min-w-0 flex-1 text-left" aria-expanded={abiertaTarea} onClick={() => setExpandida(abiertaTarea ? null : tarea.id)}>
                                  <span className="flex flex-wrap items-baseline gap-x-2">
                                    <span className="text-xs font-bold tabular-nums text-sig-muted">{tarea.codigo}</span>
                                    <span className={`text-sm font-semibold ${tarea.completada ? "text-sig-muted line-through" : "text-black dark:text-white"}`}>{tarea.titulo}</span>
                                  </span>
                                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                    {sem !== "done" && <EstadoBadge tono={sem} etiquetaPropia={`${t("dueDate")} ${formatearFecha(tarea.fecha_limite)}`} />}
                                    {(tarea.evidencia !== "none" || nEv > 0) && (
                                      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-semibold ${ee === "provided" ? "border-sig-success text-sig-success" : ee === "missing" ? "border-sig-danger text-sig-danger" : "border-sig-line-strong text-black dark:text-gray-200"}`}>
                                        <Paperclip size={12} />
                                        {ee === "provided" ? t("evidenceCount", { count: nEv }) : tarea.evidencia === "required" ? t("evidenceRequired") : t("evidenceOptional")}
                                      </span>
                                    )}
                                    {tarea.notas && <span className="inline-flex items-center gap-1 text-sig-muted" title={tarea.notas}><StickyNote size={12} /> {t("hasNote")}</span>}
                                  </span>
                                </button>
                                <span className="flex shrink-0 items-center gap-2 pt-0.5">
                                  {(responsable || tarea.colaboradores.some((c) => c !== responsable)) && (
                                    <span className="hidden items-center sm:flex">
                                      {responsable && <Avatar nombre={nombreUsuario(pm.usuarios, responsable)} tono={tarea.completada ? "hecho" : "neutro"} />}
                                      {tarea.colaboradores.filter((c) => c !== responsable).slice(0, 3).map((c) => <span key={c} className="-ml-1.5"><Avatar nombre={nombreUsuario(pm.usuarios, c)} /></span>)}
                                    </span>
                                  )}
                                  <button onClick={() => setExpandida(abiertaTarea ? null : tarea.id)} aria-label={abiertaTarea ? t("hideDetails") : t("details")} className="rounded p-1 text-sig-muted hover:bg-sig-sand dark:hover:bg-zinc-700">
                                    <ChevronDown size={16} className={`transition-transform ${abiertaTarea ? "rotate-180" : ""}`} />
                                  </button>
                                </span>
                              </div>

                              {abiertaTarea && (
                                <div className="grid gap-5 border-t border-sig-line dark:border-zinc-700 bg-sig-sand/50 dark:bg-zinc-800/60 px-4 pb-5 pt-4 sm:pl-[52px] md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                                  <div className="space-y-4">
                                    <Campo label={t("notes")}>
                                      <textarea
                                        key={tarea.notas || ""}
                                        className="min-h-[72px] w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
                                        defaultValue={tarea.notas || ""}
                                        maxLength={4000}
                                        placeholder={t("notesPlaceholder")}
                                        onBlur={(ev) => guardarNotas(tarea, ev.target.value.trim())}
                                      />
                                    </Campo>
                                    {(tarea.evidencia !== "none" || nEv > 0) && (
                                      <EvidenciasPanel pmId={pm.id} tarea={tarea} usuarios={pm.usuarios} onChange={() => cargar()} />
                                    )}
                                  </div>

                                  <div className="space-y-4">
                                    {tarea.completada ? (
                                      <div>
                                        <span className="mb-1 block text-xs font-semibold text-sig-muted">{t("completedSection")}</span>
                                        <div className="flex items-center gap-2 text-sm text-black dark:text-white">
                                          <Avatar nombre={nombreUsuario(pm.usuarios, tarea.completada_por)} tono="hecho" />
                                          <span>{t("completedBy", { name: nombreUsuario(pm.usuarios, tarea.completada_por), date: tarea.completada_en ? formatearFecha(fechaLocalDe(tarea.completada_en)) : "—" })}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <Campo label={t("responsible")}>
                                        <select
                                          className={campo}
                                          value={tarea.asignado_a || ""}
                                          onChange={(ev) => enviarTarea(tarea, { asignado_a: ev.target.value || null }, { asignado_a: ev.target.value || null })}
                                        >
                                          <option value="">{t("unassigned")}</option>
                                          {usuariosLista.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
                                        </select>
                                        <span className="mt-1 block text-xs text-sig-muted">{t("responsibleHint")}</span>
                                      </Campo>
                                    )}

                                    <div>
                                      <span className="mb-1 block text-xs font-semibold text-sig-muted">{t("collaborators")}</span>
                                      {tarea.colaboradores.length > 0 && (
                                        <ul className="mb-2 space-y-1.5">
                                          {tarea.colaboradores.map((c) => (
                                            <li key={c} className="flex items-center gap-2 text-sm text-black dark:text-white">
                                              <Avatar nombre={nombreUsuario(pm.usuarios, c)} />
                                              <span className="flex-1 truncate">{nombreUsuario(pm.usuarios, c)}</span>
                                              <button onClick={() => quitarColaborador(tarea, c)} aria-label={t("removeCollaborator", { name: nombreUsuario(pm.usuarios, c) })} className="rounded p-1 text-sig-muted hover:bg-sig-danger-soft hover:text-sig-danger dark:hover:bg-zinc-700"><X size={14} /></button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <div className="relative">
                                        <UserPlus size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-muted" />
                                        <select className={`${campo} pl-9`} value="" onChange={(ev) => agregarColaborador(tarea, ev.target.value)} aria-label={t("addCollaborator")}>
                                          <option value="">{t("addCollaborator")}</option>
                                          {usuariosLista.filter((u) => !tarea.colaboradores.includes(u.id) && u.id !== tarea.completada_por).map((u) => (
                                            <option key={u.id} value={u.id}>{u.nombre || u.email}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-sig-blue hover:underline" onClick={() => verHistorial(tarea)}>
                                      <History size={15} /> {t("viewHistory")}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="h-fit overflow-hidden rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 lg:sticky lg:top-6">
          {ficha.map((g) => (
            <section key={g.titulo} className="border-b border-sig-line dark:border-zinc-700 px-5 py-4">
              <h2 className="mb-2 text-sm font-bold text-black dark:text-white">{g.titulo}</h2>
              <dl className="space-y-2 text-sm">
                {g.filas.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                    <dt className="text-sig-muted">{k}</dt>
                    <dd className="break-words text-black dark:text-gray-200">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <section className="bg-sig-sand/60 dark:bg-zinc-800/60 px-5 py-4">
            <h2 className="text-sm font-bold text-black dark:text-white">{t("openNotesShort")}</h2>
            <p className="mb-2 mt-0.5 text-xs text-sig-muted">{t("openNotesShortHint")}</p>
            <textarea
              key={pm.notas_abiertas || ""}
              className="min-h-[120px] w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
              defaultValue={pm.notas_abiertas || ""}
              placeholder={t("openNotesPlaceholder")}
              onBlur={(e) => guardarNotasAbiertas(e.target.value.trim())}
            />
          </section>
        </aside>
      </div>

      {modalEditar && (
        <EditarModal pm={pm} onClose={() => setModalEditar(false)} onSaved={async () => { setModalEditar(false); await cargar(); }} />
      )}

      {historial && (
        <Modal titulo={`${historial.tarea.codigo} — ${t("history")}`} onClose={() => setHistorial(null)}>
          {historial.items.length === 0 ? (
            <p className="text-sm text-sig-muted">{t("noHistory")}</p>
          ) : (
            <ul className="space-y-3">
              {historial.items.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="font-semibold text-black dark:text-white">{t(`action_${h.accion}` as never)}</div>
                  <div className="text-xs text-sig-muted">
                    {nombreUsuario(historial.usuarios, h.usuario_id)} · {new Date(h.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  {h.accion === "due_date_changed" && h.detalle && (
                    <div className="text-xs tabular-nums text-sig-muted">{formatearFecha(String(h.detalle.from))} → {formatearFecha(String(h.detalle.to))}</div>
                  )}
                  {(h.accion === "collaborator_added" || h.accion === "collaborator_removed") && h.detalle?.usuario_id ? (
                    <div className="text-xs text-sig-muted">{nombreUsuario(historial.usuarios, String(h.detalle.usuario_id))}</div>
                  ) : null}
                  {(h.accion === "evidence_added" || h.accion === "evidence_removed") && h.detalle?.nombre ? <div className="text-xs text-sig-muted">{String(h.detalle.nombre)}</div> : null}
                  {h.accion === "note" && h.detalle?.notas ? <div className="text-xs italic text-sig-muted">“{String(h.detalle.notas)}”</div> : null}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function EditarModal({ pm, onClose, onSaved }: { pm: PmDetalle; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const t = useTranslations("PM");
  const [f, setF] = useState({
    planta: pm.planta || "", linea: pm.linea || "", contacto_nombre: pm.contacto_nombre || "",
    contacto_telefono: pm.contacto_telefono || "", contacto_correo: pm.contacto_correo || "",
    sam: pm.sam || "", po_numero: pm.po_numero || "", fse_filler: pm.fse_filler || "", fse_downline: pm.fse_downline || "",
    fecha_inicio: pm.fecha_inicio, fecha_fin: pm.fecha_fin || "",
  });
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const cambioFecha = f.fecha_inicio !== pm.fecha_inicio;
  const pendientes = pm.tareas.filter((x) => !x.completada).length;
  const finInvalido = !!f.fecha_fin && f.fecha_fin < f.fecha_inicio;

  const enviar = async (extra: Record<string, unknown> = {}) => {
    setGuardando(true);
    try {
      const { fecha_inicio, ...resto } = f;
      await api.patch(`/pm/${pm.id}`, { ...resto, ...(cambioFecha ? { fecha_inicio } : {}), ...extra });
      toast.success(t("saved"));
      avisarCambioAlertas();
      await onSaved();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={t("editDetails")} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label={t("fieldPlant")}><input className={campo} value={f.planta} onChange={set("planta")} /></Campo>
        <Campo label={t("fieldLine")}><input className={campo} value={f.linea} onChange={set("linea")} /></Campo>
        <Campo label={t("fieldContact")}><input className={campo} value={f.contacto_nombre} onChange={set("contacto_nombre")} /></Campo>
        <Campo label={t("fieldPhone")}><input className={campo} value={f.contacto_telefono} onChange={set("contacto_telefono")} /></Campo>
        <Campo label={t("fieldEmail")} className="sm:col-span-2"><input className={campo} type="email" value={f.contacto_correo} onChange={set("contacto_correo")} /></Campo>
        <Campo label={t("fieldSam")}><input className={campo} value={f.sam} onChange={set("sam")} /></Campo>
        <Campo label={t("fieldPo")}><input className={campo} value={f.po_numero} onChange={set("po_numero")} /></Campo>
        <Campo label={t("fieldFseFiller")}><input className={campo} value={f.fse_filler} onChange={set("fse_filler")} /></Campo>
        <Campo label={t("fieldFseDownline")}><input className={campo} value={f.fse_downline} onChange={set("fse_downline")} /></Campo>
        <Campo label={t("fieldStart")}><input type="date" required className={campo} value={f.fecha_inicio} onChange={set("fecha_inicio")} /></Campo>
        <Campo label={t("fieldEnd")}><input type="date" className={campo} min={f.fecha_inicio} value={f.fecha_fin} onChange={set("fecha_fin")} /></Campo>
      </div>
      {cambioFecha && (
        <p className="mt-3 rounded bg-sig-warning-soft dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white">{t("dateChangeWarning", { count: pendientes })}</p>
      )}
      {finInvalido && <p className="mt-2 text-sm font-semibold text-sig-danger" role="alert">{t("endBeforeStart")}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {pm.estado === "cancelled" ? (
          <button className={btnSecundario} disabled={guardando} onClick={() => enviar({ estado: "active" })}>{t("reactivatePm")}</button>
        ) : pm.estado === "active" ? (
          <button className={`${btnSecundario} text-sig-danger`} disabled={guardando} onClick={() => { if (window.confirm(t("cancelPmConfirm"))) enviar({ estado: "cancelled" }); }}>{t("cancelPm")}</button>
        ) : <span />}
        <div className="flex gap-3">
          <button className={btnSecundario} onClick={onClose}>{t("cancel")}</button>
          <button className={btnPrimario} disabled={guardando || finInvalido || !f.fecha_inicio} onClick={() => enviar()}>
            {guardando && <Loader2 size={16} className="animate-spin" />} {t("save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
