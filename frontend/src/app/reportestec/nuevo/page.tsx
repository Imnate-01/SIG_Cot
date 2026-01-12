"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
} from "lucide-react";

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

const todayISO = () => new Date().toISOString().split("T")[0];
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function safeParse<T>(v: string | null): T | null {
  try {
    if (!v) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

// debounce hook
function useDebouncedEffect(effect: () => void, deps: any[], delayMs: number) {
  useEffect(() => {
    const t = setTimeout(() => effect(), delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs]);
}

// ─────────────────────────────────────────────
// Signature pad simple (canvas -> base64)
// Guardamos base64 local, y tu backend lo puede subir a storage y guardar URL.
// ─────────────────────────────────────────────
function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl?: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.floor(rect.width * ratio);
    c.height = Math.floor(rect.height * ratio);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    onChange(undefined);
  };

  const exportImage = () => {
    const c = canvasRef.current;
    if (!c) return;
    onChange(c.toDataURL("image/png"));
  };

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const last = lastRef.current;
    if (!last) {
      lastRef.current = p;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const up = () => {
    drawingRef.current = false;
    lastRef.current = null;
    exportImage();
  };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Pencil size={18} className="text-slate-600" />
          <p className="font-extrabold text-slate-800">{label}</p>
        </div>
        <button type="button" onClick={clear} className="text-sm font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
          Limpiar
        </button>
      </div>
      <div className="rounded-xl border bg-slate-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      {value ? (
        <p className="mt-2 text-xs font-bold text-emerald-700">✔ Firma capturada</p>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Dibuja tu firma en el recuadro.</p>
      )}
    </div>
  );
}

export default function NuevoReporteTecnicoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingFinal, setSavingFinal] = useState(false);

  const [paso, setPaso] = useState<Step>(1);

  const [catalogo, setCatalogo] = useState<SeccionCatalogo[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [seccionActivaId, setSeccionActivaId] = useState<number | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastDraftAt, setLastDraftAt] = useState<number | null>(null);

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

  // Firmas (canvas base64 -> backend lo sube y guarda URL)
  const [firmaSIG, setFirmaSIG] = useState<string | undefined>(undefined);
  const [firmaCliente, setFirmaCliente] = useState<string | undefined>(undefined);

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
        if (local?.paso) setPaso(local.paso);
        if (local?.seccionActivaId) setSeccionActivaId(local.seccionActivaId);
        if (local?.firmaSIG) setFirmaSIG(local.firmaSIG);
        if (local?.firmaCliente) setFirmaCliente(local.firmaCliente);

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
      paso,
      seccionActivaId,
      firmaSIG,
      firmaCliente,
    };
  }, [acciones, cierre, comentariosSeccion, datos, firmaCliente, firmaSIG, paso, respuestas, seccionActivaId]);

  useDebouncedEffect(() => {
    if (loading) return;

    // local
    localStorage.setItem("tsr_draft_v3", JSON.stringify(draftPayload));

    // api draft
    (async () => {
      try {
        setDraftStatus("saving");
        await api.post("/reportes-tecnicos/draft", {
          cliente_id: datos.cliente_id || null,
          datos_generales: datos,
          payload: draftPayload,
        });
        setDraftStatus("saved");
        setLastDraftAt(Date.now());
      } catch (e) {
        setDraftStatus("error");
      }
    })();
  }, [draftPayload], 900);

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
      draftStatus === "error" ? "bg-red-50 text-red-700 border-red-200" :
      draftStatus === "saved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
      "bg-slate-50 text-slate-700 border-slate-200";

    return (
      <div className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold", cls)}>
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

    setSavingFinal(true);
    try {
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
      alert("✅ Reporte creado exitosamente");
      router.push("/reportestec");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.response?.data?.error || "Error al finalizar el reporte.");
    } finally {
      setSavingFinal(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-600">Cargando configuración…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Header sticky */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-5 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/cotizaciones" className="text-slate-600 hover:text-blue-700">
              <ArrowLeft />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Nuevo Reporte Técnico (PM)</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-500">
                  Paso <span className="font-bold">{paso}</span> de <span className="font-bold">6</span>
                </p>
                <DraftBadge />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <div className="w-36 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-blue-600 transition-all" style={{ width: `${progresoGlobal}%` }} />
              </div>
              <span className="text-xs font-extrabold text-slate-700">{progresoGlobal}%</span>

              {nonCompliantCount > 0 ? (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                  <XCircle size={14} /> {nonCompliantCount} fallos
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={14} /> Sin fallos
                </span>
              )}
            </div>

            {paso > 1 && (
              <button type="button" onClick={goPrev} className="px-4 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-100">
                Atrás
              </button>
            )}

            {paso < 6 ? (
              <button type="button" onClick={goNext} className="px-5 py-2 rounded-xl font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-sm inline-flex items-center gap-2">
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finalizar}
                disabled={savingFinal}
                className={cx(
                  "px-5 py-2 rounded-xl font-extrabold text-white shadow-sm inline-flex items-center gap-2",
                  savingFinal ? "bg-emerald-600/70" : "bg-emerald-600 hover:bg-emerald-700"
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
        {paso === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-6">
              <FileText className="text-blue-600" /> Información General
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Cliente</label>
                <select
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.cliente_id}
                  onChange={(e) => setDatos({ ...datos, cliente_id: e.target.value })}
                >
                  <option value="">-- Seleccionar --</option>
                  {clientes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Planta / Ubicación</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.planta}
                  onChange={(e) => setDatos({ ...datos, planta: e.target.value })}
                  placeholder="Ej. Planta Toluca"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Responsable Cliente</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.responsable_cliente}
                  onChange={(e) => setDatos({ ...datos, responsable_cliente: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Número de serie</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.maquina_serie}
                  onChange={(e) => setDatos({ ...datos, maquina_serie: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Horómetro (Horas)</label>
                <input
                  type="number"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={datos.horas_maquina}
                  onChange={(e) => setDatos({ ...datos, horas_maquina: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={datos.fecha_inicio}
                    onChange={(e) => setDatos({ ...datos, fecha_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-extrabold text-slate-700 mb-1">Fecha fin</label>
                  <input
                    type="date"
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={datos.fecha_fin}
                    onChange={(e) => setDatos({ ...datos, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Email</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  value={datos.email_cliente}
                  onChange={(e) => setDatos({ ...datos, email_cliente: e.target.value })}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Teléfono</label>
                <input
                  className="w-full p-3 rounded-xl border border-slate-200"
                  value={datos.telefono_cliente}
                  onChange={(e) => setDatos({ ...datos, telefono_cliente: e.target.value })}
                  placeholder="+52 55..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-slate-700 mb-1">Propósito de visita</label>
                <input className="w-full p-3 rounded-xl border border-slate-200" value={datos.proposito_visita} onChange={(e) => setDatos({ ...datos, proposito_visita: e.target.value })} />
              </div>

              {/* Reunión apertura / cierre + comentario */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Reuniones</p>
                <label className="flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" checked={datos.reunion_apertura} onChange={(e) => setDatos({ ...datos, reunion_apertura: e.target.checked })} className="h-4 w-4" />
                  Reunión de apertura
                </label>
                <label className="mt-2 flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" checked={datos.reunion_cierre} onChange={(e) => setDatos({ ...datos, reunion_cierre: e.target.checked })} className="h-4 w-4" />
                  Reunión de cierre
                </label>
                <textarea className="mt-3 w-full p-3 rounded-xl border border-slate-200" placeholder="Comentarios apertura (opcional)" value={datos.comentarios_apertura} onChange={(e) => setDatos({ ...datos, comentarios_apertura: e.target.value })} />
              </div>

              {/* Producción */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Producción / pruebas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-600">Tipo llenado</label>
                    <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={datos.tipo_llenado} onChange={(e) => setDatos({ ...datos, tipo_llenado: e.target.value })}>
                      <option value="Water">Water</option>
                      <option value="Product">Product</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-600">Tipo envase</label>
                    <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={datos.tipo_envase} onChange={(e) => setDatos({ ...datos, tipo_envase: e.target.value })}>
                      <option value="Test">Test</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                <label className="mt-3 inline-flex items-center gap-2 font-bold text-slate-700">
                  <input type="checkbox" checked={datos.envase_desechado} onChange={(e) => setDatos({ ...datos, envase_desechado: e.target.checked })} className="h-4 w-4" />
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
            <div className="w-full md:w-[320px] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                <p className="font-extrabold text-slate-800">Secciones</p>
                <p className="text-xs text-slate-500 mt-1">
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
                      "w-full text-left p-4 border-b border-slate-50 hover:bg-blue-50 transition",
                      seccionActivaId === sec.id && "bg-blue-50 border-l-4 border-l-blue-600"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-800 truncate">{sec.nombre}</p>
                        
                        {/* FIX: Mostrar "Sin items" si está vacío */}
                        <p className="text-xs text-slate-500">
                          {sec.total === 0 ? (
                            <span className="italic text-slate-400">Sin items</span>
                          ) : (
                            <>{sec.answered}/{sec.total} — {sec.pct}%</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sec.non > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                            <XCircle size={12} /> {sec.non}
                          </span>
                        )}
                        
                        {/* FIX: Solo mostrar check si hay items y está completo */}
                        {sec.pct === 100 && sec.non === 0 && sec.total > 0 && (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-blue-600 transition-all" style={{ width: `${sec.pct}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preguntas */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b bg-white">
                <h2 className="text-xl font-extrabold text-slate-900">{seccionActiva?.nombre || "Selecciona una sección"}</h2>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(100vh-240px)] space-y-5">
                {seccionActiva?.items?.length === 0 && (
                  <div className="text-center py-10 text-slate-400 italic">
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
                    isBad ? "border-red-200 bg-red-50/40" :
                    isOk ? "border-emerald-200 bg-emerald-50/40" :
                    isNA ? "border-slate-200 bg-slate-50" :
                    isUnv ? "border-amber-200 bg-amber-50/40" :
                    "border-slate-200 bg-white";

                  const needsMore =
                    isBad &&
                    (!resp?.comentarios?.trim() ||
                      ((resp?.evidenciasLocal?.length || 0) + (resp?.evidencias?.length || 0) === 0));

                  return (
                    <div key={item.id} className={cx("rounded-2xl border p-4 sm:p-5 transition-all", cardBorder)}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-extrabold text-slate-900 text-sm sm:text-base">{item.descripcion}</p>

                        {isBad ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                            <XCircle size={14} /> NOK
                          </span>
                        ) : isOk ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={14} /> OK
                          </span>
                        ) : isNA ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle size={14} /> N/A
                          </span>
                        ) : isUnv ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle size={14} /> Unverified
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle size={14} /> Pendiente
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button type="button" onClick={() => setEstadoItem(item.id, "Conformable")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isOk ? "bg-emerald-600 text-white border-emerald-600" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}>
                          <CheckCircle2 size={16} /> OK
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "Non-compliant")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isBad ? "bg-red-600 text-white border-red-600" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}>
                          <XCircle size={16} /> NOK
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "Unverified")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isUnv ? "bg-amber-500 text-white border-amber-500" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}>
                          <AlertCircle size={16} /> Unverified
                        </button>

                        <button type="button" onClick={() => setEstadoItem(item.id, "N/A")}
                          className={cx("py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2",
                            isNA ? "bg-slate-700 text-white border-slate-700" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}>
                          <AlertCircle size={16} /> N/A
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="lg:col-span-2">
                          <label className="text-xs font-extrabold text-slate-600">
                            Comentarios / Observaciones {isBad ? <span className="text-red-700">(obligatorio)</span> : null}
                          </label>
                          <input
                            value={resp?.comentarios || ""}
                            onChange={(e) => setComentarioItem(item.id, e.target.value)}
                            placeholder={isBad ? "Describe el fallo y condición encontrada…" : "Opcional…"}
                            className={cx(
                              "mt-1 w-full p-3 rounded-xl border focus:outline-none focus:ring-2",
                              isBad && !resp?.comentarios?.trim()
                                ? "border-red-300 focus:ring-red-300"
                                : "border-slate-200 focus:ring-blue-500"
                            )}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-extrabold text-slate-600">
                            Evidencia {isBad ? <span className="text-red-700">(obligatorio)</span> : null}
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
                              className="flex-1 cursor-pointer px-3 py-2 rounded-xl border font-extrabold text-sm inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                            >
                              <Camera size={16} /> Agregar
                            </label>

                            {isBad && (
                              <button
                                type="button"
                                onClick={() => agregarAccion({ descripcion: `[Hallazgo] ${item.descripcion}`, criticidad: "High" })}
                                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm inline-flex items-center gap-2"
                              >
                                <Plus size={16} /> Acción
                              </button>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {(resp?.evidenciasLocal || []).map((ev, idx) => (
                              <div key={ev.url} className="relative">
                                <img src={ev.url} alt="Evidencia" className="h-16 w-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                                <button
                                  type="button"
                                  onClick={() => removeEvidenciaItem(item.id, idx)}
                                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 shadow hover:bg-red-50"
                                  title="Quitar"
                                >
                                  <Trash2 size={14} className="text-red-600" />
                                </button>
                              </div>
                            ))}
                            {(resp?.evidencias || []).map((url, idx) => (
                              <img key={`${url}-${idx}`} src={url} alt="Evidencia" className="h-16 w-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                            ))}
                          </div>
                        </div>
                      </div>

                      {needsMore && (
                        <div className="mt-3 text-xs font-extrabold text-red-700 bg-red-100 border border-red-200 rounded-xl px-3 py-2 inline-flex items-center gap-2">
                          <AlertCircle size={14} /> Este fallo requiere comentario y evidencia.
                        </div>
                      )}
                    </div>
                  );
                })}

                {seccionActivaId && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-extrabold text-slate-800 text-sm">Comentarios generales de la sección</p>
                    <textarea
                      value={comentarioSeccionActiva}
                      onChange={(e) => setComentarioSeccionActiva(e.target.value)}
                      placeholder="General comments (resumen de hallazgos, contexto, notas)…"
                      className="mt-2 w-full min-h-[90px] p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Participantes */}
        {paso === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-6">
              <CheckSquare className="text-blue-600" /> Participantes / Responsabilidades
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-700 font-bold">
                Este paso está listo para conectarse a tu tabla <span className="font-extrabold">reporte_participantes</span>.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Por ahora se guarda en borrador (meta) y luego lo persistimos en backend.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Cierre */}
        {paso === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-6">
              <CheckSquare className="text-blue-600" /> Cierre / Conclusión
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-5 bg-white">
                <p className="font-extrabold text-slate-800 mb-2">Comentarios finales <span className="text-red-600">*</span></p>
                <textarea
                  value={cierre.comentarios_finales}
                  onChange={(e) => setCierre({ ...cierre, comentarios_finales: e.target.value })}
                  className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200"
                  placeholder="Resumen general del PMSA, estado final, recomendaciones…"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Eficiencias</p>
                <textarea
                  value={cierre.eficiencias}
                  onChange={(e) => setCierre({ ...cierre, eficiencias: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Mejoras, eficiencias detectadas…"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Pérdidas</p>
                <textarea
                  value={cierre.perdidas}
                  onChange={(e) => setCierre({ ...cierre, perdidas: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Pérdidas, riesgos, impactos…"
                />
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Customer review</p>
                <textarea
                  value={cierre.customer_review}
                  onChange={(e) => setCierre({ ...cierre, customer_review: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200"
                  placeholder="Comentarios del cliente (opcional)…"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Acciones */}
        {paso === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <CheckSquare className="text-orange-500" /> Plan de Acción
              </h2>
              <button type="button" onClick={() => agregarAccion()} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold inline-flex items-center gap-2">
                <Plus size={16} /> Agregar
              </button>
            </div>

            {nonCompliantCount > 0 && acciones.length === 0 && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 font-bold text-sm flex items-start gap-2">
                <AlertCircle className="mt-0.5" size={18} />
                <span>Hay Non-compliant detectados: agrega al menos una acción.</span>
              </div>
            )}

            {acciones.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                No hay acciones registradas. Agrega una si es necesario.
              </div>
            ) : (
              <div className="space-y-4">
                {acciones.map((accion) => (
                  <div key={accion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-extrabold text-slate-600">Descripción</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.descripcion} onChange={(e) => actualizarAccion(accion.id, "descripcion", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600">Tipo</label>
                        <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.tipo} onChange={(e) => actualizarAccion(accion.id, "tipo", e.target.value)}>
                          <option value="Action Plan">Action Plan</option>
                          <option value="Recommendation">Recommendation</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600">Responsable</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.responsable} onChange={(e) => actualizarAccion(accion.id, "responsable", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600">Fecha límite</label>
                        <input type="date" className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.fecha} onChange={(e) => actualizarAccion(accion.id, "fecha", e.target.value)} />
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600">Criticidad</label>
                        <select className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.criticidad} onChange={(e) => actualizarAccion(accion.id, "criticidad", e.target.value)}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-extrabold text-slate-600">WO</label>
                        <input className="mt-1 w-full p-3 rounded-xl border border-slate-200 bg-white" value={accion.wo_numero || ""} onChange={(e) => actualizarAccion(accion.id, "wo_numero", e.target.value)} placeholder="WO-123…" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <label className="inline-flex items-center gap-2 font-extrabold text-slate-700">
                        <input type="checkbox" checked={!!accion.share} onChange={(e) => actualizarAccion(accion.id, "share", e.target.checked)} className="h-4 w-4" />
                        Share
                      </label>

                      <button type="button" onClick={() => eliminarAccion(accion.id)} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-red-50 text-red-700 font-extrabold inline-flex items-center gap-2">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={40} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Listo para cerrar el reporte</h2>
              <p className="text-slate-600">
                Inspección: <span className="font-extrabold">{contestadas}</span> ítems — Acciones: <span className="font-extrabold">{acciones.length}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <SignaturePad label="Firma SIG" value={firmaSIG} onChange={setFirmaSIG} />
                <SignaturePad label="Firma Cliente" value={firmaCliente} onChange={setFirmaCliente} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <p className="font-extrabold text-slate-800 mb-2">Checklist de cierre</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <span className="font-extrabold text-slate-700">Paso 1</span>
                    <span className={cx("font-extrabold", validarPaso1() ? "text-red-600" : "text-emerald-700")}>
                      {validarPaso1() ? "Pendiente" : "OK"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <span className="font-extrabold text-slate-700">Paso 2</span>
                    <span className={cx("font-extrabold", validarPaso2() ? "text-red-600" : "text-emerald-700")}>
                      {validarPaso2() ? "Pendiente" : "OK"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <span className="font-extrabold text-slate-700">Paso 4</span>
                    <span className={cx("font-extrabold", validarPaso4() ? "text-red-600" : "text-emerald-700")}>
                      {validarPaso4() ? "Pendiente" : "OK"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                    <span className="font-extrabold text-slate-700">Paso 5</span>
                    <span className={cx("font-extrabold", validarPaso5() ? "text-red-600" : "text-emerald-700")}>
                      {validarPaso5() ? "Pendiente" : "OK"}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Al finalizar, se creará el reporte en Supabase y quedará en historial.
                  <br />
                  Si quieres que las firmas se suban a Storage y se guarden en <b>firma_cliente_url / firma_fse_url</b>, eso se hace en backend.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}