/**
 * Enlace de "¿Olvidaste tu contraseña?".
 *
 * Supabase manda al usuario a `redirectTo` (/restablecer) SOLO si esa URL está en
 * Authentication → URL Configuration → Redirect URLs. Si no, lo manda al Site URL
 * (la raíz), que redirige al login, y el usuario veía el login en vez de poder
 * escribir su nueva contraseña. El fragmento (#access_token=…&type=recovery)
 * sobrevive a esas redirecciones, así que el login lo detecta y reenvía.
 */
export function esEnlaceRecuperacion(hash: string): boolean {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  if (p.get("type") === "recovery" && p.get("access_token")) return true;
  // Enlace vencido o ya usado: /restablecer muestra el aviso y deja pedir otro
  const codigo = p.get("error_code") || "";
  return codigo === "otp_expired" || (p.get("error") === "access_denied" && /expired|invalid/i.test(p.get("error_description") || ""));
}
