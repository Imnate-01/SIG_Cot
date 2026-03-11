"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Plus, Search, Edit, Trash2, MapPin, Phone, Mail, X, User } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ClienteDireccion {
  id?: number;
  nombre_ubicacion?: string;
  direccion?: string;
  colonia?: string;
  ciudad?: string;
  cp?: string;
  contacto_nombre?: string;
  contacto_correo?: string;
}

interface Cliente {
  id: number;
  nombre: string;
  empresa?: string | null;
  contacto_nombre?: string | null;
  direccion?: string | null;
  colonia?: string | null;
  ciudad?: string | null;
  cp?: string | null;
  correo?: string | null;
  telefono?: string | null;
  cliente_direcciones?: ClienteDireccion[];
}

export default function ClientesPage() {
  const t = useTranslations("Clientes");
  const tCommon = useTranslations("Common");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    empresa: "",
    contacto_nombre: "",
    direccion: "",
    colonia: "",
    ciudad: "",
    cp: "",
    correo: "",
    telefono: "",
    cliente_direcciones: [] as ClienteDireccion[],
  });

  const cargarClientes = async () => {
    try {
      const { data } = await api.get("/clientes");
      const lista: Cliente[] = Array.isArray(data) ? data : (data?.data ?? []);
      setClientes(lista);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const abrirModal = (cliente?: Cliente) => {
    if (cliente) {
      setClienteEditando(cliente);
      setFormData({
        nombre: cliente.nombre ?? "",
        empresa: cliente.empresa ?? "",
        contacto_nombre: cliente.contacto_nombre ?? "",
        direccion: cliente.direccion ?? "",
        colonia: cliente.colonia ?? "",
        ciudad: cliente.ciudad ?? "",
        cp: cliente.cp ?? "",
        correo: cliente.correo ?? "",
        telefono: cliente.telefono ?? "",
        cliente_direcciones: cliente.cliente_direcciones || [],
      });
    } else {
      setClienteEditando(null);
      setFormData({
        nombre: "",
        empresa: "",
        contacto_nombre: "",
        direccion: "",
        colonia: "",
        ciudad: "",
        cp: "",
        correo: "",
        telefono: "",
        cliente_direcciones: [],
      });
    }
    setModalAbierto(true);
  };

  const agregarDireccion = () => {
    setFormData(prev => ({
      ...prev,
      cliente_direcciones: [...prev.cliente_direcciones, { nombre_ubicacion: "", direccion: "", colonia: "", ciudad: "", cp: "" }]
    }));
  };

  const actualizarDireccion = (index: number, campo: keyof ClienteDireccion, valor: string) => {
    setFormData(prev => {
      const nuevas = [...prev.cliente_direcciones];
      nuevas[index] = { ...nuevas[index], [campo]: valor };
      return { ...prev, cliente_direcciones: nuevas };
    });
  };

  const eliminarDireccion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cliente_direcciones: prev.cliente_direcciones.filter((_, i) => i !== index)
    }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clienteEditando) {
        await api.put(`/clientes/${clienteEditando.id}`, formData);
        toast.success(t("successSaved"));
      } else {
        await api.post("/clientes", formData);
        toast.success(t("successCreated"));
      }
      setModalAbierto(false);
      cargarClientes();
    } catch (error) {
      console.error(error);
      toast.error(t("errorSave"));
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      await api.delete(`/clientes/${id}`);
      cargarClientes();
    } catch (error) {
      console.error(error);
      toast.error(t("errorDelete"));
    }
  };

  const clientesFiltrados = clientes.filter((c) =>
    (c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.empresa || "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.contacto_nombre || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 dark:bg-blue-700 text-white px-5 py-3 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
          >
            <Plus size={20} />
            {t("newClient")}
          </button>
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
          {loading ? (
            <p className="col-span-3 text-center py-10 dark:text-gray-400">{t("loading")}</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="col-span-3 text-center py-10 text-gray-500 dark:text-gray-400">{t("noResults")}</p>
          ) : (
            clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {(cliente.nombre || "C").charAt(0)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirModal(cliente)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 bg-gray-50 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 rounded-lg"
                      title={tCommon("edit")}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminar(cliente.id)}
                      className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 bg-gray-50 hover:bg-red-50 dark:bg-zinc-800 dark:hover:bg-red-900/30 rounded-lg"
                      title={tCommon("delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-gray-800 dark:text-white text-lg truncate" title={cliente.nombre}>
                  {cliente.nombre}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate" title={cliente.empresa ?? ""}>
                  {cliente.empresa || "—"}
                </p>

                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 pt-4">
                  <div className="flex flex-col gap-3">
                    {cliente.cliente_direcciones && cliente.cliente_direcciones.map((dir, idx) => (
                      <div key={idx} className="flex items-start gap-2 pl-3 border-l-2 border-gray-100 dark:border-zinc-800 ml-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-600 shrink-0 mt-1.5 -ml-[5px]" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-medium text-gray-600 dark:text-gray-400 text-[11px] mb-0.5">
                            {dir.nombre_ubicacion || `Sucursal ${idx + 1}`}
                          </span>
                          <span className="block truncate text-[11px] text-gray-400 dark:text-gray-500">
                            {dir.ciudad || "Sin ciudad"}{dir.colonia ? `, ${dir.colonia}` : ""}
                          </span>
                          {(dir.contacto_nombre || dir.contacto_correo) && (
                            <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-gray-500">
                              {dir.contacto_nombre && <span className="truncate flex items-center gap-1.5 text-gray-600 dark:text-gray-400"><User size={11} className="shrink-0"/>{dir.contacto_nombre}</span>}
                              {dir.contacto_correo && <span className="truncate flex items-center gap-1.5"><Mail size={11} className="shrink-0"/>{dir.contacto_correo}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-transparent dark:border-zinc-800">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-900 z-10 transition-colors">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {clienteEditando ? t("modalEdit") : t("modalNew")}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full dark:text-gray-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("businessName")}</label>
                  <input
                    required
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("commercialName")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("address")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("neighborhood")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.colonia}
                    onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("city")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("zipCode")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.cp}
                    onChange={(e) => setFormData({ ...formData, cp: e.target.value })}
                  />
                </div>

                <div className="col-span-2 border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2">
                  <p className="text-sm font-bold text-gray-800 dark:text-white mb-3">{t("contactData")}</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("contactName")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.contacto_nombre}
                    onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                    placeholder={t("contactNamePlaceholder")}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("email")}</label>
                  <input
                    type="email"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  />
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("phone")}</label>
                  <input
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all dark:placeholder-gray-500"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <div className="col-span-2 border-t border-gray-100 dark:border-zinc-800 pt-6 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">Direcciones Adicionales (Sucursales / Ship To)</p>
                    <button type="button" onClick={agregarDireccion} className="text-xs flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                      <Plus size={14} /> Nueva
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.cliente_direcciones.map((dir, idx) => (
                      <div key={idx} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative">
                        <button type="button" onClick={() => eliminarDireccion(idx)} className="absolute top-3 right-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-2 gap-3 pr-8">
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nombre Ubicación (Ej: Planta Norte)</label>
                            <input value={dir.nombre_ubicacion} onChange={(e) => actualizarDireccion(idx, 'nombre_ubicacion', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Dirección</label>
                            <input value={dir.direccion} onChange={(e) => actualizarDireccion(idx, 'direccion', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Colonia</label>
                            <input value={dir.colonia} onChange={(e) => actualizarDireccion(idx, 'colonia', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Ciudad</label>
                            <input value={dir.ciudad} onChange={(e) => actualizarDireccion(idx, 'ciudad', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Código Postal</label>
                            <input value={dir.cp} onChange={(e) => actualizarDireccion(idx, 'cp', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nombre Contacto</label>
                            <input value={dir.contacto_nombre || ""} onChange={(e) => actualizarDireccion(idx, 'contacto_nombre', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" placeholder="Ej: Juan Pérez" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Correo Electrónico</label>
                            <input value={dir.contacto_correo || ""} onChange={(e) => actualizarDireccion(idx, 'contacto_correo', e.target.value)} className="w-full p-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:border-blue-500 outline-none" placeholder="juan@empresa.com" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.cliente_direcciones.length === 0 && (
                      <p className="text-sm text-gray-500 italic text-center py-4 border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">Sin direcciones adicionales</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 dark:bg-blue-700 rounded-xl font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg transition-colors"
                >
                  {t("saveClient")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
