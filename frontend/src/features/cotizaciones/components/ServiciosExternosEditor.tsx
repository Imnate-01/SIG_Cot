"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { totalServicioExterno, totalServiciosExternos } from "../pricing";
import type { ServicioExternoForm } from "../types";

/**
 * Tabla libre para cotizar entrenamientos y servicios externos
 * (p. ej. "Servicio Maintenance Plus", "Mantenimiento correctivo Chiller").
 * Cada fila: Detalle · Cantidad · P. Unit. → Total = Cantidad × P. Unit.
 */
export interface ServiciosExternosEditorProps {
  filas: ServicioExternoForm[];
  onChange: (filas: ServicioExternoForm[]) => void;
  titulo: string;
  onTituloChange: (titulo: string) => void;
  moneda: string;
}

export const nuevaFilaServicioExterno = (): ServicioExternoForm => ({
  id: Date.now() + Math.random(),
  detalle: "",
  cantidad: 1,
  precioUnitario: 0,
});

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ServiciosExternosEditor({ filas, onChange, titulo, onTituloChange, moneda }: ServiciosExternosEditorProps) {
  const t = useTranslations("ServiciosExternos");

  const actualizar = (id: number, campo: keyof ServicioExternoForm, valor: string) =>
    onChange(filas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  const campo = "w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none text-sm";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl"><GraduationCap className="text-blue-600 dark:text-blue-400" size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("title")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([...filas, nuevaFilaServicioExterno()])}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-black dark:text-white border border-sig-line-strong dark:border-zinc-700 rounded-xl hover:bg-sig-sand dark:hover:bg-zinc-700 font-semibold transition-colors"
        >
          <Plus size={18} /> {t("addRow")}
        </button>
      </div>

      {filas.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-5 text-center">{t("empty")}</p>
      ) : (
        <>
          <div className="mb-4 max-w-xl">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t("tableTitle")}</label>
            <input type="text" value={titulo} onChange={(e) => onTituloChange(e.target.value)} placeholder={t("tableTitlePlaceholder")} className={campo} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <th className="pb-2 pr-3 border-b border-black dark:border-zinc-500 w-12">{t("colOrder")}</th>
                  <th className="pb-2 pr-3 border-b border-black dark:border-zinc-500">{t("colDetail")}</th>
                  <th className="pb-2 pr-3 border-b border-black dark:border-zinc-500 w-24">{t("colQty")}</th>
                  <th className="pb-2 pr-3 border-b border-black dark:border-zinc-500 w-40">{t("colUnitPrice")}</th>
                  <th className="pb-2 pr-3 border-b border-black dark:border-zinc-500 w-40 text-right">{t("colTotal")}</th>
                  <th className="pb-2 border-b border-black dark:border-zinc-500 w-10" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f, idx) => (
                  <tr key={f.id} className="border-b border-gray-200 dark:border-zinc-800 align-top">
                    <td className="py-2 pr-3 pt-4 font-semibold text-gray-500">{idx + 1}</td>
                    <td className="py-2 pr-3">
                      <textarea rows={2} value={f.detalle} onChange={(e) => actualizar(f.id, "detalle", e.target.value)} placeholder={t("detailPlaceholder")} className={`${campo} resize-y`} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step="any" value={f.cantidad} onChange={(e) => actualizar(f.id, "cantidad", e.target.value)} className={`${campo} text-center`} />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">$</span>
                        <input type="number" min={0} step="0.01" value={f.precioUnitario} onChange={(e) => actualizar(f.id, "precioUnitario", e.target.value)} className={`${campo} text-right`} />
                      </div>
                    </td>
                    <td className="py-2 pr-3 pt-4 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap">${fmt(totalServicioExterno(f))}</td>
                    <td className="py-2 pt-3">
                      <button type="button" onClick={() => onChange(filas.filter((x) => x.id !== f.id))} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title={t("deleteRow")} aria-label={t("deleteRow")}>
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end text-sm">
            <span className="text-gray-600 dark:text-gray-400 mr-3">{t("subtotal")}</span>
            <span className="font-bold text-gray-800 dark:text-white">${fmt(totalServiciosExternos(filas))} {moneda}</span>
          </div>
        </>
      )}
    </div>
  );
}
