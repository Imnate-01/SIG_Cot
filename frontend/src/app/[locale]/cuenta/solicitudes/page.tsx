"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import api from "@/services/api";
import { useAccesos } from "@/features/accesos/AccesosProvider";
import { areasSolicitables, type Area } from "@/features/accesos/areas";

/**
 * Solicitudes de acceso. Un usuario pide un área que no tiene; un
 * administrador del sistema ve aquí las pendientes de todos y las resuelve.
 */
type Estado = "pendiente" | "aprobada" | "rechazada";
interface Solicitud { id: string; area: Area; motivo: string | null; estado: Estado; creada_en: string; resuelta_en: string | null; nota: string | null }
interface SolicitudAdmin extends Solicitud { usuario?: { nombre: string | null; email: string } | null }

const mensajeError = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "";
const campo = "w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]";
const th = "border-b border-black dark:border-zinc-500 pb-2 pr-4 text-left text-xs font-semibold text-sig-muted";
const td = "border-b border-sig-line dark:border-zinc-800 py-3 pr-4 align-top";

const COLOR_ESTADO: Record<Estado, { fondo: string; punto: string }> = {
  pendiente: { fondo: "bg-sig-warning-soft", punto: "bg-sig-warning" },
  aprobada: { fondo: "bg-sig-success-soft", punto: "bg-sig-success" },
  rechazada: { fondo: "bg-sig-danger-soft", punto: "bg-sig-danger" },
};

function fecha(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function SolicitudesPage() {
  const t = useTranslations("Accesos");
  const { datos, recargar } = useAccesos();
  const esAdmin = !!datos?.esAdmin;

  const [mias, setMias] = useState<Solicitud[]>([]);
  const [porAprobar, setPorAprobar] = useState<SolicitudAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [area, setArea] = useState<Area | "">("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!datos) return;
    try {
      setCargando(true);
      if (datos.esAdmin) {
        const { data } = await api.get("/admin/usuarios/solicitudes");
        setPorAprobar(data.data || []);
      } else {
        const { data } = await api.get("/accesos/me/solicitudes");
        setMias(data.data || []);
      }
    } catch (e) {
      toast.error(t("errorLoad"), { description: mensajeError(e) });
    } finally {
      setCargando(false);
    }
  }, [datos, t]);

  useEffect(() => { cargar(); }, [cargar]);

  const opciones = useMemo(
    () => (datos ? areasSolicitables(datos, mias.filter((s) => s.estado === "pendiente").map((s) => s.area)) : []),
    [datos, mias],
  );

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!area) return toast.error(t("chooseArea"));
    try {
      setEnviando(true);
      await api.post("/accesos/me/solicitudes", { area, motivo });
      toast.success(t("sent"));
      setArea("");
      setMotivo("");
      cargar();
    } catch (err) {
      toast.error(t("errorSend"), { description: mensajeError(err) });
    } finally {
      setEnviando(false);
    }
  };

  const resolver = async (s: SolicitudAdmin, estado: "aprobada" | "rechazada") => {
    const nota = window.prompt(t("notePrompt", { nombre: s.usuario?.nombre || s.usuario?.email || "" }), "");
    if (nota === null) return; // canceló
    try {
      setResolviendo(s.id);
      await api.patch(`/admin/usuarios/solicitudes/${s.id}`, { estado, nota });
      toast.success(estado === "aprobada" ? t("approved") : t("rejected"));
      await Promise.all([cargar(), recargar()]);
    } catch (err) {
      toast.error(t("errorResolve"), { description: mensajeError(err) });
    } finally {
      setResolviendo(null);
    }
  };

  const chip = (estado: Estado) => (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-xs font-semibold text-black ${COLOR_ESTADO[estado].fondo}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${COLOR_ESTADO[estado].punto}`} aria-hidden="true" />
      {t(`status.${estado}`)}
    </span>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-5 sm:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-black dark:text-white">{t("requestsTitle")}</h1>
          <p className="mt-1 text-sm text-sig-muted">{esAdmin ? t("requestsSubtitleAdmin") : t("requestsSubtitle")}</p>
        </div>

        {!esAdmin && (
          <section className="rounded border border-sig-line dark:border-zinc-800 p-6">
            <h2 className="mb-4 text-lg font-bold text-black dark:text-white">{t("newRequest")}</h2>
            {opciones.length === 0 ? (
              <p className="text-sm text-sig-muted">{t("nothingToRequest")}</p>
            ) : (
              <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
                <div>
                  <label htmlFor="area" className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldArea")}</label>
                  <select id="area" value={area} onChange={(e) => setArea(e.target.value as Area)} className={`${campo} h-10`}>
                    <option value="">{t("chooseArea")}</option>
                    {opciones.map((a) => <option key={a} value={a}>{t(`areas.${a}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="motivo" className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldReason")}</label>
                  <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={2} placeholder={t("reasonPlaceholder")} className={`${campo} py-2`} />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button type="submit" disabled={enviando} className="inline-flex h-9 items-center gap-2 rounded bg-sig-blue px-4 text-sm font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60">
                    {enviando && <Loader2 size={16} className="animate-spin" />}{t("send")}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-black dark:text-white">{esAdmin ? t("toApprove") : t("mine")}</h2>
          {cargando ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sig-blue" /></div>
          ) : esAdmin ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr><th className={th}>{t("colUser")}</th><th className={th}>{t("colArea")}</th><th className={th}>{t("colReason")}</th><th className={th}>{t("colDate")}</th><th className={th}><span className="sr-only">—</span></th></tr></thead>
                <tbody>
                  {porAprobar.map((s) => (
                    <tr key={s.id}>
                      <td className={td}><div className="font-semibold text-black dark:text-white capitalize">{s.usuario?.nombre || "—"}</div><div className="text-xs text-sig-muted">{s.usuario?.email}</div></td>
                      <td className={td}>{t(`areas.${s.area}`)}</td>
                      <td className={`${td} text-sig-muted`}>{s.motivo || "—"}</td>
                      <td className={`${td} whitespace-nowrap text-sig-muted`}>{fecha(s.creada_en)}</td>
                      <td className={`${td} pr-0`}>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => resolver(s, "rechazada")} disabled={resolviendo === s.id} className="inline-flex h-8 items-center gap-1.5 rounded border border-sig-line-strong px-3 text-[13px] font-semibold hover:bg-sig-sand disabled:opacity-60"><X size={14} />{t("reject")}</button>
                          <button onClick={() => resolver(s, "aprobada")} disabled={resolviendo === s.id} className="inline-flex h-8 items-center gap-1.5 rounded bg-sig-blue px-3 text-[13px] font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60"><Check size={14} />{t("approve")}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {porAprobar.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sig-muted">{t("noPending")}</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr><th className={th}>{t("colArea")}</th><th className={th}>{t("colStatus")}</th><th className={th}>{t("colReason")}</th><th className={th}>{t("colNote")}</th><th className={`${th} text-right`}>{t("colDate")}</th></tr></thead>
                <tbody>
                  {mias.map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} font-semibold text-black dark:text-white`}>{t(`areas.${s.area}`)}</td>
                      <td className={td}>{chip(s.estado)}</td>
                      <td className={`${td} text-sig-muted`}>{s.motivo || "—"}</td>
                      <td className={`${td} text-sig-muted`}>{s.nota || "—"}</td>
                      <td className={`${td} whitespace-nowrap pr-0 text-right text-sig-muted`}>{fecha(s.creada_en)}</td>
                    </tr>
                  ))}
                  {mias.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sig-muted">{t("noRequests")}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
