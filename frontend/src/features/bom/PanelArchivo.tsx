"use client";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { AlertTriangle, FileSpreadsheet, Loader2, SlidersHorizontal, Upload, X } from "lucide-react";
import { abrirArchivoBom, ErrorArchivoBom, type ArchivoBom } from "./archivoBom";
import {
  CAMPOS_BOM, detectarEncabezado, duplicados, extraerPartes, faltantes, mapearEncabezados, muestras, texto,
  type CampoBom, type Mapeo, type ParteBom,
} from "./leerBom";

/** Archivo cargado + hoja elegida + mapeo vigente. */
export interface BomCargada {
  archivo: ArchivoBom;
  hoja: number;
  filaEncabezado: number;
  mapeo: Mapeo;
}

export function partesDe(b: BomCargada | null): ParteBom[] {
  if (!b || b.filaEncabezado < 0) return [];
  const h = b.archivo.hojas[b.hoja];
  if (faltantes(b.mapeo).length || duplicados(b.mapeo).length) return [];
  return extraerPartes(h.filas, b.filaEncabezado, b.mapeo, h.nombre);
}

/** Configuración automática de una hoja: encabezado detectado y mapeo por sinónimos. */
export function configurarHoja(archivo: ArchivoBom, hoja: number): BomCargada {
  const filas = archivo.hojas[hoja].filas;
  const filaEncabezado = detectarEncabezado(filas);
  return { archivo, hoja, filaEncabezado, mapeo: filaEncabezado >= 0 ? mapearEncabezados(filas[filaEncabezado]) : {} };
}

/** Al abrir: la hoja con más piezas reconocidas (en la matriz Nestlé, la consolidada o la del intervalo). */
function mejorHoja(archivo: ArchivoBom): BomCargada {
  let mejor = configurarHoja(archivo, 0);
  let n = partesDe(mejor).length;
  for (let i = 1; i < archivo.hojas.length; i++) {
    const c = configurarHoja(archivo, i);
    const m = partesDe(c).length;
    if (m > n) { mejor = c; n = m; }
  }
  return mejor;
}

const campoSel =
  "h-9 w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]";

export function PanelArchivo({ titulo, valor, onCambio }: { titulo: string; valor: BomCargada | null; onCambio: (b: BomCargada | null) => void }) {
  const t = useTranslations("Bom");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verMapeo, setVerMapeo] = useState(false);

  const onDrop = useCallback(async (archivos: File[]) => {
    const f = archivos[0];
    if (!f) return;
    setCargando(true);
    setError(null);
    try {
      const archivo = await abrirArchivoBom(f);
      const b = mejorHoja(archivo);
      onCambio(b);
      setVerMapeo(b.filaEncabezado < 0 || faltantes(b.mapeo).length > 0);
    } catch (e) {
      const codigo = e instanceof ErrorArchivoBom ? e.codigo : "lectura";
      setError(t(`error.${codigo}`));
    } finally {
      setCargando(false);
    }
  }, [onCambio, t]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: !!valor,
    noKeyboard: !!valor,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
      "text/csv": [".csv"],
    },
  });

  if (!valor) {
    return (
      <div className="flex flex-col gap-2 rounded border border-sig-line dark:border-zinc-700 p-4">
        <span className="text-xs text-sig-muted">{titulo}</span>
        <div
          {...getRootProps()}
          className={`flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed px-4 py-6 text-center transition-colors ${isDragActive ? "border-sig-blue bg-sig-blue-soft dark:bg-zinc-800" : "border-sig-line-strong bg-sig-sand dark:border-zinc-600 dark:bg-zinc-800/60 hover:border-sig-blue"}`}
        >
          <input {...getInputProps()} aria-label={titulo} />
          {cargando ? <Loader2 className="animate-spin text-sig-blue" size={22} /> : <Upload size={22} className="text-sig-muted" />}
          <span className="text-sm font-semibold text-black dark:text-white">{cargando ? t("reading") : t("dropTitle")}</span>
          <span className="text-xs text-sig-muted">{t("dropHint")}</span>
        </div>
        {error && <p role="alert" className="flex items-center gap-1.5 text-sm text-sig-danger"><AlertTriangle size={14} />{error}</p>}
      </div>
    );
  }

  const hoja = valor.archivo.hojas[valor.hoja];
  const partes = partesDe(valor);
  const falta = valor.filaEncabezado >= 0 ? faltantes(valor.mapeo) : [];
  const repetidos = duplicados(valor.mapeo);
  const problema = valor.filaEncabezado < 0 ? t("noHeader") : falta.length ? t("missingFields", { fields: falta.map((c) => t(`fields.${c}`)).join(", ") }) : repetidos.length ? t("duplicateFields", { fields: [...new Set(repetidos)].map((c) => t(`fields.${c}`)).join(", ") }) : null;
  const scs = new Set(partes.map((p) => p.sc).filter(Boolean)).size;
  const intervaloHoja = partes.some((p) => p.intervaloOrigen === "hoja") ? partes.find((p) => p.intervaloOrigen === "hoja")!.intervalo : null;
  const encabezados = valor.filaEncabezado >= 0 ? hoja.filas[valor.filaEncabezado] : [];
  const columnas = Array.from({ length: encabezados.length }, (_, i) => i).filter((i) => texto(encabezados[i]));
  const campoDeColumna = (col: number) => CAMPOS_BOM.find((c) => valor.mapeo[c] === col) ?? "";
  const asignar = (col: number, campo: CampoBom | "") => {
    const m: Mapeo = { ...valor.mapeo };
    for (const c of CAMPOS_BOM) if (m[c] === col) delete m[c];
    if (campo) m[campo] = col;
    onCambio({ ...valor, mapeo: m });
  };

  return (
    <div {...getRootProps()} className={`flex min-w-0 flex-col gap-3 rounded border p-4 ${isDragActive ? "border-sig-blue bg-sig-blue-soft dark:bg-zinc-800" : problema ? "border-sig-danger" : "border-sig-line dark:border-zinc-700"}`}>
      <input {...getInputProps()} aria-label={titulo} />
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-sig-muted">{titulo}</span>
        <button type="button" onClick={() => onCambio(null)} aria-label={t("removeFile")} title={t("removeFile")} className="-m-1 rounded p-1 text-sig-muted hover:bg-sig-sand hover:text-black dark:hover:bg-zinc-800 dark:hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <FileSpreadsheet size={18} className="shrink-0 text-sig-success" />
        <span className="truncate text-lg font-bold text-black dark:text-white" title={valor.archivo.nombre}>{valor.archivo.nombre}</span>
      </div>

      {valor.archivo.hojas.length > 1 && (
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-xs font-semibold text-sig-muted">{t("sheet")}</span>
          <select className={campoSel} value={valor.hoja} onChange={(e) => onCambio(configurarHoja(valor.archivo, Number(e.target.value)))}>
            {valor.archivo.hojas.map((h, i) => <option key={i} value={i}>{h.nombre}</option>)}
          </select>
        </label>
      )}

      {problema ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-semibold text-sig-danger"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{problema}</p>
      ) : (
        <p className="text-sm tabular-nums text-black dark:text-white">
          {t("sheetSummary", { parts: partes.length, scs, row: valor.filaEncabezado + 1 })}
          {intervaloHoja && <span className="text-sig-muted"> · {t("intervalFromSheet", { interval: intervaloHoja })}</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setVerMapeo((v) => !v)} aria-expanded={verMapeo} className="inline-flex h-8 items-center gap-1.5 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700">
          <SlidersHorizontal size={13} /> {verMapeo ? t("hideMapping") : t("showMapping")}
        </button>
        <button type="button" onClick={open} className="inline-flex h-8 items-center gap-1.5 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700">
          <Upload size={13} /> {t("replaceFile")}
        </button>
      </div>

      {verMapeo && (
        <div className="flex flex-col gap-2 border-t border-sig-line dark:border-zinc-700 pt-3">
          <label className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-semibold text-sig-muted">{t("headerRow")}</span>
            <input
              type="number" min={1} max={hoja.filas.length} className={`${campoSel} w-24`}
              value={valor.filaEncabezado >= 0 ? valor.filaEncabezado + 1 : ""}
              onChange={(e) => {
                const n = Number(e.target.value) - 1;
                if (n >= 0 && n < hoja.filas.length) onCambio({ ...valor, filaEncabezado: n, mapeo: mapearEncabezados(hoja.filas[n]) });
              }}
            />
          </label>
          {columnas.length > 0 && (
            <div className="max-h-72 overflow-auto rounded border border-sig-line dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-sig-muted">
                    <th className="sticky top-0 bg-white dark:bg-zinc-900 px-3 py-2 border-b border-sig-line dark:border-zinc-700">{t("columnInFile")}</th>
                    <th className="sticky top-0 bg-white dark:bg-zinc-900 px-3 py-2 border-b border-sig-line dark:border-zinc-700 w-44">{t("field")}</th>
                  </tr>
                </thead>
                <tbody>
                  {columnas.map((col) => {
                    const campo = campoDeColumna(col);
                    const rep = campo && repetidos.includes(campo);
                    return (
                      <tr key={col} className="border-b border-sig-sand dark:border-zinc-800 last:border-0">
                        <td className="px-3 py-2 align-top">
                          <div className="font-semibold text-black dark:text-white">{texto(encabezados[col])}</div>
                          <div className="truncate text-xs text-sig-muted" title={muestras(hoja.filas, valor.filaEncabezado, col).join(" · ")}>{muestras(hoja.filas, valor.filaEncabezado, col).join(" · ") || "—"}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select aria-label={texto(encabezados[col])} className={`${campoSel} ${rep ? "border-sig-danger" : ""} ${!campo ? "bg-sig-sand dark:bg-zinc-800" : ""}`} value={campo} onChange={(e) => asignar(col, e.target.value as CampoBom | "")}>
                            <option value="">{t("doNotUse")}</option>
                            {CAMPOS_BOM.map((c) => <option key={c} value={c}>{t(`fields.${c}`)}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-sig-muted">{t("mappingHint")}</p>
        </div>
      )}
    </div>
  );
}
