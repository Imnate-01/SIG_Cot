"use client";

import React, { useState } from "react";
import { ParameterRangeRow } from "./ParameterRangeRow";

/* ─── Datos de parámetros por defecto ─── */

const DEDUSTING_PARAMS = [
  { feature: "Tank Pressure Dedusting", unidad: "mbar", hh: 5.5, hs: 5.0, sp: 4.0, l: 3.5, ll: 3.0 },
  { feature: "CAM ON",                  unidad: "°",    hh: null, hs: null, sp: 60,  l: null, ll: null },
  { feature: "CAM OFF",                 unidad: "°",    hh: null, hs: null, sp: 220, l: null, ll: null },
];

const STERILE_AIR_PARAMS = [
  { feature: "Pressure sterile air fan Production",         unidad: "mbar", hh: 35,    hs: 32,    sp: 30,    l: 28,   ll: 25  },
  { feature: "Pressure sterile air fan outside production", unidad: "mbar", hh: 10,    hs: 5,     sp: 3,     l: null, ll: 0   },
  { feature: "Pressure loss prefilter",                     unidad: "mbar", hh: 5,     hs: 4,     sp: 2,     l: 0,    ll: 0   },
  { feature: "Pressure loss (HEPA) filter",                 unidad: "mbar", hh: 8,     hs: 6,     sp: 2,     l: 0,    ll: 0   },
  { feature: "Exhaust output",                              unidad: "µbar", hh: 1500,  hs: 1400,  sp: 1200,  l: 800,  ll: 700 },
  { feature: "Pressure loss flap exhaust",                  unidad: "µbar", hh: null,  hs: null,  sp: 100,   l: null, ll: null},
];

const STERILE_AIR_HOUSEHOLD = [
  { feature: "Infeed total", unidad: "mbar", hh: null, hs: null, sp: null, l: null, ll: null },
  { feature: "Exhaust total", unidad: "mbar", hh: null, hs: null, sp: null, l: null, ll: null },
];

type ParamRow = { feature: string; unidad: string; hh?: number | null; hs?: number | null; sp?: number | null; l?: number | null; ll?: number | null };
type ParamValues = Record<string, number | null>;

interface ParamTableProps {
  title: string;
  icon: string;
  params: ParamRow[];
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
  subtitle?: string;
}

function ParamTable({ title, icon, params, values, onChange, subtitle }: ParamTableProps) {
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
              <th style={{ textAlign: "left", minWidth: 200 }}>Parámetro</th>
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
                onChange={val => onChange(p.feature, val)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface Step2DedusterProps {
  values: ParamValues;
  onChange: (key: string, val: number | null) => void;
}

export function Step2Dedusting({ values, onChange }: Step2DedusterProps) {
  return (
    <div className="fsa-step-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Intro */}
      <div className="fsa-section-card">
        <div className="fsa-section-card-header">
          <div className="fsa-section-card-icon">
            <span style={{ fontSize: 18 }}>💨</span>
          </div>
          <div>
            <div className="fsa-section-card-title">Dedusting Unit & Sterile Air Balance</div>
            <div className="fsa-section-card-subtitle">
              Parámetros de presión y caudal del sistema de aire estéril
            </div>
          </div>
        </div>
        <div className="fsa-section-card-body">
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
            Registre los valores actuales medidos en campo. Las celdas se colorearán automáticamente
            de acuerdo a los límites de alarma: <span style={{ color: "#dc2626", fontWeight: 600 }}>rojo = fuera de rango HH/LL</span>,{" "}
            <span style={{ color: "#d97706", fontWeight: 600 }}>amarillo = advertencia</span>,{" "}
            <span style={{ color: "#16a34a", fontWeight: 600 }}>verde = dentro de rango</span>.
          </div>
          {/* Leyenda de columnas */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
            marginTop: 16
          }}>
            {[
              { key: "HH", label: "High-High", color: "#dc2626", bg: "#fee2e2" },
              { key: "HS", label: "High-Setpoint", color: "#f97316", bg: "#ffedd5" },
              { key: "SP", label: "Setpoint", color: "#16a34a", bg: "#dcfce7" },
              { key: "L",  label: "Low", color: "#f97316", bg: "#ffedd5" },
              { key: "LL", label: "Low-Low", color: "#dc2626", bg: "#fee2e2" },
            ].map(lim => (
              <div key={lim.key} style={{
                background: lim.bg, borderRadius: 8,
                padding: "6px 10px", textAlign: "center"
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: lim.color, fontFamily: "monospace" }}>{lim.key}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{lim.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dedusting Unit */}
      <ParamTable
        title="Dedusting Unit"
        icon="🔧"
        subtitle="Presión del tanque de dedusting y ángulos de CAM"
        params={DEDUSTING_PARAMS}
        values={values}
        onChange={onChange}
      />

      {/* Sterile Air Balance */}
      <ParamTable
        title="Sterile Air Balance"
        icon="🌬️"
        subtitle="Balance de presión del sistema de aire estéril en producción"
        params={STERILE_AIR_PARAMS}
        values={values}
        onChange={onChange}
      />

      {/* Sterile Air Household */}
      <ParamTable
        title="Sterile Air Household"
        icon="📊"
        subtitle="Caudal total de infeed y exhaust (valores en mbar)"
        params={STERILE_AIR_HOUSEHOLD}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}
