"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, ChevronRight, ClipboardCheck, GitCompareArrows, Loader2, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import { cuentaRegresiva, formatearFecha, hoyISO, semaforoPm, type PmResumen } from "@/features/pm/pm";
import { useAlertasPm } from "@/features/pm/useAlertasPm";
import { BarraProgreso, EstadoBadge, btnPrimario, btnSecundario, campo } from "@/features/pm/ui";

type Filtro = "active" | "attention" | "completed" | "cancelled" | "all";

/** Lista de PMs: pestañas por estado (con conteo), búsqueda y una fila por PM con su cuenta regresiva. */
export default function PmListaPage() {
  const t = useTranslations("PM");
  const tNav = useTranslations("Sidebar");
  const [pms, setPms] = useState<PmResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("active");
  const alertas = useAlertasPm();
  const hoy = hoyISO();

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/pm");
      setPms(data.data || []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(cargar, 0);
    return () => clearTimeout(id);
  }, [cargar]);

  const pide = useCallback((p: PmResumen) => { const s = semaforoPm(p, hoy); return s === "overdue" || s === "due_soon"; }, [hoy]);
  const conteo: Record<Filtro, number> = useMemo(() => ({
    active: pms.filter((p) => p.estado === "active").length,
    attention: pms.filter(pide).length,
    completed: pms.filter((p) => p.estado === "completed").length,
    cancelled: pms.filter((p) => p.estado === "cancelled").length,
    all: pms.length,
  }), [pms, pide]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pms.filter((p) => {
      if (filtro === "attention" ? !pide(p) : filtro !== "all" && p.estado !== filtro) return false;
      if (!q) return true;
      return [p.clientes?.nombre, p.clientes?.empresa, p.planta, p.linea, p.po_numero, p.sam].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [pms, busqueda, filtro, pide]);

  const cuando = (p: PmResumen) => {
    const c = cuentaRegresiva(p.fecha_inicio, hoy);
    if (c.tipo === "hoy") return t("countdownToday");
    const v = c.unidad === "dias" ? t("countdownDays", { count: c.valor }) : t("countdownWeeks", { count: c.valor });
    return c.tipo === "antes" ? t("pmIn", { when: v }) : t("pmAgo", { when: v });
  };

  const pestañas: Array<[Filtro, string]> = [
    ["active", t("filterActive")], ["attention", t("tabNeedsAttention")], ["completed", t("filterCompleted")], ["cancelled", t("filterCancelled")], ["all", t("filterAll")],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-black dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-sig-muted">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pm/alertas" className={btnSecundario}>
            <Bell size={15} /> {t("alertsButton")}
            {!!alertas?.total && (
              <span className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white ${alertas.overdue > 0 ? "bg-sig-danger" : "bg-sig-blue"}`}>{alertas.total}</span>
            )}
          </Link>
          <Link href="/bom" className={btnSecundario}><GitCompareArrows size={15} /> {tNav("compareBoms")}</Link>
          <Link href="/pm/nuevo" className={btnPrimario}><Plus size={16} /> {t("newPm")}</Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-sig-line dark:border-zinc-700">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label={t("filterStatus")}>
          {pestañas.map(([k, etiqueta]) => {
            const on = filtro === k;
            return (
              <button key={k} onClick={() => setFiltro(k)} aria-pressed={on}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${on ? "border-sig-blue text-black dark:text-white" : "border-transparent text-sig-muted hover:text-black dark:hover:text-white"}`}>
                {etiqueta}
                <span className={`rounded px-1.5 text-xs tabular-nums ${on ? "bg-sig-blue text-white" : k === "attention" && conteo.attention > 0 ? "bg-sig-danger-soft text-sig-danger dark:bg-zinc-800" : "bg-sig-sand text-sig-muted dark:bg-zinc-800"}`}>{conteo[k]}</span>
              </button>
            );
          })}
        </nav>
        <div className="relative mb-2 w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-muted" />
          <input className={`${campo} pl-9`} placeholder={t("searchPlaceholder")} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={t("searchPlaceholder")} />
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20 text-sig-muted"><Loader2 className="animate-spin" size={22} /></div>
      ) : error ? (
        <div className="rounded border border-sig-danger bg-sig-danger-soft dark:bg-zinc-900 px-4 py-6 text-center text-sm">
          <p className="mb-3 font-semibold text-sig-danger">{t("loadError")}</p>
          <button className={btnSecundario} onClick={() => { setCargando(true); cargar(); }}>{t("retry")}</button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded border border-dashed border-sig-line-strong dark:border-zinc-700 px-4 py-16 text-center">
          <ClipboardCheck className="mx-auto mb-3 text-sig-muted" size={32} />
          <p className="font-semibold text-black dark:text-white">{pms.length === 0 ? t("emptyTitle") : t("noResults")}</p>
          {pms.length === 0 && (
            <>
              <p className="mt-1 text-sm text-sig-muted">{t("emptyBody")}</p>
              <Link href="/pm/nuevo" className={`${btnPrimario} mt-4`}><Plus size={16} /> {t("newPm")}</Link>
            </>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-sig-line overflow-hidden rounded border border-sig-line dark:divide-zinc-700 dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <li className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_120px_20px] gap-4 bg-sig-sand dark:bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-sig-muted md:grid" aria-hidden>
            <span>{t("colCustomer")}</span><span>{t("colPmDate")}</span><span>{t("colProgress")}</span><span>{t("colNextDue")}</span><span>{t("colStatus")}</span><span />
          </li>
          {visibles.map((p) => {
            const tono = semaforoPm(p, hoy);
            return (
              <li key={p.id}>
                <Link href={`/pm/${p.id}`} className="group grid gap-2 px-5 py-4 hover:bg-sig-sand/50 dark:hover:bg-zinc-800 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_120px_20px] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-black group-hover:text-sig-blue dark:text-white">{p.clientes?.nombre || "—"}</div>
                    <div className="truncate text-xs text-sig-muted">{[p.planta, p.linea].filter(Boolean).join(", ") || "—"}{p.po_numero ? `, ${/^po/i.test(p.po_numero) ? "" : "PO "}${p.po_numero}` : ""}</div>
                  </div>
                  <div className="text-sm">
                    <div className="tabular-nums text-black dark:text-gray-200">{formatearFecha(p.fecha_inicio)}</div>
                    <div className="text-xs text-sig-muted">{p.estado === "active" ? cuando(p) : ""}</div>
                  </div>
                  <BarraProgreso completadas={p.progreso.completadas} total={p.progreso.total} vencidas={p.progreso.vencidas} />
                  <div className="text-sm tabular-nums text-black dark:text-gray-200">{p.estado === "active" ? formatearFecha(p.progreso.proxima_fecha) : "—"}</div>
                  <div><EstadoBadge tono={tono} /></div>
                  <ChevronRight size={16} className="hidden text-sig-muted md:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
