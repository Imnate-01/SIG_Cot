"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, ChevronDown, ChevronRight, History, Loader2, Paperclip, Pencil, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import {
  agruparPorEtapa, etapaActual, formatearFecha, hoyISO, nombreUsuario, progreso, semaforoTarea,
  type PmDetalle, type PmTarea, type UsuarioPm,
} from "@/features/pm/pm";
import { Campo, EstadoBadge, btnPrimario, btnSecundario, campo } from "@/features/pm/ui";

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
        setAbiertas(new Set(actual !== null ? [actual] : []));
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
      await cargar();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      await cargar();
    }
  };

  const alternar = (tarea: PmTarea) => enviarTarea(tarea, { completada: !tarea.completada }, { completada: !tarea.completada });

  const guardarNotas = (tarea: PmTarea, texto: string) => {
    if (texto === (tarea.notas || "")) return;
    return enviarTarea(tarea, { notas: texto }, { notas: texto || null });
  };

  const agregarColaborador = async (tarea: PmTarea, usuarioId: string) => {
    if (!usuarioId || tarea.colaboradores.includes(usuarioId)) return;
    parchearTarea(tarea.id, { colaboradores: [...tarea.colaboradores, usuarioId] });
    try {
      await api.post(`/pm/${id}/tareas/${tarea.id}/colaboradores`, { usuario_id: usuarioId });
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
  const datos: Array<[string, string]> = [
    [t("fieldContact"), pm.contacto_nombre || "—"],
    [t("fieldPhone"), pm.contacto_telefono || "—"],
    [t("fieldEmail"), pm.contacto_correo || "—"],
    [t("fieldSam"), pm.sam || "—"],
    [t("fieldPo"), pm.po_numero || "—"],
    [t("fieldFseFiller"), pm.fse_filler || "—"],
    [t("fieldFseDownline"), pm.fse_downline || "—"],
    [t("fieldCreatedBy"), nombreUsuario(pm.usuarios, pm.creado_por)],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/pm" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sig-muted hover:text-black dark:hover:text-white">
        <ArrowLeft size={16} /> {t("backToList")}
      </Link>

      <section className="mb-6 rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-black dark:text-white">{pm.clientes?.nombre || "—"}</h1>
              <EstadoBadge tono={tonoPm} />
            </div>
            <p className="mt-1 text-sm text-sig-muted">{[pm.planta, pm.linea].filter(Boolean).join(" · ") || t("noPlantLine")}</p>
          </div>
          <button className={btnSecundario} onClick={() => setModalEditar(true)}><Pencil size={14} /> {t("editDetails")}</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-sig-muted">{t("colProgress")}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-black dark:text-white">{avance.completadas}/{avance.total} <span className="text-sm font-semibold text-sig-muted">({avance.porcentaje}%)</span></div>
            <div className="mt-1 text-xs text-sig-muted">{t("remaining", { count: avance.restantes })}{vencidas > 0 && <span className="font-semibold text-sig-danger"> · {t("overdueCount", { count: vencidas })}</span>}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sig-muted">{t("fieldStart")}</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-black dark:text-white">{formatearFecha(pm.fecha_inicio)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sig-muted">{t("fieldEnd")}</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-black dark:text-white">{formatearFecha(pm.fecha_fin)}</div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sig-line dark:bg-zinc-700">
          <div className={`h-full ${avance.restantes === 0 ? "bg-sig-success" : "bg-sig-blue"}`} style={{ width: `${avance.porcentaje}%` }} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-sig-line dark:border-zinc-700 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {datos.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-sig-muted">{k}</dt>
              <dd className="mt-0.5 break-words text-black dark:text-gray-200">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="space-y-3">
        {etapas.map((e) => {
          const abierta = abiertas.has(e.orden);
          const completa = e.completadas === e.tareas.length;
          return (
            <section key={e.orden} className="overflow-hidden rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <button
                className="flex w-full items-center gap-3 bg-sig-sand dark:bg-zinc-800 px-4 py-3 text-left"
                aria-expanded={abierta}
                onClick={() => setAbiertas((s) => { const n = new Set(s); if (n.has(e.orden)) n.delete(e.orden); else n.add(e.orden); return n; })}
              >
                {abierta ? <ChevronDown size={18} className="text-sig-muted" /> : <ChevronRight size={18} className="text-sig-muted" />}
                <span className="flex-1">
                  <span className="block text-sm font-bold uppercase tracking-wide text-black dark:text-white">{e.nombre}</span>
                  <span className="block text-xs text-sig-muted">{t("dueDate")}: <span className="font-semibold tabular-nums text-black dark:text-gray-200">{formatearFecha(e.fecha_limite)}</span></span>
                </span>
                <EstadoBadge tono={completa ? "done" : "no_date"} etiquetaPropia={`${e.completadas}/${e.tareas.length}`} />
              </button>

              {abierta && (
                <ul className="divide-y divide-sig-line dark:divide-zinc-700">
                  {e.tareas.map((tarea) => {
                    const sem = semaforoTarea(tarea, hoy);
                    const abiertaTarea = expandida === tarea.id;
                    return (
                      <li key={tarea.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <button
                            role="checkbox"
                            aria-checked={tarea.completada}
                            aria-label={`${tarea.codigo} ${tarea.titulo}`}
                            onClick={() => alternar(tarea)}
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors ${tarea.completada ? "border-sig-success bg-sig-success text-white" : "border-sig-line-strong bg-white dark:bg-zinc-800 hover:border-sig-blue"}`}
                          >
                            {tarea.completada && <Check size={16} strokeWidth={3} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-xs font-bold tabular-nums text-sig-muted">{tarea.codigo}</span>
                              <span className={`text-sm font-semibold ${tarea.completada ? "text-sig-muted line-through" : "text-black dark:text-white"}`}>{tarea.titulo}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                              <EstadoBadge tono={sem} etiquetaPropia={sem === "done" ? undefined : `${t("dueDate")} ${formatearFecha(tarea.fecha_limite)}`} />
                              {tarea.evidencia !== "none" && (
                                <span className="inline-flex items-center gap-1 rounded border border-sig-line-strong px-1.5 py-0.5 font-semibold text-black dark:text-gray-200" title={t("evidenceSoon")}>
                                  <Paperclip size={12} /> {tarea.evidencia === "required" ? t("evidenceRequired") : t("evidenceOptional")}
                                </span>
                              )}
                              {tarea.completada && (
                                <span className="text-sig-muted">
                                  {t("completedBy", { name: nombreUsuario(pm.usuarios, tarea.completada_por), date: tarea.completada_en ? formatearFecha(tarea.completada_en.slice(0, 10)) : "—" })}
                                </span>
                              )}
                              {tarea.colaboradores.length > 0 && (
                                <span className="text-sig-muted">+ {tarea.colaboradores.map((c) => nombreUsuario(pm.usuarios, c)).join(", ")}</span>
                              )}
                              {tarea.notas && !abiertaTarea && <span className="truncate text-sig-muted">“{tarea.notas}”</span>}
                            </div>
                          </div>
                          <button
                            className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-sig-blue hover:bg-sig-blue-soft dark:hover:bg-zinc-800"
                            aria-expanded={abiertaTarea}
                            onClick={() => setExpandida(abiertaTarea ? null : tarea.id)}
                          >
                            {abiertaTarea ? t("hideDetails") : t("details")}
                          </button>
                        </div>

                        {abiertaTarea && (
                          <div className="ml-9 mt-3 space-y-4 rounded bg-sig-sand/60 dark:bg-zinc-800/60 p-4">
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

                            <div>
                              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-sig-muted">{t("collaborators")}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {tarea.colaboradores.length === 0 && <span className="text-sm text-sig-muted">{t("noCollaborators")}</span>}
                                {tarea.colaboradores.map((c) => (
                                  <span key={c} className="inline-flex items-center gap-1 rounded bg-white dark:bg-zinc-800 border border-sig-line-strong px-2 py-1 text-xs font-semibold text-black dark:text-white">
                                    {nombreUsuario(pm.usuarios, c)}
                                    <button onClick={() => quitarColaborador(tarea, c)} aria-label={t("removeCollaborator", { name: nombreUsuario(pm.usuarios, c) })} className="text-sig-muted hover:text-sig-danger"><X size={12} /></button>
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <UserPlus size={16} className="text-sig-muted" />
                                <select
                                  className={`${campo} max-w-xs`}
                                  value=""
                                  onChange={(ev) => agregarColaborador(tarea, ev.target.value)}
                                  aria-label={t("addCollaborator")}
                                >
                                  <option value="">{t("addCollaborator")}</option>
                                  {usuariosLista.filter((u) => !tarea.colaboradores.includes(u.id) && u.id !== tarea.completada_por).map((u) => (
                                    <option key={u.id} value={u.id}>{u.nombre || u.email}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-sig-blue hover:underline" onClick={() => verHistorial(tarea)}>
                              <History size={14} /> {t("viewHistory")}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-black dark:text-white">{t("openNotes")}</h2>
        <p className="mb-3 text-xs text-sig-muted">{t("openNotesHint")}</p>
        <textarea
          key={pm.notas_abiertas || ""}
          className="min-h-[96px] w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
          defaultValue={pm.notas_abiertas || ""}
          onBlur={(e) => guardarNotasAbiertas(e.target.value.trim())}
        />
      </section>

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
