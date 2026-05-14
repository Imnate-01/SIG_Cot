"use client";

import React, { useState } from "react";
import { ParameterRangeRow } from "./ParameterRangeRow";
import { Plus, Trash2, Beaker } from "lucide-react";

/* ─────────────────────────────────────────
   DATOS DE PARÁMETROS — CIP
───────────────────────────────────────── */

const CIP_MEDIA_PARAMS = [
  { feature: "Temperatura agua",                   unidad: "°C",  hh: 100, hs: 100, sp: 20,     l: 0,    ll: 0     },
  { feature: "Temperatura soda cáustica",          unidad: "°C",  hh: 80,  hs: 75,  sp: 70,     l: 65,   ll: 60    },
  { feature: "Temperatura ácido",                  unidad: "°C",  hh: 75,  hs: 70,  sp: 65,     l: 60,   ll: 55    },
  { feature: "Total flow volume during CIP",       unidad: "l/h", hh: null,hs: null, sp: 10000, l: null, ll: 8000  },
];

type ParamRow = {
  feature: string; unidad: string;
  hh?: number | null; hs?: number | null; sp?: number | null; l?: number | null; ll?: number | null;
};
type ParamValues = Record<string, number | null>;

function ParamTable({
  title, icon, subtitle, params, values, onChange,
}: {
  title: string; icon: string; subtitle?: string;
  params: ParamRow[]; values: ParamValues;
  onChange: (key: string, val: number | null) => void;
}) {
  return (
    <div className="fsa-section-card">
      <div className="fsa-section-card-header">
        <div className="fsa-section-card-icon">
          <span style={{ fontSize: 18 }}>{icon}</span>
        </div>
        <div>
          <div className="fsa-section-card-title">{title}</div>
          {subtitle && <div className="fsa-section-card-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="fsa-param-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left", minWidth: 260 }}>Parámetro</th>
              <th style={{ color: "#dc2626" }}>HH</th>
              <th style={{ color: "#f97316" }}>HS</th>
              <th style={{ color: "#2563eb" }}>SP</th>
              <th style={{ color: "#f97316" }}>L</th>
              <th style={{ color: "#dc2626" }}>LL</th>
              <th>Último</th>
              <th>Actual</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <ParameterRangeRow
                key={`${p.feature}-${i}`}
                feature={p.feature}
                unidad={p.unidad}
                hh={p.hh}
                hs={p.hs}
                sp={p.sp}
                l={p.l}
                ll={p.ll}
                valorActual={values[p.feature] ?? null}
                onChange={(val) => onChange(p.feature, val)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tarjeta de agente de limpieza ─── */
function CleaningAgentCard({
  agentLabel,
  fieldPrefix,
  values,
  onChange,
}: {
  agentLabel: string;
  fieldPrefix: string;
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
}) {
  return (
    <div style={{
      border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "16px 20px",
      background: "#f8fafc"
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Beaker size={16} className="text-blue-500" />
        {agentLabel}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="fsa-label">Conductividad (mS/cm)</label>
          <input
            type="number"
            step="0.01"
            className="fsa-input"
            placeholder="Ej: 75.3"
            value={values[`${fieldPrefix}_conductividad`] ?? ""}
            onChange={(e) =>
              onChange(`${fieldPrefix}_conductividad`, e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
        <div>
          <label className="fsa-label">Concentración (% por titulación)</label>
          <input
            type="number"
            step="0.1"
            className="fsa-input"
            placeholder="Ej: 2.5"
            value={values[`${fieldPrefix}_concentracion`] ?? ""}
            onChange={(e) =>
              onChange(`${fieldPrefix}_concentracion`, e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Tabla de flujos por cabezal (CIP flow) ─── */
interface CipFlowRow {
  id: string;
  paso: "pre_rinsing" | "otros";
  track: number;
  cabezal: number;
  tipo_cabezal: string;
  flujo_ml_s: number | null;
  volumen_hmi: number | null;
  volumen_cip: number | null;
}

function CipFlowsTable({
  flows,
  onFlowsChange,
}: {
  flows: CipFlowRow[];
  onFlowsChange: (flows: CipFlowRow[]) => void;
}) {
  const addRow = (paso: "pre_rinsing" | "otros") => {
    const nextTrack = (flows.filter((f) => f.paso === paso).length % 4) + 1;
    const newRow: CipFlowRow = {
      id: `${Date.now()}-${Math.random()}`,
      paso,
      track: nextTrack,
      cabezal: 1,
      tipo_cabezal: "",
      flujo_ml_s: null,
      volumen_hmi: null,
      volumen_cip: null,
    };
    onFlowsChange([...flows, newRow]);
  };

  const updateRow = (id: string, updates: Partial<CipFlowRow>) => {
    onFlowsChange(flows.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeRow = (id: string) => {
    onFlowsChange(flows.filter((f) => f.id !== id));
  };

  const renderSection = (paso: "pre_rinsing" | "otros", label: string) => {
    const sectionFlows = flows.filter((f) => f.paso === paso);
    return (
      <div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #e2e8f0"
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{label}</div>
          <button
            onClick={() => addRow(paso)}
            style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
              color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600
            }}
          >
            <Plus size={13} /> Agregar cabezal
          </button>
        </div>
        {sectionFlows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>
            Sin registros. Haz clic en "Agregar cabezal" para iniciar.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Track</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Cabezal</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Tipo de Filling Head</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Flujo (ml/s)</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Vol. HMI (l)</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Vol. CIP (l)</th>
                  <th style={{ padding: "8px 6px" }}></th>
                </tr>
              </thead>
              <tbody>
                {sectionFlows.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <select
                        value={f.track}
                        onChange={(e) => updateRow(f.id, { track: Number(e.target.value) })}
                        style={{ width: 60, textAlign: "center", padding: "4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                      >
                        {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <select
                        value={f.cabezal}
                        onChange={(e) => updateRow(f.id, { cabezal: Number(e.target.value) })}
                        style={{ width: 60, textAlign: "center", padding: "4px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                      >
                        {[1, 2].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <input
                        type="text"
                        placeholder="Tipo de cabezal..."
                        value={f.tipo_cabezal}
                        onChange={(e) => updateRow(f.id, { tipo_cabezal: e.target.value })}
                        style={{ width: "100%", minWidth: 150, padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                      />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="—"
                        value={f.flujo_ml_s ?? ""}
                        onChange={(e) => updateRow(f.id, { flujo_ml_s: e.target.value === "" ? null : Number(e.target.value) })}
                        className="fsa-value-input"
                      />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="—"
                        value={f.volumen_hmi ?? ""}
                        onChange={(e) => updateRow(f.id, { volumen_hmi: e.target.value === "" ? null : Number(e.target.value) })}
                        className="fsa-value-input"
                      />
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "center" }}>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="—"
                        value={f.volumen_cip ?? ""}
                        onChange={(e) => updateRow(f.id, { volumen_cip: e.target.value === "" ? null : Number(e.target.value) })}
                        className="fsa-value-input"
                      />
                    </td>
                    <td style={{ padding: "6px 6px", textAlign: "center" }}>
                      <button
                        onClick={() => removeRow(f.id)}
                        style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4 }}
                        title="Eliminar fila"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fsa-section-card">
      <div className="fsa-section-card-header">
        <div className="fsa-section-card-icon">
          <span style={{ fontSize: 18 }}>🚿</span>
        </div>
        <div>
          <div className="fsa-section-card-title">Flujos por Cabezal de Llenado</div>
          <div className="fsa-section-card-subtitle">
            Caudal (ml/s) y volumen total (HMI vs CIP) por track y cabezal
          </div>
        </div>
      </div>
      <div className="fsa-section-card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {renderSection("pre_rinsing", "Pre-Rinsing (Cabezal individual)")}
        {renderSection("otros", "Otros pasos de limpieza (todos los cabezales abiertos)")}
      </div>
    </div>
  );
}

/* ─── Componente principal del Paso 5 ─── */
export interface CipFlowRowExport extends CipFlowRow {}

export interface Step5CIPProps {
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
  cipFlows: CipFlowRow[];
  onCipFlowsChange: (flows: CipFlowRow[]) => void;
}

export function Step5CIP({ values, onChange, cipFlows, onCipFlowsChange }: Step5CIPProps) {
  return (
    <div className="fsa-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Intro */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>🧼</span>
          </div>
          <div>
            <div className="fsa-section-card-title">CIP — Cleaning in Place</div>
            <div className="fsa-section-card-subtitle">
              Parámetros de medios de limpieza y flujos por cabezal de llenado
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Documente los parámetros de temperatura y concentración de los agentes de limpieza, y capture
            los flujos individuales por cabezal para cada track de la llenadora. Esta información es clave
            para validar la eficiencia del proceso CIP.
          </div>
        </div>
      </div>

      {/* Parámetros de medios CIP */}
      <ParamTable
        title="Parámetros de Medios de Limpieza"
        icon="🌡️"
        subtitle="Temperaturas de agua, soda cáustica y ácido durante el CIP"
        params={CIP_MEDIA_PARAMS}
        values={values}
        onChange={onChange}
      />

      {/* Agentes de limpieza */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>⚗️</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Concentración de Agentes de Limpieza</div>
            <div className="fsa-section-card-subtitle">
              Conductividad (mS/cm) y concentración (% titulación) de cada agente
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CleaningAgentCard
            agentLabel="Soda Cáustica (NaOH)"
            fieldPrefix="cip_soda"
            values={values}
            onChange={onChange}
          />
          <CleaningAgentCard
            agentLabel="Ácido (Peracético / Cítrico)"
            fieldPrefix="cip_acido"
            values={values}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Flujos por cabezal */}
      <CipFlowsTable flows={cipFlows} onFlowsChange={onCipFlowsChange} />
    </div>
  );
}
