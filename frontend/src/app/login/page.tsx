"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner"; // Importamos toast

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  // Elimino errorMsg porque usaremos toast
  // const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Efecto para cargar el email recordado si existe
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("remember_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRemember(true);
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // setErrorMsg(null);

    if (!email || !password) {
      toast.error("Campos vacíos", { description: "Por favor ingresa tu correo y contraseña." });
      return;
    }

   
    // Usamos la variable de entorno. Si no existe (en local), usa localhost.
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      setLoading(true);

      // --- FETCH DINÁMICO ---
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

      // --- ÉXITO ---
      if (typeof window !== "undefined") {

        // 1. Guardar Token en Cookies (para Next.js Middleware)
        Cookies.set("auth_token", data.token, { expires: 7 });

        // 2. Guardar Token y Usuario en LocalStorage (para el Cliente)
        localStorage.setItem("auth_token", data.token);
        // BUG FIX: Standardizing on "user_data" key for role-based logic
        localStorage.setItem("user_data", JSON.stringify(data.usuario));
        // Remove legacy key just in case to prevent confusion
        localStorage.removeItem("user");

        // 3. Recordar email si el usuario lo pidió
        if (remember) {
          localStorage.setItem("remember_email", email);
        } else {
          localStorage.removeItem("remember_email");
        }
      }

      // 5. REDIRECCIÓN INTELIGENTE BASADA EN ROL/DEPARTAMENTO
      const depto = data.usuario.departamento || "";

      // Si el departamento suena a ingeniero o su rol es ingeniero, va directo a reportes
      if (depto.toLowerCase().includes("técnico") || depto.toLowerCase().includes("servicio") || data.usuario.rol === 'ingeniero') {
        router.push("/reportestec");
      } else {
        // Si es ventas, admin o cualquier otro, va al dashboard de cotizaciones
        router.push("/cotizaciones");
      }

      router.refresh();


    } catch (err: any) {
      console.error(err);
      toast.error("Error de conexión", { description: err.message || "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl max-w-6xl w-full flex overflow-hidden border border-transparent dark:border-zinc-800">
        {/* Columna IZQUIERDA: formulario */}
        <div className="w-full md:w-1/2 px-8 sm:px-12 lg:px-16 py-12">
          {/* Logo SIG */}
          <div className="mb-8">
            <img
              src="/SIG_logo.png"
              alt="Logo SIG"
              className="h-16 w-auto object-contain dark:brightness-100"
            />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white leading-tight">
            Bienvenido a
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              cotizaciones SIG
            </span>
          </h1>

          <p className="mt-4 text-base text-slate-600 dark:text-gray-400">
            Inicia sesión con tu cuenta SIG para continuar.
          </p>

          <div className="mt-10 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-800 dark:text-gray-200 mb-2"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600"
                placeholder="usuario@sig.biz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-800 dark:text-gray-200 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-lg border-2 border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-300 dark:hover:border-zinc-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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
                  Recordar sesión
                </span>
              </label>

              <button
                type="button"
                className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                onClick={() => toast.info("Restablecer contraseña", { description: "Contacta al administrador del sistema." })}
              >
                ¿Olvidaste tu contraseña?
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
                  <span>Iniciando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar sesión</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Registro */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-sm text-slate-600">¿No tienes cuenta?</span>
            <button
              type="button"
              className="bg-slate-100 hover:bg-slate-200 text-blue-700 font-semibold text-sm px-6 py-2.5 rounded-lg transition-all hover:shadow-md"
              onClick={() => router.push("/register")}
            >
              Registrarte ahora
            </button>
          </div>
        </div>

        {/* Columna DERECHA: ilustración */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-12 relative overflow-hidden">
          {/* Patrón de fondo decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>

          {/* Contenido ilustrativo */}
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

            {/* Características destacadas */}
            <div className="mt-10 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Rápido y seguro</p>
                  <p className="text-blue-100 text-sm">Acceso instantáneo a tus cotizaciones</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-medium">Integrado con SIG</p>
                  <p className="text-blue-100 text-sm">Conexión directa con tu cuenta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}