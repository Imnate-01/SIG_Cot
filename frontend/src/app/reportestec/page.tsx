"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Link from "next/link";
import {
  Search,
  FileText,
  CalendarDays,
  Building2,
  User,
  Plus,
  Filter,
  ArrowRight,
  MoreHorizontal
} from "lucide-react";

type ReportRow = {
  id: number;
  folio: string;
  estado: string;
  planta: string | null;
  cliente_nombre: string | null;
  cliente_empresa: string | null;
  ingeniero_nombre: string | null;
  created_at: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

// Helper para fechas
function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

// Helper para obtener iniciales (Avatar)
function getInitials(name: string | null) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ReportesTecnicosListadoPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/reportes-tecnicos/listado");
        setRows(res.data.data || []);
      } catch (e) {
        console.error(e);
        // Podrías usar un toast aquí en lugar de alert
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const blob = [
        r.folio,
        r.cliente_nombre,
        r.cliente_empresa,
        r.planta,
        r.ingeniero_nombre,
        r.estado,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return blob.includes(term);
    });
  }, [q, rows]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reportes Técnicos</h1>
            <p className="text-slate-500 mt-1">Gestiona y consulta el historial de inspecciones.</p>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Botón Nuevo con mejor estilo */}
            <Link
              href="/reportestec/nuevo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} />
              Crear Reporte
            </Link>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por folio, cliente, planta..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={16} />
              Filtros
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 text-sm">Cargando reportes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="bg-slate-50 p-4 rounded-full mb-3">
                <FileText className="text-slate-300" size={32} />
              </div>
              <h3 className="text-slate-900 font-medium">No se encontraron reportes</h3>
              <p className="text-slate-500 text-sm mt-1">Intenta con otros términos de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Folio</th>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Cliente / Planta</th>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Fechas</th>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Ingeniero</th>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Folio */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">
                          {r.folio}
                        </span>
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{r.cliente_nombre || "Sin nombre"}</p>
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                              <span>{r.cliente_empresa}</span>
                              {r.planta && (
                                <>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                  <span>{r.planta}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fechas */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays size={14} className="text-slate-400" />
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDate(r.created_at)}</span>
                            {(r.fecha_inicio || r.fecha_fin) && (
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Servicio: {formatDate(r.fecha_inicio)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ingeniero (Avatar) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200">
                            {getInitials(r.ingeniero_nombre)}
                          </div>
                          <span className="text-slate-700 font-medium">
                            {r.ingeniero_nombre?.split(" ")[0] || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            r.estado === "finalizado"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : r.estado === "borrador"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                             r.estado === "finalizado" ? "bg-emerald-500" :
                             r.estado === "borrador" ? "bg-amber-500" : "bg-slate-400"
                          }`}></span>
                          {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/reportestec/${r.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                          title="Ver detalles"
                        >
                          <ArrowRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer de tabla (Paginación simple o contador) */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> resultados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}