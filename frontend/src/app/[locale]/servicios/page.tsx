"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Plus, Search, Edit, Trash2, Clock, Package, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Servicio {
  id: number;
  concepto: string;
  unidad: string;
  precio_sin_contrato: number;
  precio_con_contrato: number;
  moneda: string;
  categoria: string;
  region: string;
}

export default function ServiciosPage() {
  const t = useTranslations("Servicios");

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [regionTab, setRegionTab] = useState<"MX" | "US">("MX");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null);

  const [formData, setFormData] = useState({
    concepto: "",
    unidad: "hora",
    precio_sin_contrato: 0,
    precio_con_contrato: 0,
    moneda: "USD",
    categoria: "Servicio Técnico",
    region: "MX" as string
  });

  const cargarServicios = async (region?: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/servicios${region ? `?region=${region}` : ''}`);
      setServicios(data.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarServicios(regionTab); }, [regionTab]);

  const abrirModal = (servicio?: Servicio) => {
    if (servicio) {
      setServicioEditando(servicio);
      setFormData({
        concepto: servicio.concepto,
        unidad: servicio.unidad,
        precio_sin_contrato: servicio.precio_sin_contrato,
        precio_con_contrato: servicio.precio_con_contrato,
        moneda: servicio.moneda,
        categoria: servicio.categoria || "Servicio Técnico",
        region: servicio.region || "MX"
      });
    } else {
      setServicioEditando(null);
      setFormData({ concepto: "", unidad: "hora", precio_sin_contrato: 0, precio_con_contrato: 0, moneda: "USD", categoria: "Servicio Técnico", region: regionTab });
    }
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (servicioEditando) {
        await api.put(`/servicios/${servicioEditando.id}`, formData);
      } else {
        await api.post("/servicios", formData);
      }
      setModalAbierto(false);
      cargarServicios(regionTab);
      toast.success(t("successSaved"));
    } catch { toast.error(t("errorSave")); }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await api.delete(`/servicios/${id}`);
      cargarServicios(regionTab);
    } catch { toast.error(t("errorDelete")); }
  };

  const serviciosFiltrados = servicios.filter(s =>
    s.concepto.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-indigo-600 dark:bg-indigo-700 text-white px-5 py-3 rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all flex items-center gap-2 font-semibold shadow-lg "
          >
            <Plus size={20} />
            {t("newService")}
          </button>
        </div>

        {/* Tabs MX / US */}
        <div className="flex gap-2 mb-6">
          {(["MX", "US"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegionTab(r)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                regionTab === r
                  ? "bg-indigo-600 dark:bg-indigo-700 text-white shadow-lg "
                  : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-600"
              }`}
            >
              {r === "MX" ? "SIG México" : "SIG USA"}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 mb-6 flex items-center gap-3">
          <Search className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="flex-1 outline-none text-gray-700 dark:text-gray-200 bg-transparent placeholder-gray-400 dark:placeholder-gray-500"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? <p className="dark:text-gray-400">{t("loading")}</p> : serviciosFiltrados.map((servicio) => (
            <div key={servicio.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 hover:shadow-md transition-all group relative overflow-hidden">

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
                      {servicio.unidad === 'hora' ? <Clock size={12} /> : <Package size={12} />}
                      {servicio.unidad}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${servicio.region === 'US' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'}`}>
                      {servicio.region === 'US' ? 'US' : 'MX'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal(servicio)} className="text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400"><Edit size={16} /></button>
                    <button onClick={() => handleEliminar(servicio.id)} className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight mb-4 h-14 overflow-hidden">
                  {servicio.concepto}
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t("standardPrice")}</span>
                    <span className="font-bold text-gray-700 dark:text-white">
                      ${servicio.precio_sin_contrato.toFixed(2)} <span className="text-xs">{servicio.moneda}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                    <span className="text-xs text-green-700 dark:text-green-400 font-semibold">{t("contractPrice")}</span>
                    <span className="font-bold text-green-700 dark:text-green-400">
                      ${servicio.precio_con_contrato.toFixed(2)} <span className="text-xs">{servicio.moneda}</span>
                    </span>
                  </div>

                  {servicio.categoria && (
                    <div className="mt-2 text-center text-[10px] font-bold tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 py-1 rounded-md uppercase">
                      {servicio.categoria}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-transparent dark:border-zinc-800">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {servicioEditando ? t("modalEdit") : t("modalNew")}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full p-1"><X size={20} /></button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t("concept")}</label>
                <input required className="w-full p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all dark:placeholder-gray-500"
                  value={formData.concepto} onChange={e => setFormData({ ...formData, concepto: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Región</label>
                <select className="w-full p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all appearance-none mb-4"
                  value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })}>
                  <option value="MX">SIG México</option>
                  <option value="US">SIG USA</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select className="w-full p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all appearance-none"
                  value={formData.categoria} onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                  <option value="Servicio Técnico">Servicio Técnico</option>
                  <option value="Servicio de Ingeniería Aséptica">Servicio de Ingeniería Aséptica</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t("unit")}</label>
                  <select className="w-full p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                    value={formData.unidad} onChange={e => setFormData({ ...formData, unidad: e.target.value })}>
                    <option value="hora">{t("unitHour")}</option>
                    <option value="dia">{t("unitDay")}</option>
                    <option value="evento">{t("unitEvent")}</option>
                    <option value="pieza">{t("unitPiece")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t("currency")}</label>
                  <select className="w-full p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                    value={formData.moneda} onChange={e => setFormData({ ...formData, moneda: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{t("standardPrice")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400 dark:text-gray-500">$</span>
                    <input type="number" step="0.01" className="w-full pl-8 p-3 border border-gray-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all"
                      value={formData.precio_sin_contrato} onChange={e => setFormData({ ...formData, precio_sin_contrato: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-green-600 dark:text-green-400 mb-1">{t("contractPrice")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-green-600 dark:text-green-400">$</span>
                    <input type="number" step="0.01" className="w-full pl-8 p-3 border border-green-200 dark:border-green-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-bold"
                      value={formData.precio_con_contrato} onChange={e => setFormData({ ...formData, precio_con_contrato: parseFloat(e.target.value) })} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl font-bold hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-lg mt-4 transition-all">
                {t("saveService")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}