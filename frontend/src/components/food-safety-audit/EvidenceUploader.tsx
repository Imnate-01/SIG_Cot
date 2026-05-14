"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Camera, GripVertical, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";
import { foodSafetyAuditApi } from "@/services/foodSafetyAudit";

// ── Tipos ────────────────────────────────────────────────────────────
export interface EvidenceImageItem {
  id: number;
  url_thumbnail: string;
  url_report: string;
  url_original: string;
  caption: string;
  orden: number;
  nombre_archivo: string;
  width_px: number;
  height_px: number;
  size_bytes: number;
}

interface EvidenceUploaderProps {
  auditId: number;
  copFindingId?: number;
  paramId?: number;
  images: EvidenceImageItem[];
  onUploaded: (img: EvidenceImageItem) => void;
  onDeleted: (id: number) => void;
  onCaptionChange: (id: number, caption: string) => void;
  maxImages?: number;
  disabled?: boolean;
}

// ── Validación local ─────────────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

async function validateImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato no soportado. Use JPEG, PNG o WEBP.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "La imagen excede el límite de 20 MB.";
  }
  try {
    const dims = await getImageDimensions(file);
    if (dims.width < MIN_WIDTH || dims.height < MIN_HEIGHT) {
      return `Resolución insuficiente (${dims.width}×${dims.height}px). Mínimo ${MIN_WIDTH}×${MIN_HEIGHT}px para buena calidad en el PDF.`;
    }
  } catch {
    return "No se pudo leer la resolución de la imagen.";
  }
  return null;
}

// ── Estado de carga por archivo ───────────────────────────────────────
type UploadState = "idle" | "validating" | "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  state: UploadState;
  progress: number;
  error?: string;
}

// ── Componente principal ─────────────────────────────────────────────
export function EvidenceUploader({
  auditId,
  copFindingId,
  paramId,
  images,
  onUploaded,
  onDeleted,
  onCaptionChange,
  maxImages = 5,
  disabled = false,
}: EvidenceUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [editingCaption, setEditingCaption] = useState<Record<number, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = images.length + queue.filter(q => q.state !== "error").length < maxImages && !disabled;

  // ── Procesar archivos seleccionados ──────────────────────────────────
  const handleFiles = useCallback(async (files: FileList) => {
    const fileArr = Array.from(files).slice(0, maxImages - images.length);

    for (const file of fileArr) {
      const previewUrl = URL.createObjectURL(file);
      const itemId = `${file.name}-${Date.now()}`;

      // Agregar a la cola en estado "validating"
      setQueue(prev => [...prev, { id: itemId, file, preview: previewUrl, state: "validating", progress: 0 }]);

      // Validar
      const error = await validateImage(file);
      if (error) {
        setQueue(prev => prev.map(q => q.id === itemId ? { ...q, state: "error", error } : q));
        continue;
      }

      // Subir
      setQueue(prev => prev.map(q => q.id === itemId ? { ...q, state: "uploading", progress: 10 } : q));
      try {
        const fd = new FormData();
        fd.append("image", file);
        if (copFindingId) fd.append("cop_finding_id", String(copFindingId));
        if (paramId)      fd.append("param_id", String(paramId));
        fd.append("orden", String(images.length));

        // Simular progreso
        const timer = setInterval(() => {
          setQueue(prev => prev.map(q => q.id === itemId && q.progress < 85
            ? { ...q, progress: q.progress + 10 }
            : q
          ));
        }, 200);

        const res = await foodSafetyAuditApi.images.upload(auditId, fd);

        clearInterval(timer);
        setQueue(prev => prev.map(q => q.id === itemId ? { ...q, state: "done", progress: 100 } : q));

        if (res.data?.success) {
          onUploaded(res.data.data as EvidenceImageItem);
          // Limpiar del queue después de un momento
          setTimeout(() => {
            setQueue(prev => prev.filter(q => q.id !== itemId));
            URL.revokeObjectURL(previewUrl);
          }, 1200);
        }
      } catch (err: any) {
        setQueue(prev => prev.map(q => q.id === itemId
          ? { ...q, state: "error", error: err.response?.data?.error || err.message }
          : q
        ));
      }
    }
  }, [auditId, copFindingId, paramId, images.length, onUploaded, maxImages]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (imgId: number) => {
    try {
      await foodSafetyAuditApi.images.delete(auditId, imgId);
      onDeleted(imgId);
    } catch (err: any) {
      console.error("Error eliminando imagen:", err);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleCaptionSave = async (imgId: number, caption: string) => {
    try {
      await foodSafetyAuditApi.images.updateCaption(auditId, imgId, caption);
      onCaptionChange(imgId, caption);
      setEditingCaption(prev => { const n = { ...prev }; delete n[imgId]; return n; });
    } catch (err) {
      console.error("Error actualizando caption:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Zona de drop ── */}
      {canUpload && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#2563eb" : "#d1d5db"}`,
            borderRadius: 12,
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "#eff6ff" : "#fafafa",
            transition: "all 0.2s",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <Camera size={28} color={dragOver ? "#2563eb" : "#94a3b8"} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: dragOver ? "#1d4ed8" : "#475569" }}>
            Arrastra fotos aquí o <span style={{ color: "#2563eb", textDecoration: "underline" }}>haz clic para seleccionar</span>
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
            JPEG / PNG / WEBP · Mín. 800×600 px · Máx. 20 MB · Hasta {maxImages} fotos
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
            {images.length} de {maxImages} imágenes subidas
          </p>
        </div>
      )}

      {/* ── Cola de subida en progreso ── */}
      {queue.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {queue.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: item.state === "error" ? "#fef2f2" : "#f8fafc",
              border: `1px solid ${item.state === "error" ? "#fca5a5" : "#e2e8f0"}`,
              borderRadius: 8, padding: "10px 14px",
            }}>
              {/* Preview */}
              <img src={item.preview} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.file.name}
                </div>
                {item.state === "uploading" && (
                  <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${item.progress}%`, background: "#2563eb", transition: "width 0.2s", borderRadius: 2 }} />
                  </div>
                )}
                {item.state === "error" && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={11} /> {item.error}
                  </div>
                )}
                {item.state === "validating" && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>Validando imagen...</div>
                )}
              </div>
              {/* Estado */}
              {item.state === "uploading" && <Loader2 size={16} color="#94a3b8" className="animate-spin" />}
              {item.state === "done"      && <CheckCircle2 size={16} color="#2563eb" />}
              {item.state === "error"     && (
                <button onClick={() => setQueue(prev => prev.filter(q => q.id !== item.id))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Galería de imágenes subidas ── */}
      {images.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}>
          {images
            .sort((a, b) => a.orden - b.orden)
            .map((img) => {
              const isEditing = editingCaption[img.id] !== undefined;
              const isConfirmingDelete = confirmDelete === img.id;

              return (
                <div key={img.id} style={{
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.2s",
                }}>
                  {/* Thumbnail */}
                  <div style={{ position: "relative", paddingTop: "75%", background: "#f8fafc" }}>
                    <img
                      src={img.url_thumbnail}
                      alt={img.caption || img.nombre_archivo}
                      style={{
                        position: "absolute", inset: 0, width: "100%", height: "100%",
                        objectFit: "cover",
                      }}
                      loading="lazy"
                    />
                    {/* Botón eliminar */}
                    {!disabled && (
                      <button
                        onClick={() => setConfirmDelete(img.id)}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "rgba(0,0,0,0.5)", border: "none",
                          borderRadius: "50%", width: 24, height: 24,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "#fff",
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                    {/* Confirm delete overlay */}
                    {isConfirmingDelete && (
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(220,38,38,0.85)",
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", gap: 8, padding: 12,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textAlign: "center" }}>
                          ¿Eliminar imagen?
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleDelete(img.id)}
                            style={{ padding: "4px 10px", background: "#fff", color: "#dc2626", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Sí, borrar
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            style={{ padding: "4px 10px", background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div style={{ padding: "8px 10px" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          autoFocus
                          type="text"
                          value={editingCaption[img.id]}
                          onChange={e => setEditingCaption(prev => ({ ...prev, [img.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleCaptionSave(img.id, editingCaption[img.id]);
                            if (e.key === "Escape") setEditingCaption(prev => { const n = { ...prev }; delete n[img.id]; return n; });
                          }}
                          style={{ fontSize: 11, padding: "4px 6px", border: "1.5px solid #2563eb", borderRadius: 5, outline: "none" }}
                          placeholder="Descripción de la foto..."
                        />
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => handleCaptionSave(img.id, editingCaption[img.id])}
                            style={{ flex: 1, padding: "3px 0", background: "#dbeafe", color: "#1d4ed8", border: "none", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                            ✓ Guardar
                          </button>
                          <button onClick={() => setEditingCaption(prev => { const n = { ...prev }; delete n[img.id]; return n; })}
                            style={{ padding: "3px 6px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 4, fontSize: 10, cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => !disabled && setEditingCaption(prev => ({ ...prev, [img.id]: img.caption || "" }))}
                        style={{
                          width: "100%", textAlign: "left", background: "none", border: "none",
                          cursor: disabled ? "default" : "pointer", padding: 0,
                          fontSize: 11, color: img.caption ? "#475569" : "#94a3b8",
                          lineHeight: 1.4,
                        }}
                        title={disabled ? "" : "Clic para editar descripción"}
                      >
                        {img.caption || "Sin descripción — clic para agregar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Estado vacío */}
      {images.length === 0 && queue.length === 0 && !canUpload && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
          <ImageIcon size={24} style={{ marginBottom: 6 }} />
          <p style={{ margin: 0 }}>No hay imágenes de evidencia</p>
        </div>
      )}
    </div>
  );
}
