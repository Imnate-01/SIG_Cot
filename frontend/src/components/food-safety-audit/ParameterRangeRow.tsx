"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Minus } from "lucide-react";

interface ParameterRangeRowProps {
  feature: string;
  unidad: string;
  hh?: number | null;
  hs?: number | null;
  sp?: number | null;
  l?: number | null;
  ll?: number | null;
  ultimoValor?: number | null;
  valorActual?: number | null;
  onChange: (val: number | null) => void;
  observacion?: string;
  onObservacionChange?: (val: string) => void;
  showObservacion?: boolean;
  track?: number;
}

type CellState = "empty" | "ok" | "warn" | "error";

function getCellState(
  val: number | null | undefined,
  hh: number | null | undefined,
  hs: number | null | undefined,
  l:  number | null | undefined,
  ll: number | null | undefined
): CellState {
  if (val === null || val === undefined || val === 0 && hh === null) return "empty";
  if (ll != null && val < ll) return "error";
  if (hh != null && val > hh) return "error";
  if ((ll != null && l != null && val >= ll && val < l) ||
      (hs != null && hh != null && val > hs && val <= hh)) return "warn";
  return "ok";
}

function formatLimit(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("es-MX", { maximumFractionDigits: 3 });
}

export function ParameterRangeRow({
  feature, unidad, hh, hs, sp, l, ll,
  ultimoValor, valorActual, onChange,
  observacion = "", onObservacionChange, showObservacion = false,
  track
}: ParameterRangeRowProps) {
  const state = useMemo(
    () => getCellState(valorActual, hh, hs, l, ll),
    [valorActual, hh, hs, l, ll]
  );

  const cellClass = state === "ok" ? "fsa-cell-ok"
    : state === "warn" ? "fsa-cell-warn"
    : state === "error" ? "fsa-cell-error"
    : "";

  const StatusIcon = state === "ok"    ? <CheckCircle2 size={14} color="#16a34a" />
    : state === "warn"  ? <AlertTriangle size={14} color="#d97706" />
    : state === "error" ? <AlertTriangle size={14} color="#dc2626" />
    : null;

  return (
    <>
      <tr>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {track !== undefined && (
              <span style={{
                background: "#f1f5f9", color: "#64748b",
                fontSize: 10, fontWeight: 700, borderRadius: 4,
                padding: "1px 5px", whiteSpace: "nowrap"
              }}>
                TR{track}
              </span>
            )}
            <span style={{ fontSize: 13 }}>{feature}</span>
          </div>
          {unidad && (
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: track !== undefined ? 32 : 0 }}>
              [{unidad}]
            </span>
          )}
        </td>
        {/* Límites de referencia */}
        <td><span className="fsa-limit-cell fsa-limit-hh">{formatLimit(hh)}</span></td>
        <td><span className="fsa-limit-cell fsa-limit-hs">{formatLimit(hs)}</span></td>
        <td><span className="fsa-limit-cell fsa-limit-sp">{formatLimit(sp)}</span></td>
        <td><span className="fsa-limit-cell fsa-limit-l">{formatLimit(l)}</span></td>
        <td><span className="fsa-limit-cell fsa-limit-ll">{formatLimit(ll)}</span></td>
        {/* Último valor (referencia histórica) */}
        <td>
          <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
            {ultimoValor != null ? formatLimit(ultimoValor) : <Minus size={12} color="#cbd5e1" />}
          </span>
        </td>
        {/* Valor actual — input con semáforo */}
        <td className={cellClass}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <input
              type="number"
              step="any"
              value={valorActual ?? ""}
              onChange={e => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
              className="fsa-value-input"
              placeholder="—"
            />
            {StatusIcon}
          </div>
        </td>
      </tr>
      {showObservacion && onObservacionChange && (
        <tr>
          <td colSpan={8} style={{ paddingTop: 0, paddingLeft: 16, paddingBottom: 8 }}>
            <input
              type="text"
              value={observacion}
              onChange={e => onObservacionChange(e.target.value)}
              className="fsa-input"
              style={{ fontSize: 12, padding: "6px 12px" }}
              placeholder="Observación (opcional)..."
            />
          </td>
        </tr>
      )}
    </>
  );
}
