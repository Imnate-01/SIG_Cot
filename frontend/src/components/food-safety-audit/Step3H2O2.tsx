"use client";

import React from "react";
import { ParameterRangeRow } from "./ParameterRangeRow";

const H2O2_PARAMS_TRACKS_12 = [
  { feature: "Spray qty H₂O₂ Prod. A/wine (≥500ml)", unidad: "µl/s", hh: 380, hs: 355, sp: 330, l: 305, ll: 280 },
  { feature: "Spray qty H₂O₂ Prod. AL (≥500ml)",    unidad: "µl/s", hh: 500, hs: 475, sp: 450, l: 425, ll: 400 },
  { feature: "Spray qty H₂O₂ Prod. Reduced",        unidad: "µl/s", hh: 275, hs: 250, sp: 225, l: 200, ll: 175 },
  { feature: "Spray qty H₂O₂ Sterilization",        unidad: "µl/s", hh: 350, hs: 325, sp: 300, l: 275, ll: 250 },
];

const H2O2_GENERAL_PARAMS = [
  { feature: "H₂O₂ medium temperature",                     unidad: "°C",   hh: 290, hs: 285, sp: 270, l: 255, ll: 250 },
  { feature: "Temperature upper H₂O₂ heater",               unidad: "°C",   hh: 180, hs: 180, sp: 160, l: 140, ll: 140 },
  { feature: "Transporting air H₂O₂ Sterilization",         unidad: "l/min",hh: 183, hs: null, sp: 166, l: null, ll: 150 },
  { feature: "Transporting air Production",                  unidad: "l/min",hh: 220, hs: null, sp: 200, l: null, ll: 180 },
  { feature: "Pressure transporting air (dosing piston)",    unidad: "mbar", hh: 2000, hs: 1800, sp: 1000, l: 600, ll: 500 },
  { feature: "Pressure transporting air (analogue 2015)",    unidad: "mbar", hh: 4500, hs: 4000, sp: 3000, l: 1500, ll: 1000 },
];

type ParamValues = Record<string, number | null>;

interface Step3H2O2Props {
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
  h2o2Proveedor?: string;
  h2o2Tipo?: string;
  h2o2Concentracion?: number | null;
  onMetaChange?: (field: string, val: any) => void;
}

export function Step3H2O2({ values, onChange, h2o2Proveedor = "", h2o2Tipo = "", h2o2Concentracion = null, onMetaChange }: Step3H2O2Props) {
  return (
    <div className="fsa-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Datos generales del H₂O₂ */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>🧪</span>
          </div>
          <div>
            <div className="fsa-section-card-title">H₂O₂ — Peróxido de Hidrógeno</div>
            <div className="fsa-section-card-subtitle">Parámetros de dosificación y transporte del agente esterilizante</div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label className="fsa-label">Proveedor</label>
              <input
                type="text"
                className="fsa-input"
                value={h2o2Proveedor}
                onChange={e => onMetaChange?.("h2o2Proveedor", e.target.value)}
                placeholder="Ej: EVONIK"
              />
            </div>
            <div>
              <label className="fsa-label">Tipo</label>
              <input
                type="text"
                className="fsa-input"
                value={h2o2Tipo}
                onChange={e => onMetaChange?.("h2o2Tipo", e.target.value)}
                placeholder="Ej: Perhydrol"
              />
            </div>
            <div>
              <label className="fsa-label">Concentración (%)</label>
              <input
                type="number"
                step="0.1"
                className="fsa-input"
                value={h2o2Concentracion ?? ""}
                onChange={e => onMetaChange?.("h2o2Concentracion", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Ej: 35.0"
                style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla tracks 1/2 */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 16 }}>1/2</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Dosificación H₂O₂ — Tracks 1/2</div>
            <div className="fsa-section-card-subtitle">Spray quantities por modo de operación</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fsa-param-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", minWidth: 240 }}>Parámetro</th>
                <th style={{ color: "#dc2626" }}>HH</th>
                <th style={{ color: "#f97316" }}>HS</th>
                <th style={{ color: "#16a34a" }}>SP</th>
                <th style={{ color: "#f97316" }}>L</th>
                <th style={{ color: "#dc2626" }}>LL</th>
                <th>Último</th>
                <th>Actual</th>
              </tr>
            </thead>
            <tbody>
              {H2O2_PARAMS_TRACKS_12.map((p, i) => (
                <ParameterRangeRow
                  key={`h2o2-t12-${i}`}
                  {...p}
                  valorActual={values[`t12_${p.feature}`] ?? null}
                  onChange={val => onChange(`t12_${p.feature}`, val)}
                  track={12}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla tracks 3/4 */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 16 }}>3/4</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Dosificación H₂O₂ — Tracks 3/4</div>
            <div className="fsa-section-card-subtitle">Spray quantities por modo de operación</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fsa-param-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", minWidth: 240 }}>Parámetro</th>
                <th style={{ color: "#dc2626" }}>HH</th>
                <th style={{ color: "#f97316" }}>HS</th>
                <th style={{ color: "#16a34a" }}>SP</th>
                <th style={{ color: "#f97316" }}>L</th>
                <th style={{ color: "#dc2626" }}>LL</th>
                <th>Último</th>
                <th>Actual</th>
              </tr>
            </thead>
            <tbody>
              {H2O2_PARAMS_TRACKS_12.map((p, i) => (
                <ParameterRangeRow
                  key={`h2o2-t34-${i}`}
                  {...p}
                  valorActual={values[`t34_${p.feature}`] ?? null}
                  onChange={val => onChange(`t34_${p.feature}`, val)}
                  track={34}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parámetros generales */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>⚙️</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Parámetros Generales H₂O₂</div>
            <div className="fsa-section-card-subtitle">Temperatura, caudal y presión del sistema de transporte</div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fsa-param-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left", minWidth: 260 }}>Parámetro</th>
                <th style={{ color: "#dc2626" }}>HH</th>
                <th style={{ color: "#f97316" }}>HS</th>
                <th style={{ color: "#16a34a" }}>SP</th>
                <th style={{ color: "#f97316" }}>L</th>
                <th style={{ color: "#dc2626" }}>LL</th>
                <th>Último</th>
                <th>Actual</th>
              </tr>
            </thead>
            <tbody>
              {H2O2_GENERAL_PARAMS.map((p, i) => (
                <ParameterRangeRow
                  key={`h2o2-gen-${i}`}
                  {...p}
                  valorActual={values[`gen_${p.feature}`] ?? null}
                  onChange={val => onChange(`gen_${p.feature}`, val)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
