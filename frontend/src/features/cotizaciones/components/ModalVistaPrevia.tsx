"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import { Download, X, Paperclip, FileCheck, Sparkles, Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import api from "@/services/api";
import { CotizacionPDF } from "../pdf/CotizacionPDF";
import { sumarTotales } from "../pricing";
import type { CotizacionFormData, ServicioTarifado, Tarifa, UsuarioRegistrado } from "../types";

/**
 * Vista previa del PDF + adjuntar reporte técnico (merge) + correo con IA.
 */
export interface ModalVistaPreviaProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CotizacionFormData;
  itemsServicio: ServicioTarifado[];
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[];
  tarifasCliente?: Record<string, number>;
}

export const ModalVistaPrevia: React.FC<ModalVistaPreviaProps> = ({ isOpen, onClose, formData, itemsServicio, tarifas, folio, usuariosRegistrados, tarifasCliente = {} }) => {
  const t = useTranslations("NuevaCotizacion");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let url = "";
    const renderPDF = async () => {
      try {
        const { pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(
          <CotizacionPDF
            formData={formData}
            itemsServicio={itemsServicio}
            tarifas={tarifas}
            folio={folio}
            usuariosRegistrados={usuariosRegistrados}
            tarifasCliente={tarifasCliente}
          />
        ).toBlob();
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (e) {
        console.error("PDF Render Error", e);
      }
    };
    renderPDF();
    return () => { if (url) URL.revokeObjectURL(url); };
  // tarifasCliente incluido: antes la vista previa podía mostrar precios viejos
  // si las tarifas especiales del cliente llegaban después de abrirla
  }, [isOpen, formData, itemsServicio, tarifas, folio, usuariosRegistrados, tarifasCliente]);

  const [correoGenerado, setCorreoGenerado] = useState("");
  const [generandoCorreo, setGenerandoCorreo] = useState(false);
  const folioParaIA = folio || "PENDIENTE DE ASIGNACIÓN";

  const [reporteTecnico, setReporteTecnico] = useState<File | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setReporteTecnico(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false });

  if (!isOpen) return null;

  const copiarAlPortapapeles = (texto: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => toast.success(t("toastCopied"))).catch(() => copiarFallback(texto));
    } else {
      copiarFallback(texto);
    }
  };

  const copiarFallback = (texto: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = texto;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); toast.success(t("toastCopied")); } catch { toast.error(t("toastCopyError")); }
    document.body.removeChild(textArea);
  };

  const generarCorreo = async () => {
    setGenerandoCorreo(true);
    try {
      const subtotal = sumarTotales(itemsServicio);
      const total = subtotal;

      const { data } = await api.post("/ia/generar-correo", {
        cliente: formData.facturarA.nombre,
        numeroCotizacion: folioParaIA,
        servicios: itemsServicio.map(i => {
          const t = tarifas.find(t => String(t.id) === i.tarifaId);
          return t ? t.concepto : "";
        }).join(", "),
        total: total.toFixed(2),
        moneda: formData.condiciones.moneda
      });
      if (data.result) setCorreoGenerado(data.result);
    } catch {
      toast.error(t("toastAiError"));
    } finally {
      setGenerandoCorreo(false);
    }
  };

  const handleDownloadMerged = async () => {
    setIsMerging(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const quoteBlob = await pdf(
        <CotizacionPDF
          formData={formData}
          itemsServicio={itemsServicio}
          tarifas={tarifas}
          folio={folio}
          usuariosRegistrados={usuariosRegistrados}
          tarifasCliente={tarifasCliente}
        />
      ).toBlob();

      const isUS = formData.condiciones.entidad === "US" || formData.condiciones.entidad === "CA";
      const baseName = isUS ? "Quote" : "Cotizacion";
      const draftName = isUS ? "Draft" : "Borrador";

      if (!reporteTecnico) {
        const url = URL.createObjectURL(quoteBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${baseName}_${folio || draftName}.pdf`;
        link.click();
        setIsMerging(false);
        return;
      }

      const quoteArrayBuffer = await quoteBlob.arrayBuffer();
      const reportArrayBuffer = await reporteTecnico.arrayBuffer();
      const mergedPdf = await PDFDocument.create();
      const quotePdf = await PDFDocument.load(quoteArrayBuffer);
      const reportPdf = await PDFDocument.load(reportArrayBuffer);

      (await mergedPdf.copyPages(quotePdf, quotePdf.getPageIndices())).forEach(page => mergedPdf.addPage(page));
      (await mergedPdf.copyPages(reportPdf, reportPdf.getPageIndices())).forEach(page => mergedPdf.addPage(page));

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}_${folio || draftName}_FULL.pdf`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      toast.error(t("toastMergeError"));
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-row overflow-hidden border border-gray-200 dark:border-zinc-800">
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("previewTitle")}</h2>
            <div className="flex items-center gap-3">
              <button onClick={handleDownloadMerged} disabled={isMerging} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50">
                {isMerging ? t("btnGenerating") : <><Download size={18} /> {reporteTecnico ? t("btnDownloadMerge") : t("btnDownload")}</>}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 dark:text-gray-400"><X size={24} /></button>
            </div>
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-zinc-950 relative">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>{t("loadingPreview")}</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-1/3 bg-gray-50 dark:bg-zinc-950 p-6 flex flex-col overflow-y-auto gap-8 border-l border-gray-200 dark:border-zinc-800">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3"><Paperclip size={16} className="text-blue-600 dark:text-blue-400" /> {t("attachReport")}</h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
              <input {...getInputProps()} />
              {reporteTecnico ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <FileCheck size={20} /><span className="text-sm truncate max-w-[200px]">{reporteTecnico.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setReporteTecnico(null); }} className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full"><X size={14} /></button>
                </div>
              ) : (<div className="text-gray-500 dark:text-gray-400 text-xs"><p className="mb-1">{t("dragDrop")}</p><span className="text-blue-500 dark:text-blue-400 underline">{t("clickToBrowse")}</span></div>)}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">{t("mergeNote")}</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2"><Sparkles className="text-blue-600 dark:text-blue-400" /> {t("aiAssistant")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("aiAssistantDesc")}</p>
            <button onClick={generarCorreo} disabled={generandoCorreo} className="w-full py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-50">
              {generandoCorreo ? <span className="animate-pulse">{t("btnAiDrafting")}</span> : <><Mail size={18} /> {t("btnAiMail")}</>}
            </button>
            {correoGenerado && (
              <div className="mt-4 flex-1 flex flex-col animate-fadeIn">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t("aiDraftSuggested")}</label>
                <textarea className="w-full h-48 p-4 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" value={correoGenerado} readOnly />
                <button onClick={() => copiarAlPortapapeles(correoGenerado)} className="mt-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-zinc-800 flex justify-center items-center gap-2 transition-colors"><Copy size={16} /> {t("btnCopyText")}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
