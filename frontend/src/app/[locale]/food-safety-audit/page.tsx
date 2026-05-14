"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { 
  ShieldCheck, Plus, Search, Filter, Eye, FileText, 
  Loader2, RefreshCw, Trash2, ChevronRight, BarChart3,
  Clock, CheckCircle2
} from "lucide-react";
import { foodSafetyAuditApi } from "@/services/foodSafetyAudit";

export default function FoodSafetyAuditPage() {
  const t = useTranslations("FoodSafetyAudit");
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await foodSafetyAuditApi.list();
      if (res.data?.success) {
        setReports(res.data.data);
      } else {
        setError(res.data?.error || "Error al cargar reportes");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: number, folio: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el reporte ${folio}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }
    
    setIsDeleting(id);
    try {
      const res = await foodSafetyAuditApi.delete(id);
      if (res.data?.success) {
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        alert(res.data?.error || "Error al eliminar el reporte");
      }
    } catch (err: any) {
      alert(err.message || "Error al conectar con el servidor");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => 
      r.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cliente_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.llenadora?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    return {
      total: reports.length,
      borrador: reports.filter(r => r.estado === 'borrador').length,
      revision: reports.filter(r => r.estado === 'en_revision').length,
      finalizado: reports.filter(r => r.estado === 'finalizado').length,
    };
  }, [reports]);

  const getInitials = (name: string) => {
    if (!name) return "N/A";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">
      {/* ── HEADER & HERO SECTION ── */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {t("title")}
              </h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base font-medium">
                {t("subtitle") || "Gestión integral de auditorías y calidad"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchReports}
              disabled={isLoading}
              className="p-2.5 text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
              title="Actualizar listado"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <Link
              href="/food-safety-audit/nuevo"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              {t("newReport")}
            </Link>
          </div>
        </div>

        {/* ── ESTADÍSTICAS RÁPIDAS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Reportes</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Borradores</p>
              <p className="text-2xl font-bold text-slate-900">{stats.borrador}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">En Revisión</p>
              <p className="text-2xl font-bold text-slate-900">{stats.revision}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Finalizados</p>
              <p className="text-2xl font-bold text-slate-900">{stats.finalizado}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR BÚSQUEDA ── */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-2 mb-6 backdrop-blur-sm bg-white/80">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t("searchPlaceholder") || "Buscar por folio, cliente o llenadora..."}
            className="w-full pl-11 pr-4 py-3 bg-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 font-medium transition-all w-full md:w-auto">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* ── TABLA DE DATOS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-5">{t("colFolio")}</th>
                <th className="p-5">{t("colLlenadora")}</th>
                <th className="p-5">{t("colClient")}</th>
                <th className="p-5">{t("colDate")}</th>
                <th className="p-5">{t("colAuditor")}</th>
                <th className="p-5">{t("colStatus")}</th>
                <th className="p-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-slate-500 font-medium">{t("loading")}</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                      <Filter className="w-5 h-5" />
                      <span className="font-medium">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-xl font-bold text-slate-800">{t("noResults")}</p>
                    <p className="text-slate-500 mt-2 max-w-sm mx-auto">{t("noResultsDesc")}</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-blue-600 font-medium hover:underline"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5">
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-800 font-mono text-sm font-bold rounded-lg border border-slate-200">
                        {report.folio}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="font-medium text-slate-900">{report.llenadora || '—'}</div>
                    </td>
                    <td className="p-5">
                      <div className="font-medium text-slate-700">{report.cliente_empresa || '—'}</div>
                    </td>
                    <td className="p-5 text-slate-500 text-sm font-medium">
                      {report.fecha_auditoria || '—'}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                          {getInitials(report.usuarios?.nombre)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {report.usuarios?.nombre || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
                        ${report.estado === 'borrador' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 
                          report.estado === 'en_revision' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
                      >
                        {report.estado === 'borrador' && <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>}
                        {report.estado === 'en_revision' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                        {report.estado === 'finalizado' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                        {report.estado === 'borrador' ? t("statusDraft") :
                         report.estado === 'en_revision' ? t("statusInReview") :
                         t("statusCompleted")}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(report.id, report.folio)}
                          disabled={isDeleting === report.id}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar reporte"
                        >
                          {isDeleting === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-end lg:hidden group-hover:hidden">
                         <ChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
