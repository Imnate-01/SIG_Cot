const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa texto para insertarlo de forma segura en HTML (contenido o atributos).
 * Cualquier dato que venga del usuario o de la base de datos debe pasar por aquí
 * antes de interpolarse en las plantillas que renderiza Chromium.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Devuelve una URL apta para el atributo `src` de una imagen.
 * Solo acepta http(s) y data:image; cualquier otro esquema (file:, javascript:, etc.)
 * se descarta y devuelve cadena vacía.
 */
export function safeImageSrc(url: unknown): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return '';
}
