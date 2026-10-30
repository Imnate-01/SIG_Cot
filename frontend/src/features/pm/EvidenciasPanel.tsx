"use client";

import React, { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ExternalLink, File as FileIcon, FileText, Globe, Image as ImageIcon, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import api from "@/services/api";
import { ACCEPT_EVIDENCIAS, esImagen, formatearTamano, validarArchivo, validarEnlace } from "./evidencias";
import { comprimirImagen } from "./comprimirImagen";
import { subirAUrlFirmada } from "./subirEvidencia";
import { formatearFecha, nombreUsuario, type PmEvidencia, type PmTarea, type UsuarioPm } from "./pm";
import { btnPrimario, campo } from "./ui";

const btnCompacto = "inline-flex h-8 items-center justify-center gap-1.5 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700";

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Dominio del enlace para la segunda línea ("sig.sharepoint.com"). */
function dominio(url: string | null | undefined): string {
  try { return url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch { return ""; }
}

function Icono({ ev }: { ev: PmEvidencia }) {
  if (ev.tipo === "link") return <Globe size={16} className="text-sig-blue" />;
  if (ev.tipo === "quote") return <Link2 size={16} className="text-sig-blue" />;
  if (esImagen(ev.mime)) return <ImageIcon size={16} className="text-sig-muted" />;
  if (ev.mime === "application/pdf") return <FileText size={16} className="text-sig-danger" />;
  return <FileIcon size={16} className="text-sig-muted" />;
}

/** Evidencias de una tarea: subir archivos o fotos, agregar un enlace externo, abrir y borrar. */
export default function EvidenciasPanel({
  pmId, tarea, usuarios, onChange,
}: { pmId: string; tarea: PmTarea; usuarios: Record<string, UsuarioPm>; onChange: () => Promise<void> | void }) {
  const t = useTranslations("PM");
  const inputArchivo = useRef<HTMLInputElement>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [formEnlace, setFormEnlace] = useState(false);
  const evidencias = tarea.evidencias ?? [];
  const motivos: Record<string, string> = { vacio: t("fileEmpty"), muy_grande: t("fileTooLarge"), tipo_no_permitido: t("fileTypeNotAllowed") };

  const subirUno = useCallback(async (original: File) => {
    const v = validarArchivo({ nombre: original.name, mime: original.type, tamano: original.size });
    if (!v.ok) { toast.error(`${original.name}: ${motivos[v.motivo]}`); return; }
    setSubiendo((s) => [...s, original.name]);
    try {
      const archivo = await comprimirImagen(original);
      const { data } = await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias/subida`, { nombre: archivo.name, mime: archivo.type, tamano: archivo.size });
      const { path } = data.data;
      await subirAUrlFirmada(data.data, archivo);
      await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias`, { path, nombre: archivo.name });
      toast.success(t("evidenceAdded", { name: archivo.name }));
    } catch (e) {
      const propio = e instanceof Error && e.name === "ErrorSubida" ? e.message : null;
      console.error("[evidencias] subida fallida", original.name, e);
      toast.error(`${original.name}: ${propio || mensajeError(e, t("uploadError"))}`);
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

  const agregarEnlace = async (url: string, nombre: string) => {
    await api.post(`/pm/${pmId}/tareas/${tarea.id}/evidencias/enlace`, { url, nombre });
    toast.success(t("evidenceAdded", { name: nombre }));
    setFormEnlace(false);
    await onChange();
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
                  {ev.tipo === "link" ? dominio(ev.url) || t("externalLink") : ev.tipo === "quote" ? t("linkedQuotation") : formatearTamano(ev.tamano)} · {nombreUsuario(usuarios, ev.subido_por)} · {formatearFecha(ev.created_at.slice(0, 10))}
                </div>
              </div>
              {ev.tipo === "link" && ev.url ? (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" title={ev.url} className="rounded p-1.5 text-sig-blue hover:bg-sig-blue-soft dark:hover:bg-zinc-800" aria-label={t("openEvidence", { name: ev.nombre })}><ExternalLink size={16} /></a>
              ) : ev.tipo === "quote" && ev.cotizacion_id ? (
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
          <button className={btnCompacto} onClick={() => setFormEnlace(true)} aria-expanded={formEnlace}><Link2 size={14} /> {t("addLink")}</button>
        </div>
        <p className="mt-2 text-xs text-sig-muted">{t("evidenceLimits")}</p>
        <input ref={inputArchivo} type="file" multiple accept={ACCEPT_EVIDENCIAS} className="sr-only" tabIndex={-1} onChange={(e) => { if (e.target.files?.length) subirVarios(e.target.files); e.target.value = ""; }} />
        <input ref={inputFoto} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => { if (e.target.files?.length) subirVarios(e.target.files); e.target.value = ""; }} />
      </div>

      {formEnlace && <FormEnlace onCancel={() => setFormEnlace(false)} onSave={agregarEnlace} />}
    </div>
  );
}

/** Pegar un enlace (SharePoint, OneDrive, Drive, Teams, portal del cliente…) con un nombre opcional. */
function FormEnlace({ onCancel, onSave }: { onCancel: () => void; onSave: (url: string, nombre: string) => Promise<void> }) {
  const t = useTranslations("PM");
  const [url, setUrl] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const motivos: Record<string, string> = { vacio: t("linkEmpty"), invalido: t("linkInvalid"), protocolo: t("linkProtocol"), muy_largo: t("linkTooLong") };

  const guardar = async () => {
    const v = validarEnlace(url, nombre);
    if (!v.ok) { setError(motivos[v.motivo]); return; }
    setGuardando(true);
    setError(null);
    try {
      await onSave(v.url, v.nombre);
    } catch (e) {
      setError(mensajeError(e, t("saveError")));
      setGuardando(false);
    }
  };

  return (
    <div className="mt-2 rounded border border-sig-line dark:border-zinc-700 bg-sig-sand/50 dark:bg-zinc-800/60 p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-sig-muted">{t("linkUrl")}</span>
        <input
          autoFocus type="url" inputMode="url" className={campo} placeholder="https://" value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardar(); } else if (e.key === "Escape") onCancel(); }}
          aria-invalid={!!error}
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-xs font-semibold text-sig-muted">{t("linkName")}</span>
        <input
          className={campo} placeholder={t("linkNamePlaceholder")} value={nombre} maxLength={200}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardar(); } else if (e.key === "Escape") onCancel(); }}
        />
      </label>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-sig-danger">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className={btnCompacto} onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className={`${btnPrimario} h-8 px-3 text-xs`} onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} {t("addLink")}
        </button>
      </div>
    </div>
  );
}
