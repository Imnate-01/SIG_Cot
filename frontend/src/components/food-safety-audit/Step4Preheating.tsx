"use client";

import React from "react";
import { ParameterRangeRow } from "./ParameterRangeRow";

/* ─────────────────────────────────────────
   DATOS DE PARÁMETROS — Preheating & SST
───────────────────────────────────────── */

// Parámetros de Preheating & Drying por volumen
const PREHEATING_SETPOINTS = [
  { feature: "Temp. Preheating 500ml / Drive ON",       unidad: "°C", hh: 5,  hs: 5,  sp: 130, l: -5, ll: -5 },
  { feature: "Temp. Preheating 750ml / Drive ON",       unidad: "°C", hh: 5,  hs: 5,  sp: 170, l: -5, ll: -5 },
  { feature: "Temp. Preheating 960-1000ml / Drive ON",  unidad: "°C", hh: 5,  hs: 5,  sp: 230, l: -5, ll: -5 },
  { feature: "Temp. Preheating All / Drive OFF",        unidad: "°C", hh: 5,  hs: 5,  sp: 100, l: -5, ll: -5 },
  { feature: "Temp. Drying 500ml / Drive ON",           unidad: "°C", hh: 5,  hs: 5,  sp: 120, l: -5, ll: -5 },
  { feature: "Temp. Drying 750ml / Drive ON",           unidad: "°C", hh: 5,  hs: 5,  sp: 140, l: -5, ll: -5 },
  { feature: "Temp. Drying 960-1000ml / Drive ON",      unidad: "°C", hh: 5,  hs: 5,  sp: 180, l: -5, ll: -5 },
  { feature: "Temp. Drying All / Drive OFF",            unidad: "°C", hh: 5,  hs: 5,  sp: 100, l: -5, ll: -5 },
];

// SST (Steam Sterilization) - temperaturas principales
const SST_PARAMS = [
  { feature: "Steam supply",       unidad: "°C", hh: 170, hs: 165, sp: 155, l: 130, ll: 125 },
  { feature: "Temperatures SST",   unidad: "°C", hh: 140, hs: 135, sp: 125, l: 121, ll: 115 },
];

// Steam barriers
const STEAM_BARRIERS = [
  { feature: "Steam barrier behind controller (R)", unidad: "°C", hh: 140, hs: 135, sp: 125, l: 115, ll: 102 },
  { feature: "Steam barrier behind controller (A)", unidad: "°C", hh: 140, hs: 135, sp: 115, l: 110, ll: 102 },
  { feature: "Steam barrier (R) — passive",         unidad: "°C", hh: 140, hs: 135, sp: 40,  l: 30,  ll: 25  },
  { feature: "Steam injection tr 1/2",              unidad: "°C", hh: 140, hs: 135, sp: 125, l: 110, ll: 102 },
  { feature: "Steam injection tr 3/4",              unidad: "°C", hh: 140, hs: 135, sp: 125, l: 110, ll: 102 },
];

// Condensate barrier (dairy)
const CONDENSATE_BARRIERS = [
  { feature: "Condensate barrier with steam",     unidad: "°C", hh: 140, hs: 135, sp: 115, l: 110, ll: 102 },
  { feature: "Condensate barrier flushing",       unidad: "°C", hh: 135, hs: 130, sp: 90,  l: 80,  ll: 75  },
  { feature: "Condensate barrier with condensate",unidad: "°C", hh: 75,  hs: 65,  sp: 35,  l: 25,  ll: 20  },
];

type ParamRow = {
  feature: string; unidad: string;
  hh?: number | null; hs?: number | null; sp?: number | null; l?: number | null; ll?: number | null;
};
type ParamValues = Record<string, number | null>;

// ─── Componente reutilizable de tabla de parámetros ───
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

// ─── Tabla de medición por track para Preheating dinámico ───
function TrackMeasurementCard({
  values, onChange,
}: {
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
}) {
  const tracks = [1, 2, 3, 4];
  const params = [
    { label: "pdyn preheating (NW 19)", key: "pdyn_preh", unidad: "mmwc", sp: 34 },
    { label: "Temperature preheating",  key: "temp_preh", unidad: "°C",   sp: 100 },
    { label: "pdyn drying (NW 19)",     key: "pdyn_dry",  unidad: "mmwc", sp: 26 },
    { label: "Temperature drying",      key: "temp_dry",  unidad: "°C",   sp: 100 },
  ];

  return (
    <div className="fsa-section-card">
      <div className="fsa-section-card-header">
        <div className="fsa-section-card-icon">
          <span style={{ fontSize: 18 }}>🔥</span>
        </div>
        <div>
          <div className="fsa-section-card-title">Medición de Nozzles por Track</div>
          <div className="fsa-section-card-subtitle">Valores pdyn y temperatura por track (1–4)</div>
        </div>
      </div>
      <div style={{ overflowX: "auto", padding: "0 0 4px 0" }}>
        <table className="fsa-param-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left", minWidth: 220 }}>Parámetro</th>
              <th>Unidad</th>
              <th>SP ref.</th>
              {tracks.map((t) => (
                <th key={t} style={{ color: "#2563eb" }}>Track {t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.key}>
                <td style={{ fontWeight: 500, color: "#334155" }}>{p.label}</td>
                <td style={{ textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{p.unidad}</td>
                <td style={{ textAlign: "center", fontFamily: "monospace", color: "#2563eb", fontSize: 13 }}>
                  {p.sp} ±2
                </td>
                {tracks.map((t) => {
                  const fieldKey = `${p.key}_tr${t}`;
                  const val = values[fieldKey];
                  const isOk = val !== null && val !== undefined && Math.abs(val - p.sp) <= 2;
                  const isWarn = val !== null && val !== undefined && !isOk && Math.abs(val - p.sp) <= 5;
                  return (
                    <td key={t} className={isOk ? "fsa-cell-ok" : isWarn ? "fsa-cell-warn" : ""}>
                      <input
                        type="number"
                        step="0.1"
                        className="fsa-value-input"
                        placeholder="—"
                        value={val ?? ""}
                        onChange={(e) => onChange(fieldKey, e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Componente principal del Paso 4 ─── */
export interface Step4PreheatingProps {
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
}

export function Step4Preheating({ values, onChange }: Step4PreheatingProps) {
  return (
    <div className="fsa-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header informativo */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>🌡️</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Preheating, Drying & SST</div>
            <div className="fsa-section-card-subtitle">
              Calentamiento previo, secado y esterilización por vapor
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Registre los valores medidos para el sistema de calentamiento previo (Preheating), secado y
            esterilización por vapor (SST). Las barreras de vapor son críticas para la inocuidad — cualquier
            lectura por debajo de LL debe documentarse como hallazgo inmediato.
          </div>
        </div>
      </div>

      {/* Nozzles por Track (medición dinámica) */}
      <TrackMeasurementCard values={values} onChange={onChange} />

      {/* Setpoints por volumen */}
      <ParamTable
        title="Setpoints de Temperatura por Volumen"
        icon="📐"
        subtitle="Preheating y Drying según el volumen del envase y estado del drive"
        params={PREHEATING_SETPOINTS}
        values={values}
        onChange={onChange}
      />

      {/* SST principal */}
      <ParamTable
        title="Steam Sterilization (SST)"
        icon="♨️"
        subtitle="Temperatura de vapor de suministro y puntos SST"
        params={SST_PARAMS}
        values={values}
        onChange={onChange}
      />

      {/* Steam Barriers */}
      <ParamTable
        title="Steam Barriers"
        icon="🔒"
        subtitle="Barreras de vapor detrás del controlador e inyección por track"
        params={STEAM_BARRIERS}
        values={values}
        onChange={onChange}
      />

      {/* Condensate Barrier (Dairy) */}
      <ParamTable
        title="Condensate Barrier (Dairy)"
        icon="💧"
        subtitle="Barreras de condensado para plantas de lácteos"
        params={CONDENSATE_BARRIERS}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}
