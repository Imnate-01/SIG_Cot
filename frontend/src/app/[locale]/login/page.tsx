"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("Login");

  // Efecto para cargar el email recordado + warm-up del backend
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Solo la cookie es fuente de verdad (el middleware del servidor la valida)
    const token = Cookies.get("auth_token");
    if (token) {
      const userJson = localStorage.getItem("user_data");
      if (userJson) {
        try {
          const parsedUser = JSON.parse(userJson);
          const depto = parsedUser.departamento || "";
          if (depto.toLowerCase().includes("técnico") || depto.toLowerCase().includes("servicio") || parsedUser.rol === 'ingeniero') {
            router.push("/reportestec");
          } else {
            router.push("/cotizaciones");
          }
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${API_URL}/api/health`, { method: "GET" }).catch(() => { });
  }, []);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      if (typeof window !== "undefined") {
        Cookies.set("auth_token", data.token, { expires: remember ? 30 : 1 });
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.usuario));
        localStorage.removeItem("user");

        if (remember) {
          localStorage.setItem("remember_email", email);
        } else {
          localStorage.removeItem("remember_email");
        }
      }

      const depto = data.usuario.departamento || "";

      if (depto.toLowerCase().includes("técnico") || depto.toLowerCase().includes("servicio") || data.usuario.rol === 'ingeniero') {
        router.push("/reportestec");
      } else {
        router.push("/cotizaciones");
      }

      router.refresh();

    } catch (err: any) {
      console.error(err);
      toast.error(t("connectionError"), { description: err.message || "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl max-w-6xl w-full flex overflow-hidden border border-transparent dark:border-zinc-800">
        {/* Columna IZQUIERDA: formulario */}
        <div className="w-full md:w-1/2 px-8 sm:px-12 lg:px-16 py-12">
          <div className="mb-8">
            <img
              src="/SIG_logo.png"
              alt="Logo SIG"
              className="h-16 w-auto object-contain dark:brightness-100"
            />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight">
            {t("welcome")}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              {t("brandName")}
            </span>
          </h1>

          <p className="mt-4 text-base text-slate-600 dark:text-gray-400">
            {t("subtitle")}
          </p>

          <div className="mt-10 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-800 dark:text-gray-200 mb-2"
              >
                {t("emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-800 dark:text-gray-200 mb-2"
              >
                {t("passwordLabel")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-lg border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 pr-12 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Recordar sesión + Olvidaste tu contraseña */}
            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 border-slate-300 dark:border-zinc-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white dark:bg-zinc-700"
                />
                <span className="text-sm text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white">
                  {t("rememberMe")}
                </span>
              </label>

              <button
                type="button"
                className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                onClick={() => toast.info(t("resetPassword"), { description: t("forgotPasswordMsg") })}
              >
                {t("forgotPassword")}
              </button>
            </div>

            {/* Botón Iniciar sesión */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-semibold text-base py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t("submitting")}</span>
                </>
              ) : (
                <>
                  <span>{t("submit")}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Registro */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-slate-600">{t("noAccount")}</span>
            <button
              type="button"
              className="bg-slate-100 hover:bg-slate-200 text-blue-700 font-semibold text-sm px-6 py-2.5 rounded-lg transition-all hover:shadow-md"
              onClick={() => router.push("/register")}
            >
              {t("register")}
            </button>
          </div>
        </div>

        {/* Columna DERECHA: ilustración */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10 text-center max-w-md">
            <div className="mb-8 flex justify-center">
              <div className="w-48 h-48 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              Sistema de Cotizaciones
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Gestiona tus cotizaciones de manera eficiente y profesional con nuestra plataforma integrada
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}