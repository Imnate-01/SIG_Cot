"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  Save,
  ArrowLeft,
  FileCheck,
  Trash2,
  Eye,
  X,
  Download,
  FileText
} from "lucide-react";
import dynamic from "next/dynamic";
import { CotizacionGuardadaPDF } from "@/features/cotizaciones/pdf/CotizacionGuardadaPDF";
import { toast } from "sonner"; // Importamos toast
import { useTranslations } from "next-intl";

// --- 1. CARGA DINÁMICA DEL VISOR ---
const PDFViewerDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p className="text-center p-4">Cargando visor...</p> }
);

// --- 4. PÁGINA PRINCIPAL DE GESTIÓN ---
export default function GestionCotizacion() {
  const t = useTranslations("GestionCotizacion");
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [estado, setEstado] = useState("borrador");
  const [ordenCompra, setOrdenCompra] = useState("");
  const [estatusPO, setEstatusPO] = useState("pendiente");

  const [cotizacion, setCotizacion] = useState<any>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        const { data } = await api.get(`/cotizaciones/${id}`);
        setCotizacion(data.data);
        setEstado(data.data.estado || "borrador");
        setOrdenCompra(data.data.orden_compra || "");
        setEstatusPO(data.data.estatus_po || "pendiente");
      } catch {
        toast.error("Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCotizacion();
  }, [id]);

  const handleGuardarCambios = async () => {
    try {
      await api.put(`/cotizaciones/${id}/estado`, {
        estado,
        orden_compra: ordenCompra,
        estatus_po: estatusPO
      });
      toast.success(t("toastStatusUpdated"), { description: t("toastStatusUpdatedDesc") });
      router.push("/cotizaciones");
    } catch {
      toast.error(t("toastStatusError"), { description: t("toastStatusErrorDesc") });
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm(t("confirmDelete"));
    if (!confirmado) return;
    try {
      await api.delete(`/cotizaciones/${id}`);
      toast.success(t("toastDeleted"), { description: t("toastDeletedDesc") });
      router.push("/cotizaciones");
    } catch (error) {
      console.error(error);
      toast.error(t("toastDeleteError"), { description: t("toastDeleteErrorDesc") });
    }
  };

  const handleDownloadPdf = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<CotizacionGuardadaPDF data={cotizacion} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion_${cotizacion.numero_cotizacion}.pdf`;
    link.click();
  };

  if (loading) return <div className="p-10 text-center dark:text-white">{t("loading")}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 flex justify-center">
      <div className="w-full max-w-2xl">

        <Link href="/cotizaciones" className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> {t("backToBoard")}
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 dark:bg-blue-700 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileCheck /> {t("title")}
              </h2>
              <p className="opacity-90 mt-2">{t("folio")}: {cotizacion?.numero_cotizacion}</p>
              <p className="opacity-75 text-sm">{cotizacion?.clientes?.nombre}</p>

              {/* Descripción — solo renderiza si existe */}
              {cotizacion?.descripcion && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm border border-white/20">
                  <span className="opacity-60 text-xs">📋</span>
                  <span className="font-medium">{cotizacion.descripcion}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPdfModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-semibold backdrop-blur-sm shadow-sm"
            >
              <Eye size={18} /> {t("btnPreview")}
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-center mb-4">
              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-white px-4 py-2 rounded-full font-bold text-lg border border-gray-200 dark:border-zinc-700">
                {t("total")}: ${Number(cotizacion?.total).toLocaleString()} USD
              </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("statusLabel")}</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="borrador">{t("statusDraft")}</option>
                <option value="aceptada">{t("statusWon")}</option>
                <option value="rechazada">{t("statusLost")}</option>
              </select>
            </div>

            {estado === "aceptada" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2">
                  {t("poDataTitle")}
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1">{t("poNumber")}</label>
                    <input
                      type="text"
                      value={ordenCompra}
                      onChange={(e) => setOrdenCompra(e.target.value)}
                      placeholder={t("poPlaceholder")}
                      className="w-full p-3 border border-green-300 dark:border-green-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-green-600 dark:focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1">{t("poStatus")}</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="po_status"
                          value="pendiente"
                          checked={estatusPO === "pendiente"}
                          onChange={() => setEstatusPO("pendiente")}
                          className="accent-orange-500 w-5 h-5"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{t("poPending")}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="po_status"
                          value="completada"
                          checked={estatusPO === "completada"}
                          onChange={() => setEstatusPO("completada")}
                          className="accent-green-600 w-5 h-5"
                        />
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{t("poCompleted")}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">

              {/* Botón Editar solo si es borrador */}
              {estado === "borrador" && (
                <Link
                  href={`/cotizaciones/editar/${id}`}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <FileText size={24} /> {t("btnEdit")}
                </Link>
              )}

              <button
                onClick={handleGuardarCambios}
                className="w-full bg-blue-600 dark:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Save size={24} /> {t("btnSave")}
              </button>

              <button
                onClick={handleEliminar}
                className="w-full bg-white dark:bg-transparent text-red-600 dark:text-red-400 border-2 border-red-100 dark:border-red-900/50 py-3 rounded-xl font-bold text-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={20} /> {t("btnDelete")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 dark:border-zinc-800">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t("modalPreviewTitle", { folio: cotizacion?.numero_cotizacion })}</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Download size={16} /> {t("btnDownload")}
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-zinc-950">
              <PDFViewerDynamic width="100%" height="100%" className="border-0">
                <CotizacionGuardadaPDF data={cotizacion} />
              </PDFViewerDynamic>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}