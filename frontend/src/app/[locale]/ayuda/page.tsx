"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  Mail,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AyudaPage() {
  const t = useTranslations("Ayuda");
  // Estado para controlar qué pregunta del FAQ está abierta
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      pregunta: t("faq1q"),
      respuesta: t("faq1a")
    },
    {
      pregunta: t("faq2q"),
      respuesta: t("faq2a")
    },
    {
      pregunta: t("faq3q"),
      respuesta: t("faq3a")
    },
    {
      pregunta: t("faq4q"),
      respuesta: t("faq4a")
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 justify-center md:justify-start">
            <HelpCircle className="text-blue-600 dark:text-blue-500" size={32} />
            {t("title")}
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2 text-lg">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Columna Izquierda: FAQ */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t("faqsTitle")}</h2>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all duration-200 overflow-hidden ${openIndex === index ? "border-blue-500 dark:border-blue-500 shadow-md" : "border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex justify-between items-center p-5 text-left focus:outline-none"
                  >
                    <span className="font-semibold text-slate-700 dark:text-gray-200 flex items-center gap-2">
                      <Info size={18} className="text-blue-400 dark:text-blue-500 shrink-0" />
                      {faq.pregunta}
                    </span>
                    {openIndex === index ? (
                      <ChevronUp className="text-blue-500" size={20} />
                    ) : (
                      <ChevronDown className="text-slate-400 dark:text-gray-500" size={20} />
                    )}
                  </button>

                  {openIndex === index && (
                    <div className="px-5 pb-5 pl-11 text-slate-600 dark:text-gray-300 text-sm leading-relaxed border-t border-slate-100 dark:border-zinc-800 pt-3 bg-slate-50/30 dark:bg-zinc-800/30 animate-in fade-in slide-in-from-top-1">
                      {faq.respuesta}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sección de Recursos / Documentación */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t("docsTitle")}</h2>
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-blue-600 dark:text-blue-400 group-transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">{t("docsItemTitle")}</h3>
                  <p className="text-sm text-slate-500 dark:text-gray-400">{t("docsItemDesc")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Contacto */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-600 dark:bg-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">{t("supportTitle")}</h3>
                <p className="text-blue-100 dark:text-blue-200 text-sm mb-6">
                  {t("supportDesc")}
                </p>

                <div className="space-y-4">
                  <a href="mailto:soporte@sig.biz" className="flex items-center gap-3 bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors">
                    <Mail size={20} />
                    <span className="font-medium">soporte@sig.biz</span>
                  </a>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                    <Phone size={20} />
                    <span className="font-medium">{t("internalExtension")}</span>
                  </div>
                </div>
              </div>

              {/* Decoración de fondo */}
            </div>

            {/* Tarjeta Secundaria */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={24} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white">{t("reportBugTitle")}</h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs mt-2 mb-4">
                {t("reportBugDesc")}
              </p>
              <button
                className="w-full py-2 px-4 border border-green-600 dark:border-green-500 text-green-700 dark:text-green-400 font-semibold rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-sm"
                onClick={() => toast.info(t("devToastTitle"), { description: t("devToastDesc") })}
              >
                {t("reportBugBtn")}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}