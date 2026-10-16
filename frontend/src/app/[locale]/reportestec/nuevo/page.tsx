"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Camera,
  Plus,
  Trash2,
  FileText,
  CheckSquare,
  RefreshCcw,
  ShieldCheck,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ReporteTecnicoPDF } from "@/components/ReporteTecnicoPDF";
import { todayISO, cx, uid, safeParse } from "@/features/reportes-tecnicos/utils";
import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import { SignaturePad } from "@/features/reportes-tecnicos/components/SignaturePad";

const PDFViewerDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p>Cargando visor...</p> }
);

type EstadoItem = "Conformable" | "Non-compliant" | "Unverified" | "N/A";

interface CatalogoItem {
  id: number;
  descripcion: string;
  tipo_input: string;
  seccion_id: number;
  requiere_foto?: boolean;
}

interface SeccionCatalogo {
  id: number;
  nombre: string;
  items: CatalogoItem[];
}

interface RespuestaInspeccion {
  item_id: number;
  estado: EstadoItem;
  comentarios?: string;

  // Multi evidencia local (preview) -> se convierte a URLs en backend (o storage)
  evidenciasLocal?: { url: string; file: File }[];

  // Si ya existe url(s) guardada(s)
  evidencias?: string[];
}

interface Participante {
  id: string;
  nombre: string;
  puesto: string;
  empresa: string;
}

interface AccionPlan {
  id: string; // UI only
  descripcion: string;
  tipo: "Action Plan" | "Recommendation";
  responsable: string;
  fecha: string;
  criticidad: "High" | "Medium" | "Low";
  wo_numero?: string;
  share?: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function NuevoReporteTecnicoPage() {
  const router = useRouter();

  const t = useTranslations("NuevoReporte");
  const tPDFhook = useTranslations("ReportePDF");

  const tPDF = {
    headerTitle: tPDFhook("headerTitle"),
    headerSub: tPDFhook("headerSub"),
    conformable: tPDFhook("conformable"),
    nonCompliant: tPDFhook("nonCompliant"),
    pending: tPDFhook("pending"),
    na: tPDFhook("na"),
    total: tPDFhook("total"),
    generalInfo: tPDFhook("generalInfo"),
    lblClient: tPDFhook("lblClient"),
    lblPlant: tPDFhook("lblPlant"),
    lblResponsible: tPDFhook("lblResponsible"),
    lblDate: tPDFhook("lblDate"),
    lblMachine: tPDFhook("lblMachine"),
    lblHours: tPDFhook("lblHours"),
    lblPurpose: tPDFhook("lblPurpose"),
    execSummary: tPDFhook("execSummary"),
    noFinalComments: tPDFhook("noFinalComments"),
    inspectionPoint: tPDFhook("inspectionPoint"),
    status: tPDFhook("status"),
    obsEvidence: tPDFhook("obsEvidence"),
    actionPlanClosing: tPDFhook("actionPlanClosing"),
    noActions: tPDFhook("noActions"),
    lblEfficiencies: tPDFhook("lblEfficiencies"),
    lblLosses: tPDFhook("lblLosses"),
    sigEngineer: tPDFhook("sigEngineer"),
    clientResponsible: tPDFhook("clientResponsible"),
    footerPrefix: tPDFhook("footerPrefix"),
    footerPage: tPDFhook("footerPage"),
  };

  const [loading, setLoading] = useState(true);
  const [savingFinal, setSavingFinal] = useState(false);

  const [paso, setPaso] = useState<Step>(1);

  const [catalogo, setCatalogo] = useState<SeccionCatalogo[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [direccionesCliente, setDireccionesCliente] = useState<any[]>([]);
  const [usarPlantaOtra, setUsarPlantaOtra] = useState(false);
  const [seccionActivaId, setSeccionActivaId] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastDraftAt, setLastDraftAt] = useState<number | null>(null);
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);

  // ── DATOS GENERALES (alineado a tu tabla)
  const [datos, setDatos] = useState({
    cliente_id: "",
    cotizacion_id: "",
    planta: "",
    fecha_inicio: todayISO(),
    fecha_fin: todayISO(),
    responsable_cliente: "",
    email_cliente: "",
    telefono_cliente: "",
    maquina_serie: "",
    horas_maquina: "",
    proposito_visita: "Preventive Maintenance (PMSA)",
    reunion_apertura: false,
    reunion_cierre: false,
    comentarios_apertura: "",
    tipo_llenado: "Water",
    tipo_envase: "Test",
    envase_desechado: false,
  });

  // Checklist
  const [respuestas, setRespuestas] = useState<Record<number, RespuestaInspeccion>>({});
  const [comentariosSeccion, setComentariosSeccion] = useState<Record<number, string>>({});

  // Conclusión (alineado a tu tabla)
  const [cierre, setCierre] = useState({
    comentarios_finales: "",
    eficiencias: "",
    perdidas: "",
    customer_review: "",
  });

  // Acciones (alineado a tu tabla)
  const [acciones, setAcciones] = useState<AccionPlan[]>([]);

  // Participantes
  const [participantes, setParticipantes] = useState<Participante[]>([]);

  // Firmas (canvas base64 -> backend lo sube y guarda URL)
  const [firmaSIG, setFirmaSIG] = useState<string | undefined>(undefined);
  const [firmaCliente, setFirmaCliente] = useState<string | undefined>(undefined);

  // PDF State
  const [showPdfModal, setShowPdfModal] = useState(false);

  // ─────────────────────────────────────────────
  // Load initial
  // ─────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [resCat, resCli] = await Promise.all([
          api.get("/reportes-tecnicos/catalogos"),
          api.get("/clientes"),
        ]);

        const cat = resCat.data.data as SeccionCatalogo[];
        setCatalogo(cat);
        setClientes(resCli.data.data || resCli.data);

        if (cat.length > 0) setSeccionActivaId(cat[0].id);

        // Restore local draft (fallback)
        const local = safeParse<any>(localStorage.getItem("tsr_draft_v3"));
        if (local?.datos) setDatos(local.datos);
        if (local?.respuestas) setRespuestas(local.respuestas);
        if (local?.comentariosSeccion) setComentariosSeccion(local.comentariosSeccion);
        if (local?.cierre) setCierre(local.cierre);
        if (local?.acciones) setAcciones(local.acciones);
        if (local?.participantes) setParticipantes(local.participantes);
        if (local?.paso) setPaso(local.paso);
        if (local?.seccionActivaId) setSeccionActivaId(local.seccionActivaId);
        if (local?.firmaSIG) setFirmaSIG(local.firmaSIG);
        if (local?.firmaCliente) setFirmaCliente(local.firmaCliente);
        if (local?.serverDraftId) setServerDraftId(local.serverDraftId);

      } catch (e) {
        console.error(e);
        setErrorMsg("Error cargando catálogos/clientes.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const seccionActiva = useMemo(
    () => (seccionActivaId ? catalogo.find((s) => s.id === seccionActivaId) : null),
    [catalogo, seccionActivaId]
  );

  const totalItems = useMemo(() => catalogo.flatMap((s) => s.items).length, [catalogo]);
  const contestadas = useMemo(() => {
    const all = catalogo.flatMap((s) => s.items);
    return all.filter((i) => !!respuestas[i.id]?.estado).length;
  }, [catalogo, respuestas]);

  const progresoGlobal = useMemo(() => (totalItems ? Math.round((contestadas / totalItems) * 100) : 0), [contestadas, totalItems]);

  const nonCompliantCount = useMemo(
    () => Object.values(respuestas).filter((r) => r?.estado === "Non-compliant").length,
    [respuestas]
  );

  const seccionesMeta = useMemo(() => {
    return catalogo.map((sec) => {
      const total = sec.items.length || 0;
      const answered = sec.items.filter((i) => !!respuestas[i.id]?.estado).length;
      const non = sec.items.filter((i) => respuestas[i.id]?.estado === "Non-compliant").length;

      // FIX: Si total es 0, pct es 0 en vez de 100
      const pct = total ? Math.round((answered / total) * 100) : 0;

      return { ...sec, total, answered, non, pct };
    });
  }, [catalogo, respuestas]);

  // ─────────────────────────────────────────────
  // Autosave draft (local + API)
  // ─────────────────────────────────────────────
  const draftPayload = useMemo(() => {
    return {
      datos,
      respuestas,
      comentariosSeccion,
      cierre,
      acciones,
      participantes,
      paso,
      seccionActivaId,
      firmaSIG,
      firmaCliente,
    };
  }, [acciones, cierre, comentariosSeccion, datos, firmaCliente, firmaSIG, participantes, paso, respuestas, seccionActivaId]);

  useDebouncedEffect(() => {
    if (loading) return;

    // local
    localStorage.setItem("tsr_draft_v3", JSON.stringify({ ...draftPayload, serverDraftId }));

    // api draft
    (async () => {
      try {
        setDraftStatus("saving");
        const resp = await api.post("/reportes-tecnicos/draft", {
          cliente_id: datos.cliente_id || null,
          draft_id: serverDraftId,
          datos_generales: datos,
          payload: draftPayload,
        });

        if (resp.data?.data?.id && !serverDraftId) {
          setServerDraftId(resp.data.data.id);
        }

        setDraftStatus("saved");
        setLastDraftAt(Date.now());
      } catch {
        setDraftStatus("error");
      }
    })();
  }, [draftPayload, serverDraftId], 900);

  const DraftBadge = () => {
    const label =
      draftStatus === "saving" ? "Guardando borrador…" :
        draftStatus === "saved" ? "Borrador guardado" :
          draftStatus === "error" ? "Error guardando borrador" :
            "Autosave activo";

    const icon =
      draftStatus === "saving" ? <Loader2 className="animate-spin" size={14} /> :
        draftStatus === "saved" ? <ShieldCheck size={14} /> :
          draftStatus === "error" ? <ShieldAlert size={14} /> :
            <RefreshCcw size={14} />;

    const cls =
      draftStatus === "error" ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900" :
        draftStatus === "saved" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900" :
          "bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-zinc-700";

    return (
      <div className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors", cls)}>
        {icon}
        <span>{label}{draftStatus === "saved" && lastDraftAt ? ` • ${Math.round((Date.now() - lastDraftAt) / 1000)}s` : ""}</span>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const setEstadoItem = (itemId: number, estado: EstadoItem) => {
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        item_id: itemId,
        estado,
        comentarios: prev[itemId]?.comentarios || "",
        evidenciasLocal: prev[itemId]?.evidenciasLocal || [],
        evidencias: prev[itemId]?.evidencias || [],
      },
    }));
  };

  const setComentarioItem = (itemId: number, texto: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        item_id: itemId,
        estado: prev[itemId]?.estado || "Unverified",
        comentarios: texto,
        evidenciasLocal: prev[itemId]?.evidenciasLocal || [],
        evidencias: prev[itemId]?.evidencias || [],
      },
    }));
  };

  const addEvidenciasItem = (itemId: number, files: FileList) => {
    const list = Array.from(files);
    setRespuestas((prev) => {
      const current = prev[itemId] || { item_id: itemId, estado: "Unverified" as EstadoItem };
      const nextLocal = [...(current.evidenciasLocal || [])];
      for (const f of list) nextLocal.push({ url: URL.createObjectURL(f), file: f });
      return {
        ...prev,
        [itemId]: { ...current, evidenciasLocal: nextLocal, evidencias: current.evidencias || [] },
      };
    });
  };

  const removeEvidenciaItem = (itemId: number, index: number) => {
    setRespuestas((prev) => {
      const cur = prev[itemId];
      if (!cur?.evidenciasLocal?.length) return prev;
      const rm = cur.evidenciasLocal[index];
      if (rm?.url) URL.revokeObjectURL(rm.url);
      return { ...prev, [itemId]: { ...cur, evidenciasLocal: cur.evidenciasLocal.filter((_, i) => i !== index) } };
    });
  };

  const comentarioSeccionActiva = seccionActivaId ? comentariosSeccion[seccionActivaId] || "" : "";
  const setComentarioSeccionActiva = (texto: string) => {
    if (!seccionActivaId) return;
    setComentariosSeccion((prev) => ({ ...prev, [seccionActivaId]: texto }));
  };

  // Participantes
  const agregarParticipante = () => {
    setParticipantes(prev => [...prev, { id: uid(), nombre: "", puesto: "", empresa: "SIG" }]);
  };
  const actualizarParticipante = (id: string, campo: keyof Participante, valor: string) => {
    setParticipantes(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };
  const eliminarParticipante = (id: string) => {
    setParticipantes(prev => prev.filter(p => p.id !== id));
  };

  // Acciones
  const agregarAccion = (prefill?: Partial<AccionPlan>) => {
    setAcciones((prev) => [
      ...prev,
      {
        id: uid(),
        descripcion: "",
        tipo: "Action Plan",
        responsable: "SIG",
        fecha: "",
        criticidad: "Medium",
        wo_numero: "",
        share: false,
        ...prefill,
      },
    ]);
  };

  const actualizarAccion = (id: string, campo: keyof AccionPlan, valor: any) => {
    setAcciones((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  };

  const eliminarAccion = (id: string) => setAcciones((prev) => prev.filter((a) => a.id !== id));

  // ─────────────────────────────────────────────
  // Validaciones steps
  // ─────────────────────────────────────────────
  const validarPaso1 = () => {
    if (!datos.cliente_id) return "Selecciona un cliente.";
    if (!datos.planta.trim()) return "Ingresa planta/ubicación.";
    if (!datos.maquina_serie.trim()) return "Ingresa número de serie.";
    if (datos.fecha_inicio > datos.fecha_fin) return "Fecha inicio no puede ser mayor a fecha fin.";
    return null;
  };

  const validarPaso2 = () => {
    if (!totalItems) return "Catálogo vacío.";
    if (progresoGlobal < 100) return "Completa la inspección (todas las preguntas) antes de continuar.";
    // Reglas: Non-compliant requiere comentario + evidencia
    const bad = catalogo.flatMap((s) => s.items).filter((i) => respuestas[i.id]?.estado === "Non-compliant");
    for (const i of bad) {
      const r = respuestas[i.id];
      if (!r?.comentarios?.trim()) return "Hay Non-compliant sin comentario.";
      const localCount = r?.evidenciasLocal?.length || 0;
      const urlCount = r?.evidencias?.length || 0;
      if (localCount + urlCount === 0) return "Hay Non-compliant sin evidencia.";
    }
    return null;
  };

  const validarPaso4 = () => {
    if (!cierre.comentarios_finales.trim()) return "Agrega comentarios finales.";
    return null;
  };

  const validarPaso5 = () => {
    // Si hay fallos, requiere al menos 1 acción
    if (nonCompliantCount > 0 && acciones.length === 0) return "Hay Non-compliant: agrega al menos una acción.";
    for (const a of acciones) {
      if (!a.descripcion.trim()) return "Hay una acción sin descripción.";
      if (!a.responsable.trim()) return "Hay una acción sin responsable.";
    }
    return null;
  };

  const canGoNextMsg = () => {
    const msg =
      paso === 1 ? validarPaso1() :
        paso === 2 ? validarPaso2() :
          paso === 3 ? null :
            paso === 4 ? validarPaso4() :
              paso === 5 ? validarPaso5() :
                null;
    return msg;
  };

  const goPrev = () => setPaso((p) => (p > 1 ? ((p - 1) as Step) : p));
  const goNext = () => {
    const msg = canGoNextMsg();
    if (msg) {
      setErrorMsg(msg);
      return;
    }
    setErrorMsg(null);
    setPaso((p) => (p < 6 ? ((p + 1) as Step) : p));
  };

  // ─────────────────────────────────────────────
  // Finalizar
  // ─────────────────────────────────────────────
  const finalizar = async () => {
    setErrorMsg(null);
    const v1 = validarPaso1();
    if (v1) return setErrorMsg(v1);
    const v2 = validarPaso2();
    if (v2) return setErrorMsg(v2);
    const v4 = validarPaso4();
    if (v4) return setErrorMsg(v4);
    const v5 = validarPaso5();
    if (v5) return setErrorMsg(v5);

    // Prompt for confirmation if skipping preview? (Optional)

    setSavingFinal(true);
    try {
      // 1. Generar PDF Blob
      const clienteNombre = clientes.find((c: any) => String(c.id) === String(datos.cliente_id))?.nombre;

      const doc = (
        <ReporteTecnicoPDF
          datos={datos}
          catalogo={catalogo}
          respuestas={respuestas}
          acciones={acciones}
          cierre={cierre}
          firmaSIG={firmaSIG}
          firmaCliente={firmaCliente}
          clienteNombre={clienteNombre}
          tPDF={tPDF}
        />
      );

      const { pdf } = await import("@react-pdf/renderer");
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      // Aquí podrías subir el blob a Supabase Storage y obtener URL...
      // Por ahora, solo descargamos local al usuario.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_${datos.maquina_serie}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const payload = {
        cliente_id: datos.cliente_id,
        cotizacion_id: datos.cotizacion_id || null,
        datos_generales: {
          planta: datos.planta,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin,
          responsable_cliente: datos.responsable_cliente,
          email_cliente: datos.email_cliente,
          telefono_cliente: datos.telefono_cliente,
          maquina_serie: datos.maquina_serie,
          horas_maquina: datos.horas_maquina ? Number(datos.horas_maquina) : null,
          proposito_visita: datos.proposito_visita,
          reunion_apertura: datos.reunion_apertura,
          reunion_cierre: datos.reunion_cierre,
          comentarios_apertura: datos.comentarios_apertura,
          tipo_llenado: datos.tipo_llenado,
          tipo_envase: datos.tipo_envase,
          envase_desechado: datos.envase_desechado,

          // Cierre (cabecera)
          comentarios_finales: cierre.comentarios_finales,
          eficiencias: cierre.eficiencias,
          perdidas: cierre.perdidas,
          customer_review: cierre.customer_review,
        },

        // Detalles para reporte_detalles
        detalles: Object.values(respuestas).map((r) => ({
          item_id: r.item_id,
          estado: r.estado,
          comentarios: r.comentarios || null,
          fotoUrl: (r.evidencias?.[0] ?? null),
          evidencias: r.evidencias || [],
        })),

        // Acciones para reporte_acciones
        acciones: acciones.map(({ id, ...rest }) => rest),

        // Extra
        meta: {
          comentariosSeccion,
          firmas_base64: {
            sig: firmaSIG || null,
            cliente: firmaCliente || null,
          },
        },
      };

      await api.post("/reportes-tecnicos", payload);

      localStorage.removeItem("tsr_draft_v3");
      toast.success("Reporte creado", { description: "El reporte técnico ha sido guardado exitosamente." });
      router.push("/reportestec");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.error || "Error al finalizar el reporte.");
    } finally {
      setSavingFinal(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-600 dark:text-gray-400">Cargando configuración…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 flex flex-col">
      {/* Header sticky */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-slate-200 dark:border-zinc-800 px-5 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/cotizaciones" className="text-slate-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400">
              <ArrowLeft />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">Nuevo Reporte Técnico (PM)</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Paso <span className="font-bold">{paso}</span> de <span className="font-bold">6</span>
                </p>
                <DraftBadge />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-36 bg-slate-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${progresoGlobal}%` }} />
              </div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-gray-300">{progresoGlobal}%</span>

              {nonCompliantCount > 0 ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                  <XCircle size={14} /> {nonCompliantCount} fallos
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  <CheckCircle2 size={14} /> Sin fallos
                </span>
              )}
            </div>

            {paso > 1 && (
              <button type="button" onClick={goPrev} className="px-4 py-2 rounded-xl font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                Atrás
              </button>
            )}

            {paso < 6 ? (
              <button type="button" onClick={goNext} className="px-5 py-2 rounded-xl font-extrabold text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm inline-flex items-center gap-2 transition-colors">
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finalizar}
                disabled={savingFinal}
                className={cx(
                  "px-5 py-2 rounded-xl font-extrabold text-white shadow-sm inline-flex items-center gap-2 transition-colors",
                  savingFinal ? "bg-emerald-600/70 dark:bg-emerald-700/70" : "bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600"
                )}
              >
                {savingFinal ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Finalizando…
                  </>
                ) : (
                  <>
                    Finalizar Reporte <Save size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 p-5 sm:p-6 max-w-7xl mx-auto w-full">
        {errorMsg && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 font-bold text-sm flex items-start gap-2">
            <AlertCircle className="mt-0.5" size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1 */}
        {/* STEP 1 */}
        {paso === 1 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
              <FileText className="text-blue-600 dark:text-blue-400" /> {t("step1Title")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("client")}</label>
                <select
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.cliente_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDatos({ ...datos, cliente_id: val, planta: "" });
                    const cli = clientes.find((c: any) => String(c.id) === val);
                    const dirs = cli?.cliente_direcciones?.filter((d: any) => d.tipo === 'ship_to') || [];
                    setDireccionesCliente(dirs);
                    setUsarPlantaOtra(dirs.length === 0);
                  }}
                >
                  <option value="">{t("select")}</option>
                  {clientes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("plantLocation")}</label>
                {!usarPlantaOtra && direccionesCliente.length > 0 ? (
                  <select
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={direccionesCliente.some(d => d.empresa_planta_nombre === datos.planta) ? datos.planta : (datos.planta ? "otra" : "")}
                    onChange={(e) => {
                      if (e.target.value === "otra") {
                        setUsarPlantaOtra(true);
                        setDatos({ ...datos, planta: "" });
                      } else {
                        setDatos({ ...datos, planta: e.target.value });
                      }
                    }}
                  >
                    <option value="">{t("select")}</option>
                    {direccionesCliente.map((d: any) => (
                      <option key={d.id} value={d.empresa_planta_nombre}>{d.empresa_planta_nombre}</option>
                    ))}
                    <option value="otra">Otra (Ingresar manualmente)</option>
                  </select>
                ) : (
                  <div className="flex gap-2 isolate">
                    <input
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={datos.planta}
                      onChange={(e) => setDatos({ ...datos, planta: e.target.value })}
                      placeholder={t("plantPlaceholder")}
                    />
                    {direccionesCliente.length > 0 && (
                      <button type="button" onClick={() => setUsarPlantaOtra(false)} className="text-xs font-bold text-blue-600 underline whitespace-nowrap">
                        Volver a lista
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("clientResponsible")}</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.responsable_cliente}
                  onChange={(e) => setDatos({ ...datos, responsable_cliente: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("serialNumber")}</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.maquina_serie}
                  onChange={(e) => setDatos({ ...datos, maquina_serie: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("machineHours")}</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.horas_maquina}
                  onChange={(e) => setDatos({ ...datos, horas_maquina: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("startDate")}</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={datos.fecha_inicio}
                    onChange={(e) => setDatos({ ...datos, fecha_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("endDate")}</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={datos.fecha_fin}
                    onChange={(e) => setDatos({ ...datos, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("email")}</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  value={datos.email_cliente}
                  onChange={(e) => setDatos({ ...datos, email_cliente: e.target.value })}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("phone")}</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
                  value={datos.telefono_cliente}
                  onChange={(e) => setDatos({ ...datos, telefono_cliente: e.target.value })}
                  placeholder="+52 55..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-slate-700 dark:text-gray-300 mb-1">{t("visitPurpose")}</label>
                <input className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white" value={datos.proposito_visita} onChange={(e) => setDatos({ ...datos, proposito_visita: e.target.value })} />
              </div>

              {/* Reunión apertura / cierre + comentario */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50 dark:bg-zinc-900/50">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">{t("meetings")}</p>
                <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-gray-300">
                  <input type="checkbox" checked={datos.reunion_apertura} onChange={(e) => setDatos({ ...datos, reunion_apertura: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                  {t("openingMeeting")}
                </label>
                <label className="mt-2 flex items-center gap-2 font-bold text-slate-700 dark:text-gray-300">
                  <input type="checkbox" checked={datos.reunion_cierre} onChange={(e) => setDatos({ ...datos, reunion_cierre: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                  {t("closingMeeting")}
                </label>
                <textarea className="mt-3 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500" placeholder={t("openingComments")} value={datos.comentarios_apertura} onChange={(e) => setDatos({ ...datos, comentarios_apertura: e.target.value })} />
              </div>

              {/* Producción */}
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 bg-slate-50 dark:bg-zinc-900/50">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">{t("productionTest")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">{t("fillType")}</label>
                    <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white" value={datos.tipo_llenado} onChange={(e) => setDatos({ ...datos, tipo_llenado: e.target.value })}>
                      <option value="Water">Water</option>
                      <option value="Product">Product</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Tipo envase</label>
                    <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white" value={datos.tipo_envase} onChange={(e) => setDatos({ ...datos, tipo_envase: e.target.value })}>
                      <option value="Test">Test</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                <label className="mt-3 inline-flex items-center gap-2 font-bold text-slate-700 dark:text-gray-300">
                  <input type="checkbox" checked={datos.envase_desechado} onChange={(e) => setDatos({ ...datos, envase_desechado: e.target.checked })} className="h-4 w-4 accent-blue-600" />
                  Envase desechado
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: INSPECCIÓN */}
        {paso === 2 && (
          <div className="flex flex-col md:flex-row gap-5 h-[calc(100vh-140px)]">
            {/* Sidebar secciones */}
            <div className="w-full md:w-[320px] bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                <p className="font-extrabold text-slate-800 dark:text-white">Secciones</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  Progreso global: <span className="font-extrabold">{progresoGlobal}%</span> • {contestadas}/{totalItems}
                </p>
              </div>
              <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
                {seccionesMeta.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSeccionActivaId(sec.id)}
                    className={cx(
                      "w-full text-left p-4 border-b border-slate-50 dark:border-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition",
                      seccionActivaId === sec.id && "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600 dark:border-l-blue-500"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className={cx("font-extrabold text-sm truncate", seccionActivaId === sec.id ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-gray-200")}>{sec.nombre}</p>

                        {/* FIX: Mostrar "Sin items" si está vacío */}
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          {sec.total === 0 ? (
                            <span className="italic text-slate-400 dark:text-gray-500">Sin items</span>
                          ) : (
                            <>{sec.answered}/{sec.total} — {sec.pct}%</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sec.non > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                            <XCircle size={12} /> {sec.non}
                          </span>
                        )}

                        {/* FIX: Solo mostrar check si hay items y está completo */}
                        {sec.pct === 100 && sec.non === 0 && sec.total > 0 && (
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${sec.pct}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preguntas */}
            <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-5 border-b bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{seccionActiva?.nombre || "Selecciona una sección"}</h2>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(100vh-240px)] space-y-5">
                {seccionActiva?.items?.length === 0 && (
                  <div className="text-center py-10 text-slate-400 dark:text-gray-500 italic">
                    Esta sección no contiene items para inspeccionar.
                  </div>
                )}

                {seccionActiva?.items?.map((item) => {
                  const resp = respuestas[item.id];
                  const estado = resp?.estado;

                  const isBad = estado === "Non-compliant";
                  const isOk = estado === "Conformable";
                  const isNA = estado === "N/A";
                  const isUnv = estado === "Unverified";

                  const cardBorder =
                    isBad ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-900/10" :
                      isOk ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-900/10" :
                        isNA ? "border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50" :
                          isUnv ? "border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-900/10" :
                            "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900";

                  const needsMore =
                    isBad &&
                    (!resp?.comentarios?.trim() ||
                      ((resp?.evidenciasLocal?.length || 0) + (resp?.evidencias?.length || 0) === 0));

                  return (
                    <div key={item.id} className={cx("rounded-2xl border p-4 sm:p-5 transition-all text-slate-900 dark:text-white", cardBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-extrabold text-sm sm:text-base">{item.descripcion}</p>

                        {isBad ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900">
                            <XCircle size={14} /> NOK
                          </span>
                        ) : isOk ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                            <CheckCircle2 size={14} /> OK
                          </span>
                        ) : isNA ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-zinc-700">
                            <AlertCircle size={14} /> N/A
                          </span>
                        ) : isUnv ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                            <AlertCircle size={14} /> Unverified
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-zinc-700">
                            <AlertCircle size={14} /> Pendiente
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button type="button" onClick={() => setEstadoItem(item.id, "Conformable")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isOk ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-gray-300")}>
                          <CheckCircle2 size={16} /> OK
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "Non-compliant")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isBad ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-gray-300")}>
                          <XCircle size={16} /> NOK
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "Unverified")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isUnv ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-gray-300")}>
                          <AlertCircle size={16} /> Unverified
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "N/A")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isNA ? "bg-slate-700 text-white border-slate-700" : "bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-gray-300")}>
                          <AlertCircle size={16} /> N/A
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2">
                          <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">
                            Comentarios / Observaciones {isBad ? <span className="text-red-700 dark:text-red-400">(obligatorio)</span> : null}
                          </label>
                          <input
                            value={resp?.comentarios || ""}
                            onChange={(e) => setComentarioItem(item.id, e.target.value)}
                            placeholder={isBad ? "Describe el fallo y condición encontrada…" : "Opcional…"}
                            className={cx(
                              "mt-1 w-full p-3 rounded-xl border focus:outline-none focus:ring-2 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500",
                              isBad && !resp?.comentarios?.trim()
                                ? "border-red-300 dark:border-red-800 focus:ring-red-300"
                                : "border-slate-200 dark:border-zinc-700 focus:ring-blue-500"
                            )}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">
                            Evidencia {isBad ? <span className="text-red-700 dark:text-red-400">(obligatorio)</span> : null}
                          </label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              id={`ev-${item.id}`}
                              onChange={(e) => e.target.files && addEvidenciasItem(item.id, e.target.files)}
                            />
                            <label
                              htmlFor={`ev-${item.id}`}
                              className="flex-1 cursor-pointer px-3 py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-gray-300"
                            >
                              <Camera size={16} /> Agregar
                            </label>

                            {isBad && (
                              <button
                                type="button"
                                onClick={() => agregarAccion({ descripcion: `[Hallazgo] ${item.descripcion}`, criticidad: "High" })}
                                className="px-3 py-2 rounded-xl bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-extrabold text-sm inline-flex items-center gap-2"
                              >
                                <Plus size={16} /> Acción
                              </button>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {(resp?.evidenciasLocal || []).map((ev, idx) => (
                              <div key={ev.url} className="relative">
                                <img src={ev.url} alt="Evidencia" className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 shadow-sm" />
                                <button
                                  type="button"
                                  onClick={() => removeEvidenciaItem(item.id, idx)}
                                  className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full p-1 shadow hover:bg-red-50 dark:hover:bg-red-900/30"
                                  title="Quitar"
                                >
                                  <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            ))}
                            {(resp?.evidencias || []).map((url, idx) => (
                              <img key={`${url}-${idx}`} src={url} alt="Evidencia" className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 shadow-sm" />
                            ))}
                          </div>
                        </div>
                      </div>

                      {needsMore && (
                        <div className="mt-3 text-xs font-extrabold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                          <AlertCircle size={14} /> Este fallo requiere comentario y evidencia.
                        </div>
                      )}
                    </div>
                  );
                })}

                {seccionActivaId && (
                  <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                    <p className="font-extrabold text-slate-800 dark:text-white text-sm">Comentarios generales de la sección</p>
                    <textarea
                      value={comentarioSeccionActiva}
                      onChange={(e) => setComentarioSeccionActiva(e.target.value)}
                      placeholder="General comments (resumen de hallazgos, contexto, notas)…"
                      className="mt-2 w-full min-h-[90px] p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Participantes */}
        {paso === 3 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <CheckSquare className="text-blue-600 dark:text-blue-400" /> {t("step3Title")}
              </h2>
              <button type="button" onClick={agregarParticipante} className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-extrabold inline-flex items-center gap-2">
                <Plus size={16} /> {t("add")}
              </button>
            </div>

            {participantes.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-gray-500 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700">
                No hay participantes registrados. Agrega uno haciendo clic en el botón superior.
              </div>
            ) : (
              <div className="space-y-4">
                {participantes.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Nombre</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={p.nombre} onChange={(e) => actualizarParticipante(p.id, "nombre", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Puesto / Cargo</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={p.puesto} onChange={(e) => actualizarParticipante(p.id, "puesto", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Empresa</label>
                        <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={p.empresa} onChange={(e) => actualizarParticipante(p.id, "empresa", e.target.value)}>
                          <option value="SIG">SIG</option>
                          <option value="Cliente">Cliente</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button type="button" onClick={() => eliminarParticipante(p.id)} className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-extrabold inline-flex items-center gap-2">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Cierre */}
        {paso === 4 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
              <CheckSquare className="text-blue-600 dark:text-blue-400" /> Cierre / Conclusión
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-800">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">Comentarios finales <span className="text-red-600 dark:text-red-400">*</span></p>
                <textarea
                  value={cierre.comentarios_finales}
                  onChange={(e) => setCierre({ ...cierre, comentarios_finales: e.target.value })}
                  className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  placeholder="Resumen general del PMSA, estado final, recomendaciones…"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-slate-50 dark:bg-zinc-900/50">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">Eficiencias</p>
                <textarea
                  value={cierre.eficiencias}
                  onChange={(e) => setCierre({ ...cierre, eficiencias: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  placeholder="Mejoras, eficiencias detectadas…"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-slate-50 dark:bg-zinc-900/50">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">Pérdidas</p>
                <textarea
                  value={cierre.perdidas}
                  onChange={(e) => setCierre({ ...cierre, perdidas: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  placeholder="Pérdidas, riesgos, impactos…"
                />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-slate-50 dark:bg-zinc-900/50">
                <p className="font-extrabold text-slate-800 dark:text-white mb-2">Customer review</p>
                <textarea
                  value={cierre.customer_review}
                  onChange={(e) => setCierre({ ...cierre, customer_review: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500"
                  placeholder="Comentarios del cliente (opcional)…"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Acciones */}
        {paso === 5 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <CheckSquare className="text-orange-500" /> Plan de Acción
              </h2>
              <button type="button" onClick={() => agregarAccion()} className="px-4 py-2 rounded-xl bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-extrabold inline-flex items-center gap-2">
                <Plus size={16} /> Agregar
              </button>
            </div>

            {nonCompliantCount > 0 && acciones.length === 0 && (
              <div className="mb-5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-amber-900 dark:text-amber-300 font-bold text-sm flex items-start gap-2">
                <AlertCircle className="mt-0.5" size={18} />
                <span>Hay Non-compliant detectados: agrega al menos una acción.</span>
              </div>
            )}

            {acciones.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-gray-500 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700">
                No hay acciones registradas. Agrega una si es necesario.
              </div>
            ) : (
              <div className="space-y-4">
                {acciones.map((accion) => (
                  <div key={accion.id} className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Descripción</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.descripcion} onChange={(e) => actualizarAccion(accion.id, "descripcion", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Tipo</label>
                        <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.tipo} onChange={(e) => actualizarAccion(accion.id, "tipo", e.target.value)}>
                          <option value="Action Plan">Action Plan</option>
                          <option value="Recommendation">Recommendation</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Responsable</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.responsable} onChange={(e) => actualizarAccion(accion.id, "responsable", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Fecha límite</label>
                        <input type="date" className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.fecha} onChange={(e) => actualizarAccion(accion.id, "fecha", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">Criticidad</label>
                        <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.criticidad} onChange={(e) => actualizarAccion(accion.id, "criticidad", e.target.value)}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600 dark:text-gray-400">WO</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white" value={accion.wo_numero || ""} onChange={(e) => actualizarAccion(accion.id, "wo_numero", e.target.value)} placeholder="WO-123…" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <label className="inline-flex items-center gap-2 font-extrabold text-slate-700 dark:text-gray-300">
                        <input type="checkbox" checked={!!accion.share} onChange={(e) => actualizarAccion(accion.id, "share", e.target.checked)} className="h-4 w-4 accent-blue-600" />
                        Share
                      </label>

                      <button type="button" onClick={() => eliminarAccion(accion.id)} className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-extrabold inline-flex items-center gap-2">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Firmas + Final */}
        {paso === 6 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Listo para cerrar el reporte</h2>
              <p className="text-slate-600 dark:text-gray-400">
                Inspección: <span className="font-extrabold">{contestadas}</span> ítems — Acciones: <span className="font-extrabold">{acciones.length}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <SignaturePad label="Firma SIG" value={firmaSIG} onChange={setFirmaSIG} />
                <SignaturePad label="Firma Cliente" value={firmaCliente} onChange={setFirmaCliente} />
              </div>

              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="w-full py-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-extrabold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Eye size={20} /> Vista Previa del PDF
                </button>

                <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-slate-50 dark:bg-zinc-900/50">
                  <p className="font-extrabold text-slate-800 dark:text-white mb-2">Checklist de cierre</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <span className="font-extrabold text-slate-700 dark:text-gray-300">Paso 1</span>
                      <span className={cx("font-extrabold", validarPaso1() ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                        {validarPaso1() ? "Pendiente" : "OK"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <span className="font-extrabold text-slate-700 dark:text-gray-300">Paso 2</span>
                      <span className={cx("font-extrabold", validarPaso2() ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                        {validarPaso2() ? "Pendiente" : "OK"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <span className="font-extrabold text-slate-700 dark:text-gray-300">Paso 4</span>
                      <span className={cx("font-extrabold", validarPaso4() ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                        {validarPaso4() ? "Pendiente" : "OK"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                      <span className="font-extrabold text-slate-700 dark:text-gray-300">Paso 5</span>
                      <span className={cx("font-extrabold", validarPaso5() ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                        {validarPaso5() ? "Pendiente" : "OK"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500 dark:text-gray-400">
                    Al finalizar, se creará el reporte en Supabase y quedará en historial.
                    <br />
                    Si quieres que las firmas se suban a Storage y se guarden en <b>firma_cliente_url / firma_fse_url</b>, eso se hace en backend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* MODAL VISTA PREVIA PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
              <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600" /> Vista Previa del Reporte
              </h3>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full text-slate-500"
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-zinc-950 p-4">
              <PDFViewerDynamic width="100%" height="100%" className="rounded-xl shadow-inner">
                <ReporteTecnicoPDF
                  datos={datos}
                  catalogo={catalogo}
                  respuestas={respuestas}
                  acciones={acciones}
                  cierre={cierre}
                  firmaSIG={firmaSIG}
                  firmaCliente={firmaCliente}
                  clienteNombre={clientes.find((c: any) => String(c.id) === String(datos.cliente_id))?.nombre}
                  tPDF={tPDF}
                />
              </PDFViewerDynamic>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3 bg-white dark:bg-zinc-900">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cerrar
              </button>
              <button
                onClick={() => { setShowPdfModal(false); finalizar(); }}
                className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2"
              >
                <Save size={18} /> Guardar y Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}