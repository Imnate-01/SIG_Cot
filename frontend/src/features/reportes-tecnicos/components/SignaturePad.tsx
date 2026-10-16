"use client";
import React, { useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

// ─────────────────────────────────────────────
// Signature pad simple (canvas -> base64)
// Guardamos base64 local, y tu backend lo puede subir a storage y guardar URL.
// ─────────────────────────────────────────────
export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl?: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.floor(rect.width * ratio);
    c.height = Math.floor(rect.height * ratio);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    onChange(undefined);
  };

  const exportImage = () => {
    const c = canvasRef.current;
    if (!c) return;
    onChange(c.toDataURL("image/png"));
  };

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const last = lastRef.current;
    if (!last) {
      lastRef.current = p;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const up = () => {
    drawingRef.current = false;
    lastRef.current = null;
    exportImage();
  };

  return (
    <div className="rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Pencil size={18} className="text-slate-600 dark:text-gray-400" />
          <p className="font-extrabold text-slate-800 dark:text-white">{label}</p>
        </div>
        <button type="button" onClick={clear} className="text-sm font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-gray-300">
          Limpiar
        </button>
      </div>
      <div className="rounded-xl border bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      {value ? (
        <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">✔ Firma capturada</p>
      ) : (
        <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">Dibuja tu firma en el recuadro.</p>
      )}
    </div>
  );
}
