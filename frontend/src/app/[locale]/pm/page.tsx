"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCheck, Loader2, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import { formatearFecha, hoyISO, semaforoPm, type PmResumen } from "@/features/pm/pm";
import { BarraProgreso, EstadoBadge, btnPrimario, campo } from "@/features/pm/ui";

type Filtro = "active" | "completed" | "cancelled" | "all";

/** Lista de PMs: un renglón por PM de cada cliente, con avance y semáforo. */
export default function PmListaPage() {
  const t = useTranslations("PM");
  const [pms, setPms] = useState<PmResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("active");
  const hoy = hoyISO();

  const cargar = useCallback(async () => {
    setError(false);
    try {
      const { data } = await api.get("/pm");
      setPms(data.data || []);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const resumen = useMemo(() => {
    const activos = pms.filter((p) => p.estado === "active");
    const sem = activos.map((p) => semaforoPm(p, hoy));
    return {
      active: activos.length,
      overdue: sem.filter((s) => s === "overdue").length,
      dueSoon: sem.filter((s) => s === "due_soon").length,
      completed: pms.filter((p) => p.estado === "completed").length,
    };
  }, [pms, hoy]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return pms.filter((p) => {
      if (filtro !== "all" && p.estado !== filtro) return false;
      if (!q) return true;
      return [p.clientes?.nombre, p.clientes?.empresa, p.planta, p.linea, p.po_numero, p.sam]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [pms, busqueda, filtro]);

  const tarjetas = [
    { clave: "active", valor: resumen.active, etiqueta: t("statActive"), color: "text-black dark:text-white" },
    { clave: "overdue", valor: resumen.overdue, etiqueta: t("statOverdue"), color: "text-sig-danger" },
    { clave: "dueSoon", valor: resumen.dueSoon, etiqueta: t("statDueSoon"), color: "text-black dark:text-white" },
    { clave: "completed", valor: resumen.completed, etiqueta: t("statCompleted"), color: "text-sig-success" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">{t("title")}</h1>
          <p className="mt-1 text-sm text-sig-muted">{t("subtitle")}</p>
        </div>
        <Link href="/pm/nuevo" className={btnPrimario}><Plus size={16} /> {t("newPm")}</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tarjetas.map((c) => (
          <div key={c.clave} className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
            <div className={`text-2xl font-bold tabular-nums ${c.color}`}>{c.valor}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-sig-muted">{c.etiqueta}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-muted" />
          <input className={`${campo} pl-9`} placeholder={t("searchPlaceholder")} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={t("searchPlaceholder")} />
        </div>
        <select className={`${campo} sm:w-48`} value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label={t("filterStatus")}>
          <option value="active">{t("filterActive")}</option>
          <option value="completed">{t("filterCompleted")}</option>
          <option value="cancelled">{t("filterCancelled")}</option>
          <option value="all">{t("filterAll")}</option>
        </select>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20 text-sig-muted"><Loader2 className="animate-spin" size={22} /></div>
      ) : error ? (
        <div className="rounded border border-sig-danger bg-sig-danger-soft dark:bg-zinc-900 px-4 py-6 text-center text-sm">
          <p className="mb-3 font-semibold text-sig-danger">{t("loadError")}</p>
          <button className="rounded border border-sig-line-strong bg-white px-3 py-1.5 text-sm font-semibold text-black" onClick={() => { setCargando(true); cargar(); }}>{t("retry")}</button>
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded border border-dashed border-sig-line-strong dark:border-zinc-700 px-4 py-16 text-center">
          <ClipboardCheck className="mx-auto mb-3 text-sig-muted" size={32} />
          <p className="font-semibold text-black dark:text-white">{pms.length === 0 ? t("emptyTitle") : t("noResults")}</p>
          {pms.length === 0 && <p className="mt-1 text-sm text-sig-muted">{t("emptyBody")}</p>}
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-sig-sand dark:bg-zinc-800 text-left text-xs font-semibold uppercase tracking-wide text-sig-muted">
              <tr>
                <th className="px-4 py-2.5">{t("colCustomer")}</th>
                <th className="px-4 py-2.5">{t("colPlantLine")}</th>
                <th className="px-4 py-2.5">{t("colPmDate")}</th>
                <th className="px-4 py-2.5">{t("colProgress")}</th>
                <th className="px-4 py-2.5">{t("colNextDue")}</th>
                <th className="px-4 py-2.5">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id} className="border-t border-sig-line dark:border-zinc-700 hover:bg-sig-sand/60 dark:hover:bg-zinc-800">
                  <td className="px-4 py-3">
                    <Link href={`/pm/${p.id}`} className="font-bold text-black dark:text-white hover:text-sig-blue">{p.clientes?.nombre || "—"}</Link>
                    {p.po_numero && <div className="text-xs text-sig-muted">PO {p.po_numero}</div>}
                  </td>
                  <td className="px-4 py-3 text-black dark:text-gray-200">{[p.planta, p.linea].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatearFecha(p.fecha_inicio)}</td>
                  <td className="px-4 py-3"><BarraProgreso completadas={p.progreso.completadas} total={p.progreso.total} vencidas={p.progreso.vencidas} /></td>
                  <td className="px-4 py-3 tabular-nums">{p.estado === "active" ? formatearFecha(p.progreso.proxima_fecha) : "—"}</td>
                  <td className="px-4 py-3"><EstadoBadge tono={semaforoPm(p, hoy)} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-sig-line dark:divide-zinc-700 md:hidden">
            {visibles.map((p) => (
              <li key={p.id}>
                <Link href={`/pm/${p.id}`} className="block px-4 py-3 hover:bg-sig-sand/60 dark:hover:bg-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-black dark:text-white">{p.clientes?.nombre || "—"}</span>
                    <EstadoBadge tono={semaforoPm(p, hoy)} />
                  </div>
                  <div className="mt-0.5 text-xs text-sig-muted">{[p.planta, p.linea].filter(Boolean).join(" · ") || "—"} · {formatearFecha(p.fecha_inicio)}</div>
                  <div className="mt-2"><BarraProgreso completadas={p.progreso.completadas} total={p.progreso.total} vencidas={p.progreso.vencidas} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
