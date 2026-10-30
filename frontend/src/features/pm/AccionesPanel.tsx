"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import { avisarCambioAlertas } from "./useAlertasPm";
import { formatearFecha, hoyISO, nombreUsuario, ordenarAcciones, type PmAccion, type UsuarioPm } from "./pm";
import { Avatar, campo } from "./ui";

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const campoCompacto = campo.replace("h-10", "h-9");

/**
 * Acciones de seguimiento del PM (comentario 3): una lista de pendientes con
 * responsable y fecha compromiso, además del texto libre de Open notes.
 */
export default function AccionesPanel({
  pmId, acciones, disponibles, usuarios, usuariosLista, onChange,
}: {
  pmId: string;
  acciones: PmAccion[];
  disponibles: boolean;
  usuarios: Record<string, UsuarioPm>;
  usuariosLista: UsuarioPm[];
  onChange: () => Promise<void> | void;
}) {
  const t = useTranslations("PM");
  const [texto, setTexto] = useState("");
  const [asignado, setAsignado] = useState("");
  const [fecha, setFecha] = useState("");
  const [guardando, setGuardando] = useState(false);
  const hoy = hoyISO();
  const lista = ordenarAcciones(acciones);
  const pendientes = acciones.filter((a) => !a.completada).length;

  const ejecutar = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      avisarCambioAlertas();
      await onChange();
      return true;
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
      return false;
    }
  };

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    const ok = await ejecutar(() => api.post(`/pm/${pmId}/acciones`, { texto: texto.trim(), asignado_a: asignado || null, fecha_limite: fecha || null }));
    if (ok) { setTexto(""); setAsignado(""); setFecha(""); }
    setGuardando(false);
  };

  if (!disponibles) {
    return <p className="mt-3 rounded bg-sig-warning-soft dark:bg-zinc-800 px-3 py-2 text-xs text-black dark:text-white">{t("actionsNotEnabled")}</p>;
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-black dark:text-white">{t("actionsTitle")}</h3>
        {acciones.length > 0 && <span className="text-xs text-sig-muted">{t("actionsPending", { count: pendientes })}</span>}
      </div>

      {lista.length > 0 && (
        <ul className="mb-3 divide-y divide-sig-line dark:divide-zinc-700 rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900">
          {lista.map((a) => {
            const vencida = !a.completada && !!a.fecha_limite && a.fecha_limite < hoy;
            return (
              <li key={a.id} className="flex items-start gap-2 px-3 py-2">
                <button
                  role="checkbox" aria-checked={a.completada} aria-label={a.texto}
                  onClick={() => ejecutar(() => api.patch(`/pm/${pmId}/acciones/${a.id}`, { completada: !a.completada }))}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${a.completada ? "border-sig-success bg-sig-success text-white" : "border-sig-line-strong bg-white dark:bg-zinc-800 hover:border-sig-blue"}`}
                >
                  {a.completada && <Check size={13} strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`whitespace-pre-wrap break-words text-sm ${a.completada ? "text-sig-muted line-through" : "text-black dark:text-white"}`}>{a.texto}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <select
                      aria-label={t("responsible")}
                      className="h-7 max-w-[160px] rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 text-xs text-black dark:text-white"
                      value={a.asignado_a || ""}
                      onChange={(ev) => ejecutar(() => api.patch(`/pm/${pmId}/acciones/${a.id}`, { asignado_a: ev.target.value || null }))}
                    >
                      <option value="">{t("unassigned")}</option>
                      {a.asignado_a && !usuariosLista.some((u) => u.id === a.asignado_a) && <option value={a.asignado_a} disabled>{usuariosLista.length ? t("noLongerHasAccess", { name: nombreUsuario(usuarios, a.asignado_a) }) : nombreUsuario(usuarios, a.asignado_a)}</option>}
                      {usuariosLista.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
                    </select>
                    {a.fecha_limite && (
                      <span className={vencida ? "font-semibold text-sig-danger" : "text-sig-muted"}>{t("dueDate")} {formatearFecha(a.fecha_limite)}</span>
                    )}
                    {a.completada && a.completada_por && (
                      <span className="inline-flex items-center gap-1 text-sig-muted"><Avatar nombre={nombreUsuario(usuarios, a.completada_por)} tono="hecho" /> {nombreUsuario(usuarios, a.completada_por)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { if (window.confirm(t("deleteActionConfirm"))) ejecutar(() => api.delete(`/pm/${pmId}/acciones/${a.id}`)); }}
                  aria-label={t("deleteAction")}
                  className="rounded p-1 text-sig-muted hover:bg-sig-danger-soft hover:text-sig-danger dark:hover:bg-zinc-700"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={agregar} className="space-y-2">
        <input className={campoCompacto} value={texto} maxLength={1000} onChange={(e) => setTexto(e.target.value)} placeholder={t("actionPlaceholder")} aria-label={t("actionPlaceholder")} />
        <div className="grid grid-cols-2 gap-2">
          <select className={campoCompacto} value={asignado} onChange={(e) => setAsignado(e.target.value)} aria-label={t("responsible")}>
            <option value="">{t("assignTo")}</option>
            {usuariosLista.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
          </select>
          <input type="date" className={campoCompacto} value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label={t("actionDueDate")} />
        </div>
        <button type="submit" disabled={guardando || !texto.trim()} className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-sig-blue px-3 text-xs font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60">
          {guardando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {t("addAction")}
        </button>
      </form>
    </div>
  );
}
