"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Eye, Search, Filter, X, Calendar, Download, LayoutGrid, List } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { exportToExcel } from "../../../utils/exportCotizaciones";
import { KanbanBoard } from "./components/KanbanBoard";
import { Cotizacion } from "./components/KanbanCard";
import { toast } from "sonner";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export default function DashboardCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const t = useTranslations("Cotizaciones");
  const tCommon = useTranslations("Common");

  useRealtimeNotifications();

  const [busqueda, setBusqueda] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPais, setFiltroPais] = useState<"todos" | "MX" | "US">("todos");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data } = await api.get("/cotizaciones");
        setCotizaciones(data.data);
      } catch (error) {
        console.error("Error cargando cotizaciones:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const cotizacionesFiltradas = cotizaciones.filter((cot) => {
    const texto = busqueda.toLowerCase();
    const coincideTexto =
      cot.numero_cotizacion.toLowerCase().includes(texto) ||
      (cot.clientes?.nombre || "").toLowerCase().includes(texto) ||
      (cot.clientes?.empresa || "").toLowerCase().includes(texto) ||
      (cot.descripcion || "").toLowerCase().includes(texto);
    const coincideEstado = filtroEstado === "todos" || cot.estado === filtroEstado;
    const entidad = (cot as any).condiciones?.entidad || "MX";
    const coincidePais =
      filtroPais === "todos" ||
      (filtroPais === "MX" && (entidad === "MX" || !entidad)) ||
      (filtroPais === "US" && (entidad === "US" || entidad === "CA"));
    let coincideFecha = true;
    if (fechaInicio) {
      coincideFecha = coincideFecha && new Date(cot.fecha_creacion) >= new Date(fechaInicio);
    }
    if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59);
      coincideFecha = coincideFecha && new Date(cot.fecha_creacion) <= fin;
    }
    return coincideTexto && coincideEstado && coincidePais && coincideFecha;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFechaInicio("");
    setFechaFin("");
    setFiltroEstado("todos");
    setFiltroPais("todos");
  };

  const handleExportar = async () => {
    if (cotizacionesFiltradas.length === 0) {
      return toast.warning(t("exportNoData"), { description: t("exportNoDataDesc") });
    }
    try {
      await exportToExcel(cotizacionesFiltradas);
      toast.success(t("exportSuccess"), { description: t("exportSuccessDesc", { count: cotizacionesFiltradas.length }) });
    } catch (error) {
      console.error(error);
      toast.error(t("exportError"), { description: t("exportErrorDesc") });
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "aceptada": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rechazada": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-xl border border-gray-200 dark:border-zinc-700 mr-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title={t("listView")}
              >
                <List size={20} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                title={t("kanbanView")}
              >
                <LayoutGrid size={20} />
              </button>
            </div>

            <button
              onClick={handleExportar}
              className="bg-green-600 dark:bg-green-700 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || cotizacionesFiltradas.length === 0}
            >
              <Download size={20} />
              {t("exportExcel")}
            </button>
            <Link
              href="/cotizaciones/nueva"
              className="bg-blue-600 dark:bg-blue-700 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              {t("newQuotation")}
            </Link>
          </div>
        </div>

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">

            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t("searchLabel")}</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="w-full md:w-40">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t("statusLabel")}</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200"
              >
                <option value="todos">{t("statusAll")}</option>
                <option value="borrador">{t("statusDraft")}</option>
                <option value="aceptada">{t("statusAccepted")}</option>
                <option value="rechazada">{t("statusRejected")}</option>
              </select>
            </div>

            <div className="w-full md:w-auto flex gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t("dateFrom")}</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-600 dark:text-gray-200 dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t("dateTo")}</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-600 dark:text-gray-200 dark:[color-scheme:dark]"
                />
              </div>
            </div>

            {/* Country filter pills */}
            <div className="w-full md:w-auto flex flex-col">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{tCommon("countryRegion")}</label>
              <div className="flex gap-1">
                {(["todos", "MX", "US"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFiltroPais(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${filtroPais === p
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-zinc-700 hover:border-blue-400"
                      }`}
                  >
                    {p === "todos" ? `🌎 ${tCommon("all")}` : p === "MX" ? "MX" : "US"}
                  </button>
                ))}
              </div>
            </div>

            {(busqueda || fechaInicio || fechaFin || filtroEstado !== "todos" || filtroPais !== "todos") && (
              <button
                onClick={limpiarFiltros}
                className="px-4 py-2.5 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <X size={18} /> {t("clear")}
              </button>
            )}
          </div>
        </div>

        {/* --- VISTAS --- */}
        {viewMode === 'list' ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-700 dark:text-gray-200 font-semibold uppercase text-xs border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">{t("tableId")}</th>
                    <th className="px-6 py-4">{t("tableClient")}</th>
                    <th className="px-6 py-4">{tCommon("region")}</th>
                    <th className="px-6 py-4">{t("tableCreatedBy")}</th>
                    <th className="px-6 py-4">{t("tableDate")}</th>
                    <th className="px-6 py-4">{t("tableStatus")}</th>
                    <th className="px-6 py-4">{t("tablePO")}</th>
                    <th className="px-6 py-4 text-center">{t("tableAction")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-10 dark:text-gray-400">{t("loadingQuotations")}</td></tr>
                  ) : cotizacionesFiltradas.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-gray-400 dark:text-gray-500">{t("noResultsFilters")}</td></tr>
                  ) : (
                    cotizacionesFiltradas.map((cot) => (
                      <tr key={cot.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                        <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                          {cot.numero_cotizacion}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800 dark:text-white">{cot.clientes?.empresa || cot.clientes?.nombre}</div>
                          {cot.clientes?.empresa && <div className="text-xs text-gray-400 dark:text-gray-500">{cot.clientes?.nombre}</div>}
                          {cot.descripcion && (
                            <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full inline-block border border-purple-100 dark:border-purple-900/30">
                              {cot.descripcion}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const ent = (cot as any).condiciones?.entidad || "MX";
                            const isUS = ent === "US" || ent === "CA";
                            return (
                              <span className={`text-xs font-bold px-2 py-1 rounded-full border inline-block whitespace-nowrap ${isUS
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                }`}>
                                {isUS ? "US" : "MX"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">{cot.creado_por_nombre}</td>
                        <td className="px-6 py-4">{new Date(cot.fecha_creacion).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getEstadoColor(cot.estado)}`}>
                            {cot.estado.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {cot.estado === 'aceptada' ? (
                            cot.estatus_po === 'completada'
                              ? <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-100 dark:border-green-900/30">✔ {t("poCompleted")}</span>
                              : <span className="text-orange-500 dark:text-orange-400 font-bold flex items-center gap-1 text-xs bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/30">⏳ {t("poPending")}</span>
                          ) : (
                            <span className="text-gray-300 dark:text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/cotizaciones/${cot.id}`}
                            className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 rounded-lg transition-all shadow-none hover:shadow-sm"
                            title={t("viewDetails")}
                          >
                            <Eye size={20} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-xs text-gray-500 dark:text-gray-500 flex justify-between items-center">
              <span>{t("showingOf", { count: cotizacionesFiltradas.length, total: cotizaciones.length })}</span>
              {filtroPais !== "todos" && (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {tCommon("filterActive")} {filtroPais === "MX" ? tCommon("mexico") : tCommon("unitedStates")}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <KanbanBoard
              cotizaciones={cotizacionesFiltradas}
              onStatusChange={() => {
                console.log("Kanban status changed");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}