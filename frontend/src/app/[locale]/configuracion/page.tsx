"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { User, Lock, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function ConfiguracionPage() {
  const t = useTranslations("Configuracion");

  const [activeTab, setActiveTab] = useState("perfil");
  const [loading, setLoading] = useState(false);

  // Estados del formulario Perfil
  const [perfil, setPerfil] = useState({
    nombre: "",
    email: "",
    departamento: "",
    rol: ""
  });

  // Estados del formulario Password
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  // Cargar datos al inicio
  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const { data } = await api.get("/usuarios/me");
        setPerfil({
          nombre: data.data.nombre || "",
          email: data.data.email || "",
          departamento: data.data.departamento || "",
          rol: data.data.rol || "vendedor"
        });
      } catch {
        console.error("Error cargando perfil");
      }
    };
    cargarPerfil();
  }, []);

  // Guardar Perfil
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put("/usuarios/me", {
        nombre: perfil.nombre,
        departamento: perfil.departamento
      });

      // Actualizar localStorage para que el Sidebar cambie al instante
      const userStorage = JSON.parse(localStorage.getItem("user_data") || "{}");
      localStorage.setItem("user_data", JSON.stringify({ ...userStorage, nombre: perfil.nombre }));

      toast.success(t("successProfile"), { description: t("successProfileDesc") });
    } catch {
      toast.error(t("errorProfile"));
    } finally {
      setLoading(false);
    }
  };

  // Cambiar Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      return toast.warning(t("warnPasswordLength"));
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error(t("errorPasswordMatch"));
    }

    setLoading(true);
    try {
      await api.put("/usuarios/me/password", { password: passwords.newPassword });
      toast.success(t("successPassword"));
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch {
      toast.error(t("errorPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-8">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t("title")}</h1>
        <p className="text-slate-500 dark:text-gray-400 mb-8">{t("subtitle")}</p>

        <div className="flex flex-col md:flex-row gap-8">

          {/* SIDEBAR DE PESTAÑAS */}
          <div className="w-full md:w-64 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("perfil")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left ${activeTab === "perfil" ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900" : "text-slate-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                }`}
            >
              <User size={20} /> {t("tabProfile")}
            </button>
            <button
              onClick={() => setActiveTab("seguridad")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-left ${activeTab === "seguridad" ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900" : "text-slate-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                }`}
            >
              <Lock size={20} /> {t("tabSecurity")}
            </button>
          </div>

          {/* CONTENIDO */}
          <div className="flex-1">

            {/* PANEL PERFIL */}
            {activeTab === "perfil" && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-2xl font-bold">
                    {perfil.nombre.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{perfil.nombre}</h2>
                    <p className="text-slate-500 dark:text-gray-400">{perfil.email}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">{t("fullName")}</label>
                      <input
                        type="text"
                        value={perfil.nombre}
                        onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                        className="w-full p-3 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">{t("department")}</label>
                      <input
                        type="text"
                        value={perfil.departamento}
                        onChange={(e) => setPerfil({ ...perfil, departamento: e.target.value })}
                        className="w-full p-3 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 dark:text-gray-500 mb-1">{t("email")}</label>
                      <input
                        type="text"
                        value={perfil.email}
                        disabled
                        className="w-full p-3 border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">{t("emailHelp")}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 dark:text-gray-500 mb-1">{t("userRole")}</label>
                      <div className="flex items-center gap-2 p-3 border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-slate-500 dark:text-gray-400">
                        <ShieldCheck size={16} />
                        <span className="capitalize">{perfil.rol}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      disabled={loading}
                      className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? t("saving") : <><Save size={18} /> {t("saveChanges")}</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* PANEL SEGURIDAD */}
            {activeTab === "seguridad" && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t("changePassword")}</h2>
                <p className="text-slate-500 dark:text-gray-400 mb-6">{t("passwordHelp")}</p>

                <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">{t("newPassword")}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full p-3 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-1">{t("confirmPassword")}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full p-3 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      disabled={loading}
                      className="bg-slate-800 dark:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-zinc-600 shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? t("updating") : <><Lock size={18} /> {t("updatePassword")}</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}