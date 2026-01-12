"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Eye, Search, Filter, X, Calendar } from "lucide-react";
import Link from "next/link";

interface Cotizacion {
  id: number;
  numero_cotizacion: string;
  fecha_creacion: string;
  total: number;
  estado: string;
  estatus_po: string;
  clientes: { nombre: string; empresa: string };
  usuarios: { nombre: string };
  creado_por_nombre: string;
}

export default function DashboardCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS PARA FILTROS ---
  const [busqueda, setBusqueda] = useState(""); // Filtra por Folio o Cliente
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

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

  // --- LÓGICA DE FILTRADO ---
  const cotizacionesFiltradas = cotizaciones.filter((cot) => {
    // 1. Filtro por Texto (Cliente o Folio)
    const texto = busqueda.toLowerCase();
    const coincideTexto = 
      cot.numero_cotizacion.toLowerCase().includes(texto) ||
      (cot.clientes?.nombre || "").toLowerCase().includes(texto) ||
      (cot.clientes?.empresa || "").toLowerCase().includes(texto);

    // 2. Filtro por Estado
    const coincideEstado = filtroEstado === "todos" || cot.estado === filtroEstado;

    // 3. Filtro por Fechas
    let coincideFecha = true;
    if (fechaInicio) {
      coincideFecha = coincideFecha && new Date(cot.fecha_creacion) >= new Date(fechaInicio);
    }
    if (fechaFin) {
      // Ajustamos fecha fin para que incluya todo el día seleccionado
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59); 
      coincideFecha = coincideFecha && new Date(cot.fecha_creacion) <= fin;
    }

    return coincideTexto && coincideEstado && coincideFecha;
  });

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusqueda("");
    setFechaInicio("");
    setFechaFin("");
    setFiltroEstado("todos");
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "aceptada": return "bg-green-100 text-green-800";
      case "rechazada": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mis Cotizaciones</h1>
            <p className="text-gray-500">Historial completo y herramientas de filtrado</p>
          </div>
          <Link 
            href="/cotizaciones/nueva" 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            + Nueva Cotización
          </Link>
        </div>

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            
            {/* Buscador Texto */}
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cliente, Empresa o Folio..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Filtro Estado */}
            <div className="w-full md:w-40">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Estado</label>
              <select 
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="todos">Todos</option>
                <option value="borrador">Borrador</option>
                <option value="aceptada">Aceptada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>

            {/* Filtro Fechas */}
            <div className="w-full md:w-auto flex gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Desde</label>
                <input 
                  type="date" 
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hasta</label>
                <input 
                  type="date" 
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-600"
                />
              </div>
            </div>

            {/* Botón Limpiar */}
            {(busqueda || fechaInicio || fechaFin || filtroEstado !== "todos") && (
              <button 
                onClick={limpiarFiltros}
                className="px-4 py-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <X size={18} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Folio</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Creado por</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">PO Status</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10">Cargando cotizaciones...</td></tr>
                ) : cotizacionesFiltradas.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No se encontraron resultados con estos filtros.</td></tr>
                ) : (
                  cotizacionesFiltradas.map((cot) => (
                    <tr key={cot.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {cot.numero_cotizacion}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{cot.clientes?.empresa || cot.clientes?.nombre}</div>
                        {cot.clientes?.empresa && <div className="text-xs text-gray-400">{cot.clientes?.nombre}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {cot.creado_por_nombre}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(cot.fecha_creacion).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getEstadoColor(cot.estado)}`}>
                          {cot.estado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cot.estado === 'aceptada' ? (
                          cot.estatus_po === 'completada' 
                            ? <span className="text-green-600 font-bold flex items-center gap-1 text-xs bg-green-50 px-2 py-1 rounded border border-green-100">✔ Completada</span>
                            : <span className="text-orange-500 font-bold flex items-center gap-1 text-xs bg-orange-50 px-2 py-1 rounded border border-orange-100">⏳ Pendiente</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link 
                          href={`/cotizaciones/${cot.id}`} 
                          className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 rounded-lg transition-all shadow-none hover:shadow-sm"
                          title="Ver detalles y gestionar"
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
          
          {/* Footer de la tabla con contador */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
             <span>Mostrando {cotizacionesFiltradas.length} de {cotizaciones.length} registros</span>
          </div>
        </div>
      </div>
    </div>
  );
}