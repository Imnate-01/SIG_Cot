"use client";
import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { Plus, Search, Eye, Download, FileText, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface CotizacionUs {
  id: number;
  quote_number: string;
  customer: string;
  city_state: string;
  quoted_by: string;
  quote_date: string;
  grand_total: number;
  estado: string;
  created_at: string;
}

export default function CotizacionesUsPage() {
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<CotizacionUs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCotizaciones();
  }, []);

  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cotizaciones-us');
      if (data.success) {
        setCotizaciones(data.data);
      }
    } catch (error) {
      console.error("Error al obtener cotizaciones US:", error);
      toast.error("Error al cargar las cotizaciones US");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta cotización?")) return;
    
    try {
      await api.delete(`/cotizaciones-us/${id}`);
      toast.success("Cotización eliminada");
      fetchCotizaciones();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const filtered = cotizaciones.filter(c => 
    c.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.quote_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="text-blue-600 dark:text-blue-400" size={32} />
            US Standard Quotes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Gestión de cotizaciones sin contrato (Tarifas Estándar USD)
          </p>
        </div>
        
        <button 
          onClick={() => router.push('/cotizaciones-us/nueva')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm"
        >
          <Plus size={20} />
          Nueva Cotización US
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por cliente o folio..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-700 dark:text-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron cotizaciones
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-zinc-700">
                  <th className="p-4 font-semibold rounded-tl-xl">Folio</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">City/State</th>
                  <th className="p-4 font-semibold">Quoted By</th>
                  <th className="p-4 font-semibold">Total</th>
                  <th className="p-4 font-semibold">Fecha</th>
                  <th className="p-4 font-semibold rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cot) => (
                  <tr key={cot.id} className="border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900 dark:text-white">{cot.quote_number || `DRAFT-${cot.id}`}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{cot.customer}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{cot.city_state}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{cot.quoted_by}</td>
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">${Number(cot.grand_total).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{new Date(cot.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {/* <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ver/Editar">
                          <Edit2 size={18} />
                        </button> */}
                        <button onClick={() => handleDelete(cot.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
