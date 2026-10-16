"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Detecta si el usuario pertenece al grupo de Ingeniería Aséptica / Calidad Aséptica.
 * Mismas palabras clave que el Sidebar para mantener consistencia.
 */
const ASEPTICO_KEYWORDS = [
  'aseptic', 'aséptic',
  'calidad',
  'ingeniero', 'engineer',
  'intern',
];

function esRolAseptico(rol?: string, departamento?: string): boolean {
  const rolLower  = (rol          || '').toLowerCase();
  const deptLower = (departamento || '').toLowerCase();
  return ASEPTICO_KEYWORDS.some(
    (kw) => rolLower.includes(kw) || deptLower.includes(kw)
  );
}

/** Devuelve la ruta de inicio según el rol del usuario */
function rutaInicio(usuario: { rol?: string; departamento?: string }): string {
  return esRolAseptico(usuario.rol, usuario.departamento)
    ? '/food-safety-audit'
    : '/cotizaciones';
}

// ─── Componente interno que usa useSearchParams ───────────────────────────────
// Debe estar separado para que <Suspense> lo pueda envolver correctamente.
// Next.js App Router requiere esto para poder pre-renderizar la página en build.
function LoginInner() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("Login");

  // Efecto para cargar el email recordado + warm-up del backend
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Mostrar aviso si la sesión expiró y el usuario fue redirigido automáticamente
    if (searchParams?.get('expired') === '1') {
      toast.warning('Sesión expirada', {
        description: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
        duration: 6000,
      });
    }

    // Solo la cookie es fuente de verdad (el middleware del servidor la valida)
    const token = Cookies.get("auth_token");
    if (token) {
      const userJson = localStorage.getItem("user_data");
      if (userJson) {
        try {
          const parsedUser = JSON.parse(userJson);
          router.push(rutaInicio(parsedUser));
        } catch {
          router.push("/cotizaciones");
        }
      } else {
        router.push("/cotizaciones");
      }
      return;
    }

    const savedEmail = localStorage.getItem("remember_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("emptyFields"), { description: t("emptyFieldsDesc") });
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      if (typeof window !== "undefined") {
        Cookies.set("auth_token", data.token, { expires: remember ? 30 : 1 });
        localStorage.setItem("auth_token",    data.token);
        localStorage.setItem("refresh_token", data.refresh_token); // ← para auto-renovación
        localStorage.setItem("user_data", JSON.stringify(data.usuario));
        localStorage.removeItem("user");

        if (remember) {
          localStorage.setItem("remember_email", email);
        } else {
          localStorage.removeItem("remember_email");
        }
      }

      router.push(rutaInicio(data.usuario));
      router.refresh();

    } catch (err) {
      console.error(err);
      const mensaje = err instanceof Error ? err.message : "";
      toast.error(t("connectionError"), { description: mensaje || "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo solo en móvil (en escritorio está en el panel lateral) */}
      <Image src="/sig-logo.webp" alt="SIG" width={62} height={40} priority unoptimized className="mb-8 h-10 w-auto md:hidden" />

      <h1 className="text-[28px] font-bold leading-tight text-sig-ink">{t("title")}</h1>
      <p className="mt-2 text-sm text-sig-muted">{t("subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-sig-ink">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className="h-10 w-full rounded border border-sig-line-strong bg-white px-3 text-sm text-sig-ink placeholder:text-sig-muted/70 outline-none transition-shadow focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-sig-ink">
            {t("passwordLabel")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="h-10 w-full rounded border border-sig-line-strong bg-white px-3 pr-10 text-sm text-sig-ink placeholder:text-sig-muted/70 outline-none transition-shadow focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sig-muted hover:text-sig-ink"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-sig-ink">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-sig-blue"
            />
            {t("rememberMe")}
          </label>
          <button
            type="button"
            className="text-[13px] font-semibold text-sig-blue hover:text-sig-ink hover:underline"
            onClick={() => toast.info(t("resetPassword"), { description: t("forgotPasswordMsg") })}
          >
            {t("forgotPassword")}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-full items-center justify-center gap-2 rounded bg-sig-blue text-sm font-semibold text-white transition-colors hover:bg-sig-blue-hover focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--sig-blue-focus)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </button>
      </form>

      <div className="mt-8 flex items-center justify-between border-t border-sig-line pt-6 text-sm">
        <span className="text-sig-muted">{t("noAccount")}</span>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded border border-sig-line-strong bg-white px-3.5 font-semibold text-sig-ink hover:bg-sig-sand"
          onClick={() => router.push("/register")}
        >
          {t("register")}
        </button>
      </div>
    </div>
  );
}

// ─── Panel lateral con la identidad SIG (solo escritorio) ────────────────────
function LoginSidePanel() {
  const t = useTranslations("Login");
  const modulos = [t("moduleQuotes"), t("moduleReports"), t("moduleFsa")];
  return (
    <aside className="hidden w-[400px] flex-none flex-col border-r border-sig-line bg-sig-sand p-10 md:flex">
      <div>
        <Image src="/sig-logo.webp" alt="SIG" width={74} height={48} priority unoptimized className="h-12 w-auto" />
        <div className="mt-6">
          <p className="text-xl font-bold text-sig-ink">{t("appName")}</p>
          <p className="text-sm text-sig-muted">{t("appTagline")}</p>
        </div>
      </div>

      <ul className="mt-12 border-t border-sig-line">
        {modulos.map((m) => (
          <li key={m} className="flex items-center gap-3 border-b border-sig-line py-3 text-sm text-sig-ink">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-sig-blue" aria-hidden />
            {m}
          </li>
        ))}
      </ul>

      <p className="mt-auto text-xs text-sig-muted">{t("internalUse")}</p>
    </aside>
  );
}

// ─── Export default: envuelve LoginInner en <Suspense> ───────────────────────
// Next.js App Router requiere Suspense alrededor de cualquier componente
// que use useSearchParams() para poder pre-renderizar la página en el build.
export default function LoginPage() {
  return (
    // La identidad SIG es de fondo claro: el login no cambia con el modo oscuro
    <div className="flex min-h-screen bg-white font-sig text-sig-ink">
      <LoginSidePanel />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <Suspense
          fallback={<Loader2 size={24} className="animate-spin text-sig-blue" aria-label="Cargando" />}
        >
          <LoginInner />
        </Suspense>
      </main>
    </div>
  );
}
