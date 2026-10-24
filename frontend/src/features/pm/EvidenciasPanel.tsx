"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ExternalLink, File as FileIcon, FileText, Image as ImageIcon, Link2, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import { supabase } from "@/lib/supabase";
import { ACCEPT_EVIDENCIAS, esImagen, formatearTamano, validarArchivo } from "./evidencias";
import { comprimirImagen } from "./comprimirImagen";
import { fechaLocalDe, formatearFecha, nombreUsuario, type PmEvidencia, type PmTarea, type UsuarioPm } from "./pm";
import { campo } from "./ui";

const btnCompacto = "inline-flex h-8 items-center justify-center gap-1.5 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700";

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

interface CotizacionOpcion { id: number; numero_cotizacion: string; estado?: string; total?: number; clientes?: { nombre?: string; empresa?: string } | null }

function Icono({ ev }: { ev: PmEvidencia }) {
  if (ev.tipo === "quote") return <Link2 size={16} className="text-sig-blue" />;
  if (esImagen(ev.mime)) return <ImageIcon size={16} className="text-sig-muted" />;
  if (ev.mime === "application/pdf") return <FileText size={16} className="text-sig-danger" />;
  return <FileIcon size={16} className="text-sig-muted" />;
}

/** Evidencias de una tarea: subir archivos o fotos, ligar una cotización, abrir y borrar. */
export default function EvidenciasPanel({
  pmId, tarea, usuarios, onChange,
}: { pmId: string; tarea: PmTarea; usuarios: Record<string, UsuarioPm>; onChange: () => Promise<void> | void }) {
  const t = useTranslations("PM");
  const inputArchivo = useRef<HTMLInputElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [selector, setSelector] = useState(false);
  const evidencias = tarea.evidencias ?? [];
  const motivos: Record<string, string> = { vacio: t("fileEmpty"), muy_grande: t("fileTooLarge"), tipo_no_permitido: t("fileTypeNotAllowed") };

  const subirUno = useCallback(async (original: File) => {
    const v = validarArchivo({ nombre: original.name, mime: original.type, tamano: original.size });
    if (!v.ok) { toast.error(`${original.name}: ${motivos[v.motivo]}`); return; }
    setSubiendo((s) => [...s, original.name]);
    try {
      const archivo = await comprimirImagen(original);
      const { data } = await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias/subida`, { nombre: archivo.name, mime: archivo.type, tamano: archivo.size });
      const { bucket, path, token, mime } = data.data;
      const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, token, archivo, { contentType: mime });
      if (error) throw error;
      await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias`, { path, nombre: archivo.name });
      toast.success(t("evidenceAdded", { name: archivo.name }));
    } catch (e) {
      toast.error(`${original.name}: ${mensajeError(e, t("uploadError"))}`);
    } finally {
      setSubiendo((s) => { const i = s.indexOf(original.name); return i < 0 ? s : [...s.slice(0, i), ...s.slice(i + 1)]; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pmId, tarea.id, t]);

  const subirVarios = async (lista: FileList | File[]) => {
    await Promise.all([...lista].map(subirUno));
    await onChange();
  };

  const abrir = async (ev: PmEvidencia) => {
    try {
      const { data } = await api.get(`/pm/${pmId}/evidencias/${ev.id}/url`);
      if (data.data.tipo === "file") window.open(data.data.url, "_blank", "noopener");
    } catch (e) {
      toast.error(mensajeError(e, t("openError")));
    }
  };

  const borrar = async (ev: PmEvidencia) => {
    if (!window.confirm(t("deleteEvidenceConfirm", { name: ev.nombre }))) return;
    try {
      await api.delete(`/pm/${pmId}/evidencias/${ev.id}`);
      await onChange();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
    }
  };

  const ligar = async (cot: CotizacionOpcion) => {
    try {
      await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias/cotizacion`, { cotizacion_id: cot.id });
      toast.success(t("evidenceAdded", { name: cot.numero_cotizacion }));
      setSelector(false);
      await onChange();
    } catch (e) {
      toast.error(mensajeError(e, t("saveError")));
    }
  };

  return (
    <div>
      <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-sig-muted">
        {t("evidence")}
        {tarea.evidencia === "required" && <span className="rounded bg-sig-warning-soft dark:bg-zinc-700 px-1.5 py-0.5 text-black dark:text-white">{t("evidenceRequired")}</span>}
      </span>

      {evidencias.length > 0 && (
        <ul className="mb-3 divide-y divide-sig-line dark:divide-zinc-700 rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900">
          {evidencias.map((ev) => (
            <li key={ev.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Icono ev={ev} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-black dark:text-white">{ev.nombre}</div>
                <div className="text-xs text-sig-muted">
                  {ev.tipo === "quote" ? t("linkedQuotation") : formatearTamano(ev.tamano)} · {nombreUsuario(usuarios, ev.subido_por)} · {formatearFecha(fechaLocalDe(ev.created_at))}
                </div>
              </div>
              {ev.tipo === "quote" && ev.cotizacion_id ? (
                <Link href={`/cotizaciones/${ev.cotizacion_id}`} className="rounded p-1.5 text-sig-blue hover:bg-sig-blue-soft dark:hover:bg-zinc-800" aria-label={t("openEvidence", { name: ev.nombre })}><ExternalLink size={16} /></Link>
              ) : (
                <button onClick={() => abrir(ev)} className="rounded p-1.5 text-sig-blue hover:bg-sig-blue-soft dark:hover:bg-zinc-800" aria-label={t("openEvidence", { name: ev.nombre })}><ExternalLink size={16} /></button>
              )}
              <button onClick={() => borrar(ev)} className="rounded p-1.5 text-sig-muted hover:bg-sig-danger-soft hover:text-sig-danger dark:hover:bg-zinc-800" aria-label={t("deleteEvidence", { name: ev.nombre })}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}

      {subiendo.map((n, i) => (
        <div key={`${n}-${i}`} className="mb-2 flex items-center gap-2 text-sm text-sig-muted"><Loader2 size={14} className="animate-spin" /> {t("uploading", { name: n })}</div>
      ))}

      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); if (e.dataTransfer.files.length) subirVarios(e.dataTransfer.files); }}
        className={`rounded border border-dashed px-3 py-3 text-center text-sm transition-colors ${arrastrando ? "border-sig-blue bg-sig-blue-soft dark:bg-zinc-800" : "border-sig-line-strong dark:border-zinc-600"}`}
      >
        <p className="mb-2 text-sig-muted">{evidencias.length === 0 ? t("noEvidence") : t("addMoreEvidence")} <span className="hidden sm:inline">{t("dragHere")}</span></p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button className={btnCompacto} onClick={() => inputArchivo.current?.click()}><Upload size={14} /> {t("uploadFiles")}</button>
          <button className={btnCompacto} onClick={() => inputFoto.current?.click()}><Camera size={14} /> {t("takePhoto")}</button>
          <button className={btnCompacto} onClick={() => setSelector(true)}><Link2 size={14} /> {t("linkQuotation")}</button>
        </div>
        <p className="mt-2 text-xs text-sig-muted">{t("evidenceLimits")}</p>
        <input ref={inputArchivo} type="file" multiple accept={ACCEPT_EVIDENCIAS} className="sr-only" tabIndex={-1} onChange={(e) => { if (e.target.files?.length) subirVarios(e.target.files); e.target.value = ""; }} />
        <input ref={inputFoto} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { if (e.target.files?.length) subirVarios(e.target.files); e.target.value = ""; }} />
      </div>

      {selector && <SelectorCotizacion onClose={() => setSelector(false)} onPick={ligar} yaLigadas={evidencias.filter((e) => e.cotizacion_id).map((e) => e.cotizacion_id as number)} />}
    </div>
  );
}

function SelectorCotizacion({ onClose, onPick, yaLigadas }: { onClose: () => void; onPick: (c: CotizacionOpcion) => void; yaLigadas: number[] }) {
  const t = useTranslations("PM");
  const [lista, setLista] = useState<CotizacionOpcion[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    api.get("/cotizaciones").then(({ data }) => setLista(data.data || [])).catch(() => { toast.error(t("loadError")); setLista([]); });
  }, [t]);
  const visibles = (lista || []).filter((c) => {
    const s = q.trim().toLowerCase();
    return !s || [c.numero_cotizacion, c.clientes?.nombre, c.clientes?.empresa].some((v) => (v || "").toLowerCase().includes(s));
  }).slice(0, 50);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-md border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t("linkQuotation")}>
        <div className="flex items-center justify-between border-b border-sig-line dark:border-zinc-700 px-5 py-4">
          <h2 className="text-lg font-bold text-black dark:text-white">{t("linkQuotation")}</h2>
          <button onClick={onClose} className="rounded p-1 text-sig-muted hover:bg-sig-sand dark:hover:bg-zinc-800" aria-label={t("close")}><X size={18} /></button>
        </div>
        <div className="border-b border-sig-line dark:border-zinc-700 px-5 py-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-muted" />
            <input autoFocus className={`${campo} pl-9`} placeholder={t("searchQuotation")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {lista === null ? <li className="flex justify-center py-10 text-sig-muted"><Loader2 className="animate-spin" size={18} /></li>
            : visibles.length === 0 ? <li className="px-5 py-10 text-center text-sm text-sig-muted">{t("noQuotations")}</li>
            : visibles.map((c) => {
              const ya = yaLigadas.includes(c.id);
              return (
                <li key={c.id} className="border-b border-sig-line dark:border-zinc-700 last:border-0">
                  <button disabled={ya} onClick={() => onPick(c)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-sig-sand/60 dark:hover:bg-zinc-800 disabled:opacity-50">
                    <span>
                      <span className="block text-sm font-bold text-black dark:text-white">{c.numero_cotizacion}</span>
                      <span className="block text-xs text-sig-muted">{c.clientes?.empresa || c.clientes?.nombre || "—"}</span>
                    </span>
                    <span className="text-xs font-semibold text-sig-muted">{ya ? t("alreadyLinked") : c.estado}</span>
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
