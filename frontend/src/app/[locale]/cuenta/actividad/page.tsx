"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

/** Mi actividad: inicios de sesión y cambios en la cuenta y en los accesos. */
interface Evento { id: number; accion: string; detalle: Record<string, unknown> | null; creada_en: string; por: string | null }

const CONOCIDOS = new Set([
  "inicio_sesion", "perfil_actualizado", "contrasena_cambiada", "contrasena_restablecida", "areas_actualizadas",
  "cuenta_activada", "cuenta_desactivada", "cuenta_creada", "solicitud_creada", "solicitud_aprobada", "solicitud_rechazada",
]);

export default function ActividadPage() {
  const t = useTranslations("Accesos");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get("/accesos/me/actividad")
      .then(({ data }) => setEventos(data.data || []))
      .catch(() => toast.error(t("errorLoad")))
      .finally(() => setCargando(false));
  }, [t]);

  const nombreArea = (a: unknown) => (typeof a === "string" && ["cotizaciones", "mantenimiento", "food_safety"].includes(a) ? t(`areas.${a}`) : String(a ?? ""));
  const lista = (v: unknown) => (Array.isArray(v) ? v.map(nombreArea).join(", ") : "");

  const describir = (e: Evento) => {
    const area = nombreArea(e.detalle?.area);
    return CONOCIDOS.has(e.accion) ? t(`events.${e.accion}`, { area }) : t("events.otro");
  };

  const extra = (e: Evento) => {
    if (e.accion !== "areas_actualizadas" || !e.detalle) return null;
    const partes = [];
    if (lista(e.detalle.agregadas)) partes.push(t("added", { lista: lista(e.detalle.agregadas) }));
    if (lista(e.detalle.quitadas)) partes.push(t("removed", { lista: lista(e.detalle.quitadas) }));
    return partes.join(" · ") || null;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-5 sm:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-black dark:text-white">{t("activityTitle")}</h1>
          <p className="mt-1 text-sm text-sig-muted">{t("activitySubtitle")}</p>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sig-blue" /></div>
        ) : eventos.length === 0 ? (
          <p className="border-t border-black dark:border-zinc-500 pt-6 text-sm text-sig-muted">{t("noActivity")}</p>
        ) : (
          <ol className="border-t border-black dark:border-zinc-500">
            {eventos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-sig-line dark:border-zinc-800 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-black dark:text-white">{describir(e)}</span>
                  {(extra(e) || e.por) && (
                    <span className="text-xs text-sig-muted">{[extra(e), e.por ? t("by", { nombre: e.por }) : null].filter(Boolean).join(" · ")}</span>
                  )}
                </div>
                <time dateTime={e.creada_en} className="whitespace-nowrap text-xs text-sig-muted">
                  {new Date(e.creada_en).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
