"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BellOff, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import { formatearFecha, hoyISO } from "@/features/pm/pm";
import type { MotivoAlerta, NivelAlerta } from "@/features/pm/alertas";
import { EstadoBadge, btnSecundario } from "@/features/pm/ui";

interface Alerta {
  tarea_id: string; codigo: string; titulo: string; etapa: string; fecha_limite: string;
  expediente_id: string; cliente: string | null; empresa: string | null; planta: string | null; linea: string | null;
  nivel: NivelAlerta; dias: number; motivo: MotivoAlerta | null;
}
type Alcance = "mias" | "todas";

/** Alertas del PM Tracker: tareas vencidas o por vencer (7 días) de los PM activos. */
export default function PmAlertasPage() {
  const t = useTranslations("PM");
  const [alcance, setAlcance] = useState<Alcance>("mias");
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async (a: Alcance) => {
    try {
      const { data } = await api.get("/pm/alertas", { params: { hoy: hoyISO(), alcance: a } });
      setError(false);
      setAlertas(data.data || []);
    } catch {
      setError(true);
      setAlertas([]);
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => cargar(alcance), 0);
    return () => clearTimeout(id);
  }, [alcance, cargar]);

  const vencidas = (alertas || []).filter((a) => a.nivel === "overdue");
  const porVencer = (alertas || []).filter((a) => a.nivel === "due_soon");

  const cuando = (a: Alerta) =>
    a.nivel === "overdue" ? t("daysOverdue", { count: -a.dias }) : a.dias === 0 ? t("dueToday") : t("dueInDays", { count: a.dias });

  const grupo = (titulo: string, lista: Alerta[], tono: "overdue" | "due_soon") => (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-black dark:text-white">
        {titulo} <EstadoBadge tono={tono} etiquetaPropia={String(lista.length)} />
      </h2>
      {lista.length === 0 ? (
        <p className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-4 text-sm text-sig-muted">{t("noAlertsInGroup")}</p>
      ) : (
        <ul className="divide-y divide-sig-line dark:divide-zinc-700 overflow-hidden rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900">
          {lista.map((a) => (
            <li key={a.tarea_id}>
              <Link href={`/pm/${a.expediente_id}?tarea=${a.tarea_id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-sig-sand/60 dark:hover:bg-zinc-800">
                <span className={`h-9 w-1 shrink-0 rounded-full ${a.nivel === "overdue" ? "bg-sig-danger" : "bg-sig-warning"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-bold tabular-nums text-sig-muted">{a.codigo}</span>
                    <span className="text-sm font-semibold text-black dark:text-white">{a.titulo}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-sig-muted">
                    <span className="font-semibold text-black dark:text-gray-200">{a.cliente || "—"}</span>
                    {[a.planta, a.linea].filter(Boolean).length > 0 && <> · {[a.planta, a.linea].filter(Boolean).join(" · ")}</>}
                    {a.motivo && <> · {t(`reason_${a.motivo}`)}</>}
                  </div>
                  <div className={`mt-1 text-xs font-bold tabular-nums sm:hidden ${a.nivel === "overdue" ? "text-sig-danger" : "text-black dark:text-white"}`}>{cuando(a)} · {formatearFecha(a.fecha_limite)}</div>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className={`text-sm font-bold tabular-nums ${a.nivel === "overdue" ? "text-sig-danger" : "text-black dark:text-white"}`}>{cuando(a)}</div>
                  <div className="text-xs tabular-nums text-sig-muted">{formatearFecha(a.fecha_limite)}</div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-sig-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-black dark:text-white">{t("alertsTitle")}</h1>
          <p className="mt-1 text-sm text-sig-muted">{t("alertsSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-sig-line-strong dark:border-zinc-700 p-0.5" role="group" aria-label={t("alertsScope")}>
            {(["mias", "todas"] as const).map((a) => (
              <button key={a} onClick={() => { setAlertas(null); setAlcance(a); }} aria-pressed={alcance === a}
                className={`rounded px-3 py-1.5 text-sm font-semibold ${alcance === a ? "bg-sig-blue text-white" : "text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-800"}`}>
                {a === "mias" ? t("scopeMine") : t("scopeAll")}
              </button>
            ))}
          </div>
          <button className={btnSecundario} onClick={() => { setAlertas(null); cargar(alcance); }} aria-label={t("refresh")}><RefreshCw size={14} /></button>
        </div>
      </div>

      {alertas === null ? (
        <div className="flex justify-center py-20 text-sig-muted"><Loader2 className="animate-spin" size={22} /></div>
      ) : error ? (
        <div className="rounded border border-sig-danger bg-sig-danger-soft dark:bg-zinc-900 px-4 py-6 text-center text-sm font-semibold text-sig-danger">{t("loadError")}</div>
      ) : alertas.length === 0 ? (
        <div className="rounded border border-dashed border-sig-line-strong dark:border-zinc-700 px-4 py-16 text-center">
          <BellOff className="mx-auto mb-3 text-sig-muted" size={32} />
          <p className="font-semibold text-black dark:text-white">{t("noAlertsTitle")}</p>
          <p className="mt-1 text-sm text-sig-muted">{alcance === "mias" ? t("noAlertsMine") : t("noAlertsAll")}</p>
        </div>
      ) : (
        <>
          {grupo(t("groupOverdue"), vencidas, "overdue")}
          {grupo(t("groupDueSoon"), porVencer, "due_soon")}
        </>
      )}

      <p className="mt-2 text-xs text-sig-muted">{t("alertsRules")}</p>
    </div>
  );
}
