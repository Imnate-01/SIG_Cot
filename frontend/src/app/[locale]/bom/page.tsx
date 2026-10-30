"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, ChevronRight, Download, FileText, Info, Lock, Search } from "lucide-react";
import { PanelArchivo, partesDe, type BomCargada } from "@/features/bom/PanelArchivo";
import { compararBoms, filtrarGrupos, normalizarDescripcion, resumenParte, TIPOS_DIFERENCIA, type FilaComparacion, type TipoDiferencia } from "@/features/bom/comparar";
import { exportarCsv, exportarXlsx, type Etiquetas, type Origen } from "@/features/bom/exportar";
import { btnPrimario, btnSecundario, campo } from "@/features/pm/ui";

type Vista = "diferencias" | "lista";

/** Orden de los filtros, como en el prototipo: primero lo que más se revisa. */
const ORDEN_CHIPS: TipoDiferencia[] = ["cantidad", "nueva", "retirada", "intervalo", "descripcion", "pn", "posicion", "unidad", "nuevoPn"];

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function CompararBomsPage() {
  const t = useTranslations("Bom");
  const [base, setBase] = useState<BomCargada | null>(null);
  const [comparar, setComparar] = useState<BomCargada | null>(null);
  const [tipo, setTipo] = useState<TipoDiferencia | null>(null);
  const [vista, setVista] = useState<Vista>("diferencias");
  const [busqueda, setBusqueda] = useState("");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const [intervaloManual, setIntervaloManual] = useState<boolean | null>(null);
  const [exportando, setExportando] = useState<"xlsx" | "csv" | null>(null);

  const partesA = useMemo(() => partesDe(base), [base]);
  const partesB = useMemo(() => partesDe(comparar), [comparar]);

  // En las hojas 8K/16K el intervalo es el de la hoja, no el intervalo base de cada pieza
  // (documento de comprensión, 2.5). Si un lado lo tiene así y el otro no trae el mismo,
  // comparar el intervalo marcaría casi todas las piezas: por defecto se omite.
  const intervaloHoja = (p: typeof partesA) => {
    const s = new Set(p.map((x) => x.intervalo));
    return p.length > 0 && s.size === 1 && p.every((x) => x.intervaloOrigen === "hoja") ? [...s][0] : null;
  };
  const hA = intervaloHoja(partesA), hB = intervaloHoja(partesB);
  const intervaloSoloDeHoja = (!!hA || !!hB) && hA !== hB;
  const compararIntervalo = intervaloManual ?? !intervaloSoloDeHoja;

  const resultado = useMemo(
    () => (partesA.length && partesB.length ? compararBoms(partesA, partesB, { ignorar: compararIntervalo ? [] : ["intervalo"] }) : null),
    [partesA, partesB, compararIntervalo],
  );

  const q = normalizarDescripcion(busqueda);
  const coincideBusqueda = (f: FilaComparacion) => {
    if (!q) return true;
    return [f.base, f.comparar].some((p) => p && (p.pn.toLowerCase().includes(q.replace(/ /g, "")) || normalizarDescripcion(p.descripcion).includes(q) || p.sc.toLowerCase() === q));
  };
  const grupos = useMemo(() => {
    if (!resultado) return [];
    return filtrarGrupos(resultado.grupos, tipo).map((g) => ({ ...g, filas: g.filas.filter(coincideBusqueda) })).filter((g) => g.filas.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, tipo, q]);
  const filasLista = useMemo(() => {
    if (!resultado) return [];
    return resultado.filas.filter((f) => coincideBusqueda(f) && (!tipo || f.cambios.some((c) => c.tipo === tipo)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, tipo, q]);

  const etiquetas = (): Etiquetas => ({
    tipos: Object.fromEntries(TIPOS_DIFERENCIA.map((x) => [x, t(`types.${x}`)])) as Etiquetas["tipos"],
    coincide: t("match"),
    columnas: {
      sc: "SC", nombreSc: t("export.scName"), posicion: t("fields.posicion"), pnBase: t("export.pnBase"), pnComparar: t("export.pnCompare"), pn: t("fields.pn"),
      descripcion: t("fields.descripcion"), diferencia: t("difference"), valorBase: t("export.valueBase"), valorComparar: t("export.valueCompare"),
      filaBase: t("export.rowBase"), filaComparar: t("export.rowCompare"), base: t("baseShort"), comparar: t("compareShort"), estado: t("export.status"),
    },
    hojas: { diferencias: t("export.sheetDifferences"), lista: t("export.sheetList"), resumen: t("export.sheetSummary") },
    resumen: {
      base: t("base"), comparar: t("compareWith"), generado: t("export.generated"), piezasBase: t("export.partsBase"),
      piezasComparar: t("export.partsCompare"), coinciden: t("chips.coinciden"), conDiferencias: t("export.withDifferences"),
    },
  });
  const origen = (b: BomCargada): Origen => ({ archivo: b.archivo.nombre, hoja: b.archivo.hojas[b.hoja].nombre });
  const exportar = async (formato: "xlsx" | "csv") => {
    if (!resultado || !base || !comparar) return;
    setExportando(formato);
    try {
      const f = formato === "xlsx" ? exportarXlsx : exportarCsv;
      await f(resultado, etiquetas(), origen(base), origen(comparar), hoyIso());
    } finally {
      setExportando(null);
    }
  };

  const intercambiar = () => { setBase(comparar); setComparar(base); };
  const alternarGrupo = (sc: string) => setCerrados((s) => { const n = new Set(s); if (n.has(sc)) n.delete(sc); else n.add(sc); return n; });
  const todosCerrados = grupos.length > 0 && grupos.every((g) => cerrados.has(g.sc));

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold leading-tight text-black dark:text-white">{t("title")}</h1>
        <p className="text-sm text-sig-muted">{t("subtitle")}</p>
      </header>

      {/* Base · intercambiar · comparar */}
      <section className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)]">
        <PanelArchivo titulo={t("base")} valor={base} onCambio={(b) => { setBase(b); setIntervaloManual(null); }} />
        <button
          type="button" onClick={intercambiar} disabled={!base && !comparar} title={t("swap")} aria-label={t("swap")}
          className="flex h-10 w-12 items-center justify-center self-center justify-self-center rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700 disabled:opacity-40"
        >
          <ArrowLeftRight size={18} className="lg:rotate-0 rotate-90" />
        </button>
        <PanelArchivo titulo={t("compareWith")} valor={comparar} onCambio={(b) => { setComparar(b); setIntervaloManual(null); }} />
      </section>
      <p className="-mt-3 flex items-center gap-1.5 text-xs text-sig-muted"><Lock size={12} aria-hidden /> {t("privacy")}</p>

      {!resultado && (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded border border-dashed border-sig-line-strong dark:border-zinc-600 px-6 py-10 text-center">
          <FileText size={34} strokeWidth={1.4} className="text-sig-muted" />
          <p className="text-lg font-bold text-black dark:text-white">{t("emptyTitle")}</p>
          <p className="max-w-md text-sm text-sig-muted">{t("emptyText")}</p>
        </div>
      )}

      {resultado && base && comparar && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded bg-sig-sand dark:bg-zinc-800 p-[3px]" role="tablist">
              {(["diferencias", "lista"] as Vista[]).map((v) => (
                <button
                  key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className={`h-8 rounded-[3px] px-3 text-sm font-semibold ${vista === v ? "bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm" : "text-sig-muted hover:text-black dark:hover:text-white"}`}
                >
                  {v === "diferencias" ? t("viewDifferences", { count: resultado.conDiferencias }) : t("viewList", { count: resultado.filas.length })}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecundario} onClick={() => exportar("csv")} disabled={!!exportando}><Download size={15} /> {t("exportCsv")}</button>
              <button type="button" className={btnPrimario} onClick={() => exportar("xlsx")} disabled={!!exportando}><Download size={15} /> {exportando === "xlsx" ? t("exporting") : t("exportXlsx")}</button>
            </div>
          </div>

          {/* Conteos que filtran, como en el prototipo */}
          <div className="flex flex-wrap gap-2">
            <span className="flex h-11 items-baseline gap-2 rounded border border-sig-line dark:border-zinc-700 bg-sig-sand dark:bg-zinc-800 px-4 pt-2.5">
              <span className="text-xl font-bold tabular-nums text-black dark:text-white">{resultado.conteo.coinciden}</span>
              <span className="text-[13px] font-semibold text-black dark:text-white">{t("chips.coinciden")}</span>
            </span>
            {ORDEN_CHIPS.filter((x) => resultado.conteo[x] > 0).map((x) => {
              const on = tipo === x;
              return (
                <button
                  key={x} type="button" aria-pressed={on} onClick={() => setTipo(on ? null : x)}
                  className={`flex h-11 items-baseline gap-2 rounded border px-4 pt-2.5 ${on ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-white hover:border-sig-line-strong"}`}
                >
                  <span className="text-xl font-bold tabular-nums">{resultado.conteo[x]}</span>
                  <span className="text-[13px] font-semibold">{t(`chips.${x}`)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-muted" />
              <input className={`${campo} pl-9`} placeholder={t("searchPlaceholder")} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={t("searchPlaceholder")} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-black dark:text-white">
              <input type="checkbox" checked={compararIntervalo} onChange={(e) => setIntervaloManual(e.target.checked)} className="h-4 w-4 accent-[var(--sig-blue)]" />
              {t("compareInterval")}
            </label>
            {vista === "diferencias" && grupos.length > 1 && (
              <button type="button" className="text-sm font-semibold text-sig-blue hover:underline" onClick={() => setCerrados(todosCerrados ? new Set() : new Set(grupos.map((g) => g.sc)))}>
                {todosCerrados ? t("expandAll") : t("collapseAll")}
              </button>
            )}
          </div>
          {intervaloSoloDeHoja && !compararIntervalo && (
            <p className="-mt-3 flex items-start gap-1.5 text-xs text-sig-muted"><Info size={13} className="mt-px shrink-0" />{t("intervalSkipped", { sheet: (hA ?? hB)! })}</p>
          )}

          {vista === "diferencias" ? (
            <div className="flex flex-col gap-3">
              {grupos.map((g) => {
                const abierto = !cerrados.has(g.sc);
                return (
                  <div key={g.sc || "—"} className="rounded border border-sig-line dark:border-zinc-700">
                    <button type="button" onClick={() => alternarGrupo(g.sc)} aria-expanded={abierto} className="flex w-full items-center gap-3.5 rounded px-4 py-3.5 text-left hover:bg-sig-sand dark:hover:bg-zinc-800">
                      <ChevronRight size={14} strokeWidth={2.4} className={`shrink-0 transition-transform ${abierto ? "rotate-90" : ""}`} />
                      <span className="w-14 shrink-0 font-bold text-black dark:text-white">{g.sc || "—"}</span>
                      <span className="flex-1 truncate text-base font-bold text-black dark:text-white">{g.nombre || (g.sc ? "" : t("noSc"))}</span>
                      <span className="text-[13px] text-sig-muted">{t("differencesCount", { count: g.filas.length })}</span>
                    </button>
                    {abierto && (
                      <div className="overflow-x-auto border-t border-sig-line dark:border-zinc-700">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead>
                            <tr className="text-left text-xs font-semibold text-sig-muted">
                              <th className="w-16 px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("posShort")}</th>
                              <th className="w-32 px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("fields.pn")}</th>
                              <th className="px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("fields.descripcion")}</th>
                              <th className="w-[20%] px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("baseShort")}</th>
                              <th className="w-[20%] px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("compareShort")}</th>
                              <th className="w-44 px-4 py-2.5 border-b border-sig-line dark:border-zinc-700">{t("difference")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.filas.map((f, i) => {
                              const p = f.comparar ?? f.base!;
                              const cambios = tipo ? f.cambios.filter((c) => c.tipo === tipo) : f.cambios;
                              const trazas = [f.base && t("rowIn", { side: t("baseShort"), row: f.base.fila }), f.comparar && t("rowIn", { side: t("compareShort"), row: f.comparar.fila })].filter(Boolean).join(" · ");
                              return cambios.map((c, j) => (
                                <tr key={`${i}-${j}`} className={j === cambios.length - 1 ? "border-b border-sig-sand dark:border-zinc-800" : ""} title={trazas}>
                                  {j === 0 && (
                                    <>
                                      <td rowSpan={cambios.length} className="px-4 py-3 align-top tabular-nums text-sig-muted">{p.posicion ?? "—"}</td>
                                      <td rowSpan={cambios.length} className="px-4 py-3 align-top text-[13px] tabular-nums text-black dark:text-white">{p.pn || "—"}</td>
                                      <td rowSpan={cambios.length} className="px-4 py-3 align-top text-[15px] font-semibold text-black dark:text-white">{p.descripcion}</td>
                                    </>
                                  )}
                                  <td className="px-4 py-3 align-top tabular-nums text-black dark:text-gray-200">{c.base}</td>
                                  <td className="px-4 py-3 align-top tabular-nums">
                                    <span className={c.comparar === "—" ? "text-sig-muted" : "rounded-sm bg-[#F5E6FF] px-1.5 py-0.5 font-semibold text-black dark:bg-purple-900/50 dark:text-white"}>{c.comparar}</span>
                                  </td>
                                  <td className="px-4 py-3 align-top text-[13px] font-semibold text-black dark:text-white">{t(`types.${c.tipo}`)}</td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {!grupos.length && (
                <p className="rounded border border-sig-line dark:border-zinc-700 px-4 py-8 text-center text-sm text-sig-muted">
                  {resultado.conDiferencias ? t("noResults") : t("identical")}
                </p>
              )}
            </div>
          ) : (
            <div className="max-h-[calc(100vh-320px)] overflow-auto rounded border border-sig-line dark:border-zinc-700">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-sig-muted">
                    {["SC", t("posShort"), t("fields.pn"), t("fields.descripcion"), t("baseShort"), t("compareShort"), t("export.status")].map((h, i) => (
                      <th key={i} className="sticky top-0 z-[1] h-10 bg-white dark:bg-zinc-900 px-3.5 border-b border-black dark:border-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasLista.map((f, i) => {
                    const p = f.comparar ?? f.base!;
                    const tipos = [...new Set(f.cambios.map((c) => c.tipo))];
                    return (
                      <tr key={i} className="border-b border-sig-line dark:border-zinc-800 hover:bg-sig-sand dark:hover:bg-zinc-800">
                        <td className="h-[42px] px-3.5 text-[13px] font-bold text-black dark:text-white">{f.sc || "—"}</td>
                        <td className="px-3.5 tabular-nums text-sig-muted">{p.posicion ?? "—"}</td>
                        <td className="px-3.5 text-[13px] tabular-nums text-black dark:text-white">{f.base && f.comparar && f.base.pn !== f.comparar.pn ? `${f.base.pn} → ${f.comparar.pn}` : p.pn || "—"}</td>
                        <td className="px-3.5 font-semibold text-black dark:text-white">{p.descripcion}</td>
                        <td className="px-3.5 tabular-nums text-black dark:text-gray-200">{f.base ? resumenParte(f.base) : "—"}</td>
                        <td className="px-3.5 tabular-nums text-black dark:text-gray-200">{f.comparar ? resumenParte(f.comparar) : "—"}</td>
                        <td className="px-3.5">
                          {tipos.length ? (
                            <span className="inline-flex flex-wrap gap-1">
                              {tipos.map((x) => (
                                <span key={x} className={`rounded px-1.5 py-0.5 text-xs font-semibold ${x === "nueva" ? "bg-sig-blue-soft text-sig-blue" : x === "retirada" ? "bg-sig-danger-soft text-sig-danger" : "bg-sig-warning-soft text-black"} dark:bg-zinc-700 dark:text-white`}>{t(`types.${x}`)}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="rounded bg-sig-success-soft px-1.5 py-0.5 text-xs font-semibold text-sig-success dark:bg-zinc-700 dark:text-white">{t("match")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filasLista.length && <p className="px-4 py-8 text-center text-sm text-sig-muted">{t("noResults")}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1 text-[13px] text-sig-muted">
            {vista === "diferencias" && resultado.conteo.coinciden > 0 && <p>{t("matchesHidden", { count: resultado.conteo.coinciden })}</p>}
            <p className="tabular-nums">{t("totals", { a: resultado.totalBase, b: resultado.totalComparar })}</p>
            {resultado.repetidas.length > 0 && (
              <p>{t("repeated", { count: resultado.repetidas.length, example: `${resultado.repetidas[0].sc} / ${resultado.repetidas[0].posicion ?? t("noPosition")} / ${resultado.repetidas[0].pn}` })}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
