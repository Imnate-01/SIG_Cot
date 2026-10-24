"use client";
import React from "react";
import { useTranslations } from "next-intl";
import type { SemaforoTarea } from "./pm";

/** Clases compartidas del módulo (identidad SIG: bordes finos, radio 4 px, azul de acción). */
export const campo =
  "h-10 w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)] disabled:opacity-60";
export const btnPrimario =
  "inline-flex h-9 items-center justify-center gap-2 rounded bg-sig-blue px-4 text-sm font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60";
export const btnSecundario =
  "inline-flex h-9 items-center justify-center gap-2 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700 disabled:opacity-60";
export const etiqueta = "mb-1 block text-xs font-semibold uppercase tracking-wide text-sig-muted";

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
