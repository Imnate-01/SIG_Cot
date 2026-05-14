"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save, CheckCircle2, Loader2, Send, AlertTriangle, Download, X } from "lucide-react";
import { foodSafetyAuditApi } from "@/services/foodSafetyAudit";
import { WizardSidebar, WizardStep } from "@/components/food-safety-audit/WizardSidebar";
import { Step1COP, CopFindingState } from "@/components/food-safety-audit/Step1COP";
import { Step2Dedusting } from "@/components/food-safety-audit/Step2Dedusting";
import { Step3H2O2 } from "@/components/food-safety-audit/Step3H2O2";
import { Step4Preheating } from "@/components/food-safety-audit/Step4Preheating";
import { Step5CIP, CipFlowRowExport } from "@/components/food-safety-audit/Step5CIP";
import { Step6Misc } from "@/components/food-safety-audit/Step6Misc";

interface AuditReport {
  id: number;
  folio: string;
  cliente_empresa: string;
  llenadora: string;
  fecha_auditoria: string;
  estado: string;
}

interface WizardState {
  // COP
  copFindings: Record<string, CopFindingState>;
  // Dedusting / Sterile Air
  dedusterValues: Record<string, number | null>;
  // H₂O₂
  h2o2Values: Record<string, number | null>;
  h2o2Proveedor: string;
  h2o2Tipo: string;
  h2o2Concentracion: number | null;
  // Preheating & SST
  preheatingValues: Record<string, number | null>;
  // CIP
  cipValues: Record<string, number | null>;
  cipFlows: CipFlowRowExport[];
  // Misceláneos
  miscValues: Record<string, string | number | null>;
  observacionesGen: string;
}

const INITIAL_STATE: WizardState = {
  copFindings: {},
  dedusterValues: {},
  h2o2Values: {},
  h2o2Proveedor: "",
  h2o2Tipo: "",
  h2o2Concentracion: null,
  preheatingValues: {},
  cipValues: {},
  cipFlows: [],
  miscValues: {},
  observacionesGen: "",
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AuditWizardProps {
  report: AuditReport;
}

export default function AuditWizard({ report }: AuditWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_STATE);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref para tener siempre el estado más reciente en los timeouts
  const wizardStateRef = useRef(wizardState);
  useEffect(() => {
    wizardStateRef.current = wizardState;
  }, [wizardState]);

  const STEPS: WizardStep[] = [
    { id: 1, label: "COP",                    sublabel: "Cleaning Out of Place",       completed: completedSteps.has(1) },
    { id: 2, label: "Dedusting / Sterile Air",sublabel: "Presión y caudal de aire",    completed: completedSteps.has(2) },
    { id: 3, label: "H₂O₂",                   sublabel: "Dosificación y parámetros",   completed: completedSteps.has(3) },
    { id: 4, label: "Preheating & SST",        sublabel: "Calentamiento y esteriliz.",  completed: completedSteps.has(4) },
    { id: 5, label: "CIP",                     sublabel: "Cleaning in Place",           completed: completedSteps.has(5) },
    { id: 6, label: "Misceláneos",             sublabel: "Resumen y cierre",            completed: completedSteps.has(6) },
  ];

  // ─── Auto-save al cambiar el estado (debounce 2s) ───
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        // Usamos el ref para enviar el estado más actual, no el viejo del closure
        const currentCopFindings = wizardStateRef.current.copFindings;
        const payload = {
          copFindings: currentCopFindings,
        };
        const res = await foodSafetyAuditApi.saveWizard(report.id, payload);
        if (res.data?.success) {
          // Solo actualizamos los IDs que nos devuelve la base de datos, 
          // respetando las imágenes u otros datos que el usuario haya agregado mientras guardaba
          setWizardState(prev => {
            const nextCop = { ...prev.copFindings };
            const returnedCop = res.data.data.copFindings;
            for (const key of Object.keys(returnedCop)) {
              if (nextCop[key]) {
                nextCop[key] = {
                  ...nextCop[key],
                  cop_db_id: returnedCop[key].cop_db_id
                };
              }
            }
            return { ...prev, copFindings: nextCop };
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, 2000);
  }, [report.id]);

  // Actualizar COP findings
  const handleCopChange = useCallback((key: string, val: CopFindingState) => {
    setWizardState(prev => ({ ...prev, copFindings: { ...prev.copFindings, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Actualizar parámetros Dedusting
  const handleDedusterChange = useCallback((key: string, val: number | null) => {
    setWizardState(prev => ({ ...prev, dedusterValues: { ...prev.dedusterValues, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Actualizar parámetros H₂O₂
  const handleH2O2Change = useCallback((key: string, val: number | null) => {
    setWizardState(prev => ({ ...prev, h2o2Values: { ...prev.h2o2Values, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleH2O2MetaChange = useCallback((field: string, val: any) => {
    setWizardState(prev => ({ ...prev, [field]: val }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Actualizar parámetros Preheating
  const handlePreheatingChange = useCallback((key: string, val: number | null) => {
    setWizardState(prev => ({ ...prev, preheatingValues: { ...prev.preheatingValues, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Actualizar parámetros CIP
  const handleCipChange = useCallback((key: string, val: number | null) => {
    setWizardState(prev => ({ ...prev, cipValues: { ...prev.cipValues, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleCipFlowsChange = useCallback((flows: CipFlowRowExport[]) => {
    setWizardState(prev => ({ ...prev, cipFlows: flows }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Actualizar Misceláneos
  const handleMiscChange = useCallback((key: string, val: string | number | null) => {
    setWizardState(prev => ({ ...prev, miscValues: { ...prev.miscValues, [key]: val } }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleObsChange = useCallback((val: string) => {
    setWizardState(prev => ({ ...prev, observacionesGen: val }));
    triggerAutoSave();
  }, [triggerAutoSave]);

  // Navegar al siguiente paso (marca el actual como completado)
  const handleNext = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleStepClick = (step: number) => {
    setCurrentStep(step);
  };

  // Construye el payload completo de todos los pasos del wizard
  const buildFullPayload = () => {
    const s = wizardStateRef.current;
    return {
      copFindings:       s.copFindings,
      dedusterValues:    s.dedusterValues,
      h2o2Values:        s.h2o2Values,
      h2o2Proveedor:     s.h2o2Proveedor,
      h2o2Tipo:          s.h2o2Tipo,
      h2o2Concentracion: s.h2o2Concentracion,
      preheatingValues:  s.preheatingValues,
      cipValues:         s.cipValues,
      cipFlows:          s.cipFlows,
      miscValues:        s.miscValues,
      observacionesGen:  s.observacionesGen,
    };
  };

  const handleSaveReport = async () => {
    setSaveStatus("saving");
    try {
      const res = await foodSafetyAuditApi.saveWizard(report.id, buildFullPayload());
      if (res.data?.success) {
        // Actualizar cop_db_ids devueltos por el backend
        const returnedCop = res.data.data?.copFindings || {};
        setWizardState(prev => {
          const nextCop = { ...prev.copFindings };
          for (const key of Object.keys(returnedCop)) {
            if (nextCop[key]) nextCop[key] = { ...nextCop[key], cop_db_id: returnedCop[key].cop_db_id };
          }
          return { ...prev, copFindings: nextCop };
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      // Guardar primero, luego generar PDF con datos frescos
      await foodSafetyAuditApi.saveWizard(report.id, buildFullPayload());
      const res = await foodSafetyAuditApi.pdf(report.id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FSA_${report.folio}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
    } catch {
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Barra de auto-save
  const AutoSaveBadge = () => (
    <div className={`fsa-autosave-badge ${saveStatus === "saving" ? "saving" : saveStatus === "saved" ? "saved" : ""}`}>
      {saveStatus === "saving" && <><Loader2 size={13} className="animate-spin" /> Guardando borrador...</>}
      {saveStatus === "saved"  && <><CheckCircle2 size={13} /> Guardado automáticamente</>}
      {saveStatus === "error"  && <><AlertTriangle size={13} /> Error al guardar</>}
      {saveStatus === "idle"   && <><Save size={13} /> Borrador guardado</>}
    </div>
  );

  // Renderizado del paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1COP
            findings={wizardState.copFindings}
            onChange={handleCopChange}
            auditId={report.id}
          />
        );
      case 2:
        return (
          <Step2Dedusting
            values={wizardState.dedusterValues}
            onChange={handleDedusterChange}
          />
        );
      case 3:
        return (
          <Step3H2O2
            values={wizardState.h2o2Values}
            onChange={handleH2O2Change}
            h2o2Proveedor={wizardState.h2o2Proveedor}
            h2o2Tipo={wizardState.h2o2Tipo}
            h2o2Concentracion={wizardState.h2o2Concentracion}
            onMetaChange={handleH2O2MetaChange}
          />
        );
      case 4:
        return (
          <Step4Preheating
            values={wizardState.preheatingValues}
            onChange={handlePreheatingChange}
          />
        );
      case 5:
        return (
          <Step5CIP
            values={wizardState.cipValues}
            onChange={handleCipChange}
            cipFlows={wizardState.cipFlows}
            onCipFlowsChange={handleCipFlowsChange}
          />
        );
      case 6:
        return (
          <Step6Misc
            copFindings={wizardState.copFindings}
            miscValues={wizardState.miscValues}
            observacionesGen={wizardState.observacionesGen}
            onMiscChange={handleMiscChange}
            onObsChange={handleObsChange}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length;

  return (
    <div className="fsa-wizard-root">
      {/* ── Sidebar de pasos ── */}
      <WizardSidebar
        steps={STEPS}
        currentStep={currentStep}
        folio={report.folio}
        clienteEmpresa={report.cliente_empresa}
        onStepClick={handleStepClick}
      />

      {/* ── Contenido + Footer ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header de contexto */}
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "14px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => router.push("/food-safety-audit")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 13, color: "#64748b", background: "none",
                border: "none", cursor: "pointer", padding: "4px 0"
              }}
            >
              <ArrowLeft size={14} /> Volver al listado
            </button>
            <span style={{ color: "#e2e8f0" }}>|</span>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              Paso {currentStep} de {STEPS.length} — <strong style={{ color: "#1e293b" }}>{STEPS[currentStep - 1]?.label}</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <AutoSaveBadge />
              <span className={`fsa-status-pill ${report.estado === "borrador" ? "fsa-status-borrador" : report.estado === "en_revision" ? "fsa-status-revision" : "fsa-status-finalizado"}`}>
                {report.estado === "borrador" ? "Borrador" : report.estado === "en_revision" ? "En revisión" : "Finalizado"}
              </span>
            </div>
            <div style={{ width: 1, height: 24, background: "#e2e8f0" }}></div>
            <button
              onClick={() => router.push("/food-safety-audit")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: "50%",
                background: "#f1f5f9", color: "#64748b", border: "none",
                cursor: "pointer", transition: "all 0.2s"
              }}
              title="Cerrar y volver al tablero"
              onMouseOver={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#0f172a"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barra de progreso móvil */}
        <div className="fsa-progress-bar" style={{ borderRadius: 0, marginBottom: 0, height: 3 }}>
          <div
            className="fsa-progress-fill"
            style={{ width: `${((currentStep - 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Área principal del paso */}
        <div
          className="fsa-wizard-content"
          style={{ flex: 1, overflowY: "auto", paddingBottom: 100 }}
        >
          {renderStep()}
        </div>

        {/* Footer de navegación */}
        <div className="fsa-wizard-footer">
          <button
            className="fsa-btn-secondary"
            onClick={handlePrev}
            disabled={currentStep === 1}
          >
            <ArrowLeft size={16} /> Anterior
          </button>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Guardar — siempre visible */}
            <button
              className="fsa-btn-secondary"
              onClick={handleSaveReport}
              disabled={saveStatus === "saving"}
              style={{ borderColor: "#2563eb", color: "#2563eb" }}
            >
              {saveStatus === "saving"
                ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
                : <><Save size={15} /> Guardar Reporte</>
              }
            </button>

            {/* Siguiente — solo en pasos intermedios */}
            {!isLastStep && (
              <button className="fsa-btn-primary" onClick={handleNext}>
                Siguiente <ArrowRight size={16} />
              </button>
            )}

            {/* Finalizar y PDF — solo en el último paso */}
            {isLastStep && (
              <button
                className="fsa-btn-primary"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                style={{
                  background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)",
                  fontWeight: 700, padding: "10px 20px"
                }}
              >
                {isDownloading
                  ? <><Loader2 size={15} className="animate-spin" /> Generando PDF...</>
                  : <><Download size={15} /> Finalizar reporte y generar PDF</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
