"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { iniciales, type Etapa, type SemaforoTarea } from "./pm";

/** Clases compartidas del módulo (identidad SIG: bordes finos, radio 4 px, azul de acción). */
export const campo =
  "h-10 w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)] disabled:opacity-60";
export const btnPrimario =
  "inline-flex h-9 items-center justify-center gap-2 rounded bg-sig-blue px-4 text-sm font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60";
export const btnSecundario =
  "inline-flex h-9 items-center justify-center gap-2 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700 disabled:opacity-60";
export const etiqueta = "mb-1 block text-xs font-semibold text-sig-muted";

type Tono = SemaforoTarea | "cancelled";

const ESTILOS: Record<Tono, { fondo: string; texto: string; punto: string }> = {
  done: { fondo: "bg-sig-success-soft dark:bg-zinc-800", texto: "text-sig-success", punto: "bg-sig-success" },
  overdue: { fondo: "bg-sig-danger-soft dark:bg-zinc-800", texto: "text-sig-danger", punto: "bg-sig-danger" },
  due_soon: { fondo: "bg-sig-warning-soft dark:bg-zinc-800", texto: "text-black dark:text-white", punto: "bg-sig-warning" },
  on_track: { fondo: "bg-sig-blue-soft dark:bg-zinc-800", texto: "text-sig-blue", punto: "bg-sig-blue" },
  no_date: { fondo: "bg-sig-sand dark:bg-zinc-800", texto: "text-sig-muted", punto: "bg-sig-line-strong" },
  cancelled: { fondo: "bg-sig-sand dark:bg-zinc-800", texto: "text-sig-muted", punto: "bg-sig-line-strong" },
};

const CLAVE: Record<Tono, string> = {
  done: "statusDone", overdue: "statusOverdue", due_soon: "statusDueSoon",
  on_track: "statusOnTrack", no_date: "statusNoDate", cancelled: "statusCancelled",
};

/** Etiqueta de estado. Nunca depende solo del color: lleva texto. */
export function EstadoBadge({ tono, etiquetaPropia }: { tono: Tono; etiquetaPropia?: string }) {
  const t = useTranslations("PM");
  const e = ESTILOS[tono];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${e.fondo} ${e.texto}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} aria-hidden />
      {etiquetaPropia ?? t(CLAVE[tono])}
    </span>
  );
}

export function BarraProgreso({ completadas, total, vencidas = 0 }: { completadas: number; total: number; vencidas?: number }) {
  const pct = total ? Math.round((completadas / total) * 100) : 0;
  const color = completadas === total && total > 0 ? "bg-sig-success" : vencidas > 0 ? "bg-sig-danger" : "bg-sig-blue";
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completadas}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sig-line dark:bg-zinc-700">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-black dark:text-white">{completadas}/{total}</span>
    </div>
  );
}

export function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className={etiqueta}>{label}</span>
      {children}
    </label>
  );
}

/** Iniciales de una persona en un círculo; el nombre completo va en el tooltip y para lectores de pantalla. */
export function Avatar({ nombre, tono = "neutro" }: { nombre: string; tono?: "neutro" | "hecho" }) {
  return (
    <span
      title={nombre}
      aria-label={nombre}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 text-[10px] font-bold ${tono === "hecho" ? "bg-sig-success text-white" : "bg-sig-blue-soft text-sig-blue dark:bg-zinc-700 dark:text-white"}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

/**
 * Avance del PM como una barra por etapa: cada segmento mide lo que pesa la
 * etapa (sus tareas sobre 31) y se llena con lo completado. Rojo si la etapa
 * tiene tareas vencidas.
 */
export function BarraEtapas({ etapas, conVencidas }: { etapas: Etapa[]; conVencidas: Set<number> }) {
  const total = etapas.reduce((a, e) => a + e.tareas.length, 0) || 1;
  return (
    <div className="flex h-2.5 w-full gap-[3px]" aria-hidden>
      {etapas.map((e) => {
        const lleno = e.tareas.length ? (e.completadas / e.tareas.length) * 100 : 0;
        const color = e.completadas === e.tareas.length ? "bg-sig-success" : conVencidas.has(e.orden) ? "bg-sig-danger" : "bg-sig-blue";
        return (
          <div key={e.orden} title={`${e.nombre}: ${e.completadas}/${e.tareas.length}`} className="h-full overflow-hidden rounded-sm bg-sig-line dark:bg-zinc-700" style={{ width: `${(e.tareas.length / total) * 100}%` }}>
            <div className={`h-full ${color}`} style={{ width: `${lleno}%` }} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Campo de texto con lista desplegable de sugerencias (se puede escribir otro valor).
 * Al abrirlo con el botón ▾ muestra todas las opciones; al escribir, filtra.
 */
export function CampoSugerencias({
  value, onChange, opciones, onElegir, placeholder, ariaLabel, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: Array<{ valor: string; detalle?: string }>;
  onElegir?: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
}) {
  const [abierto, setAbierto] = React.useState(false);
  const [todas, setTodas] = React.useState(false);
  const [activo, setActivo] = React.useState(-1);
  const id = React.useId();
  const q = value.trim().toLowerCase();
  const visibles = (todas || !q ? opciones : opciones.filter((o) => `${o.valor} ${o.detalle ?? ""}`.toLowerCase().includes(q))).slice(0, 50);
  const elegir = (v: string) => { onChange(v); onElegir?.(v); setAbierto(false); setActivo(-1); };
  const hay = opciones.length > 0;

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <input
        type={type}
        className={`${campo} ${hay ? "pr-9" : ""}`}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={hay ? "combobox" : undefined}
        aria-expanded={hay ? abierto : undefined}
        aria-controls={hay ? id : undefined}
        aria-autocomplete={hay ? "list" : undefined}
        autoComplete="off"
        onFocus={() => { if (hay) { setTodas(true); setAbierto(true); } }}
        onChange={(e) => { onChange(e.target.value); setTodas(false); setAbierto(hay); setActivo(-1); }}
        onKeyDown={(e) => {
          if (!hay) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((i) => Math.min(i + 1, visibles.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && abierto && activo >= 0 && visibles[activo]) { e.preventDefault(); elegir(visibles[activo].valor); }
          else if (e.key === "Escape") setAbierto(false);
        }}
      />
      {hay && (
        <button
          type="button" tabIndex={-1} aria-label="Show options"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-sig-muted hover:bg-sig-sand dark:hover:bg-zinc-700"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setTodas(true); setAbierto((a) => !a); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
      )}
      {hay && abierto && visibles.length > 0 && (
        <ul id={id} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 py-1 shadow-lg">
          {visibles.map((o, i) => (
            <li key={`${o.valor}-${i}`} role="option" aria-selected={i === activo}>
              <button
                type="button" tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o.valor)}
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm ${i === activo ? "bg-sig-blue-soft dark:bg-zinc-700" : "hover:bg-sig-sand dark:hover:bg-zinc-700"} ${o.valor === value ? "font-semibold" : ""} text-black dark:text-white`}
              >
                <span className="min-w-0 truncate">{o.valor}</span>
                {o.detalle && <span className="shrink-0 text-xs text-sig-muted">{o.detalle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
