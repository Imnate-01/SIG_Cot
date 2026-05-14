"use client";

import React from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, ClipboardList, Camera,
  ThumbsUp, ThumbsDown, Wrench
} from "lucide-react";
import { CopFindingState } from "./Step1COP";

type ParamValues = Record<string, number | null>;

/* ─────────────────────────────────────────
   Parámetros de esterilización
───────────────────────────────────────── */
const ESTERILIZACION_CAMPOS = [
  { key: "sst_funcional",   label: "Paso funcional SST completado",  tipo: "yesno" },
  { key: "azs_funcional",   label: "Paso funcional AZS completado",  tipo: "yesno" },
];

const PRESION_TANQUE_PARAMS = [
  { feature: "Pressure product tank — Production",           unidad: "mbar", sp: 0,    ref: "0" },
  { feature: "Pressure product tank (A)&(R) — Cleaning",    unidad: "mbar", sp: 1200, ref: "1.200" },
  { feature: "Pressure product tank (A)&(R) — Sterilization",unidad: "mbar", sp: 250,  ref: "250" },
  { feature: "Pressure product tank — Cooling",             unidad: "mbar", sp: 60,   ref: "60" },
  { feature: "Pressure product tank — Special filling",      unidad: "mbar", sp: 100,  ref: "100 ±30" },
  { feature: "Level product tank",                          unidad: "%",    sp: null,  ref: "< 90" },
  { feature: "Time cooling down filling heads",             unidad: "min",  sp: 10,   ref: "10" },
];

/* ─── Resumen de hallazgos COP ─── */
function COPSummary({ copFindings }: { copFindings: Record<string, CopFindingState> }) {
  const secciones = Object.entries(copFindings);
  const conFalla = secciones.filter(([, v]) => v.tiene_falla);
  const sinFalla = secciones.filter(([, v]) => !v.tiene_falla);

  if (secciones.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0", fontSize: 14 }}>
        No se han completado secciones COP aún.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
        <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#15803d" }}>{sinFalla.length}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Secciones OK</div>
        </div>
        <div style={{ background: conFalla.length > 0 ? "#fef2f2" : "#f8fafc", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: conFalla.length > 0 ? "#dc2626" : "#94a3b8" }}>
            {conFalla.length}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Con Hallazgos</div>
        </div>
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{secciones.length}</div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Evaluadas</div>
        </div>
      </div>

      {/* Lista de hallazgos con falla */}
      {conFalla.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            ⚠ Secciones con hallazgo / falla
          </div>
          {conFalla.map(([key, finding]) => (
            <div key={key} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px", background: "#fef2f2",
              borderRadius: 8, marginBottom: 6, border: "1px solid #fecaca"
            }}>
              <XCircle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{key}</div>
                {finding.descripcion && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>
                    {finding.descripcion}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  <Camera size={11} style={{ display: "inline", marginRight: 3 }} />
                  {finding.images?.length ?? 0} imagen(es) adjunta(s)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista OK */}
      {sinFalla.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            ✓ Secciones sin hallazgos
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sinFalla.map(([key]) => (
              <span key={key} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "#f0fdf4", color: "#15803d",
                border: "1px solid #bbf7d0", borderRadius: 20,
                padding: "3px 10px", fontSize: 12, fontWeight: 600
              }}>
                <CheckCircle2 size={12} /> {key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sección de Esterilización ─── */
function EsterilizacionCard({
  miscValues,
  onMiscChange,
}: {
  miscValues: Record<string, string | number | null>;
  onMiscChange: (key: string, val: string | number | null) => void;
}) {
  return (
    <div className="fsa-section-card">
      <div className="fsa-section-card-header">
        <div className="fsa-section-card-icon">
          <Wrench size={18} />
        </div>
        <div>
          <div className="fsa-section-card-title">Esterilización & Misceláneos</div>
          <div className="fsa-section-card-subtitle">Verificación funcional de SST, AZS y parámetros del tanque de producto</div>
        </div>
      </div>
      <div className="fsa-section-card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Pasos funcionales */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Pasos Funcionales
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {ESTERILIZACION_CAMPOS.map((campo) => {
              const val = miscValues[campo.key] as string | null;
              return (
                <div key={campo.key} style={{
                  border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px",
                  background: val === "si" ? "#f0fdf4" : val === "no" ? "#fef2f2" : "#f8fafc"
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 10 }}>
                    {campo.label}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onMiscChange(campo.key, "si")}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: "1.5px solid",
                        borderColor: val === "si" ? "#16a34a" : "#e2e8f0",
                        background: val === "si" ? "#dcfce7" : "white",
                        color: val === "si" ? "#15803d" : "#64748b",
                      }}
                    >
                      <ThumbsUp size={14} /> Sí
                    </button>
                    <button
                      onClick={() => onMiscChange(campo.key, "no")}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        border: "1.5px solid",
                        borderColor: val === "no" ? "#dc2626" : "#e2e8f0",
                        background: val === "no" ? "#fee2e2" : "white",
                        color: val === "no" ? "#dc2626" : "#64748b",
                      }}
                    >
                      <ThumbsDown size={14} /> No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Concentración H₂O₂ */}
        <div>
          <label className="fsa-label">Concentración de H₂O₂ (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Ej: 35.0"
            className="fsa-input"
            style={{ maxWidth: 220 }}
            value={(miscValues["h2o2_concentracion"] as number) ?? ""}
            onChange={(e) =>
              onMiscChange("h2o2_concentracion", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>

        {/* Tabla presión tanque de producto */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Presión del Tanque de Producto
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Parámetro</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Unidad</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#2563eb", fontSize: 11, textTransform: "uppercase" }}>Referencia</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Valor Actual</th>
                </tr>
              </thead>
              <tbody>
                {PRESION_TANQUE_PARAMS.map((p) => (
                  <tr key={p.feature} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500, color: "#334155" }}>{p.feature}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{p.unidad}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontFamily: "monospace", color: "#2563eb", fontSize: 12 }}>{p.ref}</td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="number"
                        step="1"
                        placeholder="—"
                        className="fsa-value-input"
                        value={(miscValues[`pres_tanque_${p.feature.replace(/[^a-z0-9]/gi, "_")}`] as number) ?? ""}
                        onChange={(e) =>
                          onMiscChange(
                            `pres_tanque_${p.feature.replace(/[^a-z0-9]/gi, "_")}`,
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Observaciones generales ─── */
function ObservacionesCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="fsa-section-card">
      <div className="fsa-section-card-header">
        <div className="fsa-section-card-icon">
          <ClipboardList size={18} />
        </div>
        <div>
          <div className="fsa-section-card-title">Observaciones Generales</div>
          <div className="fsa-section-card-subtitle">
            Comentarios finales del auditor sobre el estado general de la llenadora
          </div>
        </div>
      </div>
      <div className="fsa-section-card-body">
        <textarea
          rows={6}
          placeholder="Escriba aquí cualquier observación, recomendación o nota adicional que no esté cubierta por las secciones anteriores..."
          className="fsa-input"
          style={{ resize: "vertical", lineHeight: 1.7, minHeight: 120 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── Componente principal del Paso 6 ─── */
export interface Step6MiscProps {
  copFindings: Record<string, CopFindingState>;
  miscValues: Record<string, string | number | null>;
  observacionesGen: string;
  onMiscChange: (key: string, val: string | number | null) => void;
  onObsChange: (val: string) => void;
}

export function Step6Misc({
  copFindings,
  miscValues,
  observacionesGen,
  onMiscChange,
  onObsChange,
}: Step6MiscProps) {
  return (
    <div className="fsa-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Encabezado */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <ClipboardList size={18} />
          </div>
          <div>
            <div className="fsa-section-card-title">Misceláneos & Resumen Final</div>
            <div className="fsa-section-card-subtitle">
              Cierre del reporte de auditoría de inocuidad alimentaria
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Esta es la última sección del reporte. Revise el resumen de hallazgos COP, complete los
            datos de esterilización y agregue cualquier observación final antes de enviar el reporte
            a revisión.
          </div>
        </div>
      </div>

      {/* Resumen COP */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="fsa-section-card-title">Resumen de Hallazgos COP</div>
            <div className="fsa-section-card-subtitle">Vista consolidada de todas las secciones evaluadas</div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <COPSummary copFindings={copFindings} />
        </div>
      </div>

      {/* Esterilización y Misceláneos */}
      <EsterilizacionCard miscValues={miscValues} onMiscChange={onMiscChange} />

      {/* Observaciones Generales */}
      <ObservacionesCard value={observacionesGen} onChange={onObsChange} />

    </div>
  );
}
