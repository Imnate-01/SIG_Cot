"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { EvidenceUploader, EvidenceImageItem } from "./EvidenceUploader";

export interface CopFindingState {
  seccion_cop: string;
  cam_on: number;
  cam_off: number;
  descripcion: string;
  tiene_falla: boolean;
  cop_db_id?: number;   // ID en BD una vez guardado (para vincular imágenes)
  images?: EvidenceImageItem[];
}

const COP_SECTIONS: { key: string; label: string; number: string }[] = [
  { key: "alimentacion_envase", label: "Alimentación de Envase", number: "4.1" },
  { key: "magazine",            label: "Magazine",                number: "4.2" },
  { key: "dedusting",           label: "Dedusting Unit",          number: "4.3" },
  { key: "preheating_drying",   label: "Preheating and Drying",   number: "4.4" },
  { key: "llenado",             label: "Llenado",                 number: "4.5" },
  { key: "ultrasonido",         label: "Ultrasonido",             number: "4.6" },
  { key: "mesa_salida",         label: "Mesa de Salida",          number: "4.7" },
  { key: "cadena_celdas",       label: "Cadena de Celdas / Guía de Fondo", number: "4.8" },
  { key: "bloque_valvulas",     label: "Bloque de Válvulas",      number: "4.9" },
  { key: "areas_circundantes",  label: "Áreas Circundantes",      number: "4.10" },
];

interface CopSectionCardProps {
  section: typeof COP_SECTIONS[0];
  finding: CopFindingState;
  onChange: (val: CopFindingState) => void;
  auditId?: number;
}

function CopSectionCard({ section, finding, onChange, auditId }: CopSectionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded(p => !p);

  const hasFault = finding.tiene_falla;
  const hasContent = finding.descripcion.trim().length > 0;

  return (
    <div className="fsa-cop-card">
      {/* Header clickable */}
      <div className="fsa-cop-card-header" onClick={toggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            background: "#e2e8f0", color: "#64748b",
            fontSize: 11, fontWeight: 800, borderRadius: 6,
            padding: "3px 7px", fontFamily: "monospace"
          }}>
            {section.number}
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{section.label}</div>
            {!expanded && hasContent && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }} className="line-clamp-1">
                {finding.descripcion.substring(0, 80)}...
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Estado pill */}
          {hasContent && (
            hasFault
              ? <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", padding: "2px 8px", borderRadius: 99 }}>
                  <AlertCircle size={11} /> Falla detectada
                </span>
              : <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "2px 8px", borderRadius: 99 }}>
                  <CheckCircle2 size={11} /> OK
                </span>
          )}
          {expanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </div>

      {/* Body expandible */}
      {expanded && (
        <div className="fsa-cop-card-body">
          {/* Ángulos CAM */}
          <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label className="fsa-label">CAM ON (°)</label>
              <input
                type="number"
                className="fsa-input"
                value={finding.cam_on}
                onChange={e => onChange({ ...finding, cam_on: parseFloat(e.target.value) || 0 })}
                style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="fsa-label">CAM OFF (°)</label>
              <input
                type="number"
                className="fsa-input"
                value={finding.cam_off}
                onChange={e => onChange({ ...finding, cam_off: parseFloat(e.target.value) || 0 })}
                style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 18 }}>
            <label className="fsa-label">Descripción general / Hallazgos</label>
            <textarea
              className="fsa-input"
              rows={3}
              value={finding.descripcion}
              onChange={e => onChange({ ...finding, descripcion: e.target.value })}
              placeholder="Describa el estado general de limpieza, desviaciones o recomendaciones encontradas en esta sección..."
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Toggle falla */}
          <div style={{ marginBottom: hasFault ? 16 : 0 }}>
            <label className="fsa-label" style={{ marginBottom: 8 }}>¿Se detectó falla o área de oportunidad?</label>
            <div className="fsa-falla-toggle">
              <button
                type="button"
                className={`fsa-falla-btn ok ${!hasFault ? "active" : ""}`}
                onClick={() => onChange({ ...finding, tiene_falla: false })}
              >
                ✓ Sin falla
              </button>
              <button
                type="button"
                className={`fsa-falla-btn fail ${hasFault ? "active" : ""}`}
                onClick={() => onChange({ ...finding, tiene_falla: true })}
              >
                ⚠ Falla detectada
              </button>
            </div>
          </div>

          {/* Evidencias fotográficas (siempre disponible) */}
          <div style={{
            marginTop: 16,
            border: finding.tiene_falla ? "1.5px solid #fca5a5" : "1.5px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            background: finding.tiene_falla ? "#fef2f2" : "#f8fafc"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Camera size={16} color={finding.tiene_falla ? "#dc2626" : "#64748b"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: finding.tiene_falla ? "#991b1b" : "#475569" }}>
                Evidencias fotográficas
              </span>
              <span style={{ fontSize: 11, color: finding.tiene_falla ? "#dc2626" : "#94a3b8", marginLeft: 4 }}>
                {finding.tiene_falla ? "(requerido para hallazgos con falla)" : "(opcional)"}
              </span>
            </div>
            {auditId && finding.cop_db_id ? (
              <EvidenceUploader
                auditId={auditId}
                copFindingId={finding.cop_db_id}
                images={finding.images || []}
                onUploaded={(img) => onChange({
                  ...finding,
                  images: [...(finding.images || []), img]
                })}
                onDeleted={(imgId) => onChange({
                  ...finding,
                  images: (finding.images || []).filter(i => i.id !== imgId)
                })}
                onCaptionChange={(imgId, caption) => onChange({
                  ...finding,
                  images: (finding.images || []).map(i => i.id === imgId ? { ...i, caption } : i)
                })}
              />
            ) : (
              <div style={{
                background: "#fff", border: finding.tiene_falla ? "1px dashed #fca5a5" : "1px dashed #cbd5e1",
                borderRadius: 8, padding: "14px", fontSize: 12, color: "#94a3b8",
                textAlign: "center"
              }}>
                💾 Guarda el reporte primero para habilitar la carga de imágenes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Step1COPProps {
  findings: Record<string, CopFindingState>;
  onChange: (key: string, val: CopFindingState) => void;
  auditId?: number;
}

export function Step1COP({ findings, onChange, auditId }: Step1COPProps) {
  return (
    <div className="fsa-step-enter">
      {/* Encabezado de sección */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>🧹</span>
          </div>
          <div>
            <div className="fsa-section-card-title">COP — Cleaning Out of Place</div>
            <div className="fsa-section-card-subtitle">
              Inspección visual de limpieza por secciones de la llenadora
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Expanda cada sección para registrar los ángulos CAM ON/OFF, la descripción del estado
            de limpieza y si se detectó alguna falla o área de oportunidad. Las secciones con falla
            requieren evidencia fotográfica.
          </p>

          {/* Leyenda de íconos */}
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#15803d", background: "#dcfce7", padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
              ✓ OK — Sin fallas
            </span>
            <span style={{ fontSize: 11, color: "#991b1b", background: "#fee2e2", padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
              ⚠ Falla detectada
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8", padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>
              (vacío) — Pendiente de revisión
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas de sección COP */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {COP_SECTIONS.map(section => (
          <CopSectionCard
            key={section.key}
            section={section}
            finding={findings[section.key] || { seccion_cop: section.key, cam_on: 60, cam_off: 220, descripcion: "", tiene_falla: false }}
            onChange={val => onChange(section.key, val)}
            auditId={auditId}
          />
        ))}
      </div>
    </div>
  );
}
