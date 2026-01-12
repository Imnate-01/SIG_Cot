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

export default function AyudaPage() {
  // Estado para controlar qué pregunta del FAQ está abierta
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      pregunta: "¿Cómo se generan los números de folio (SIG)?",
      respuesta: "Hemos simplificado el proceso. Ahora todas las cotizaciones, sin importar si son por Tiempo y Materiales (ST) o Servicios Mensuales (SM), se generan automáticamente con el prefijo único 'SIG' seguido de un número consecutivo (ej. SIG-1024) para facilitar el seguimiento."
    },
    {
      pregunta: "¿Puedo editar una cotización ya enviada?",
      respuesta: "Si la cotización está en estado 'Borrador', puedes editarla libremente. Si ya fue marcada como 'Aceptada' o 'Rechazada', el sistema bloquea la edición para proteger el historial. En ese caso, te recomendamos crear una nueva."
    },
    {
      pregunta: "¿Qué hago si no encuentro un cliente en el buscador?",
      respuesta: "Puedes agregarlo directamente desde la pantalla de 'Nueva Cotización'. En el desplegable de clientes, selecciona la opción '➕ Agregar nuevo cliente' al final de la lista e ingresa sus datos fiscales."
    },
    {
      pregunta: "¿Cómo registro una Orden de Compra (PO)?",
      respuesta: "Ingresa al detalle de la cotización (icono de ojo). Si cambias el estado a 'Aceptada' (Ganada), se desplegará un panel verde donde podrás capturar el número de PO y actualizar su estatus administrativo."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 justify-center md:justify-start">
            <HelpCircle className="text-blue-600" size={32} />
            Centro de Ayuda
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Resuelve tus dudas y encuentra soporte para el Sistema de Cotizaciones SIG.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Columna Izquierda: FAQ */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Preguntas Frecuentes</h2>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                    openIndex === index ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex justify-between items-center p-5 text-left focus:outline-none"
                  >
                    <span className="font-semibold text-gray-700 flex items-center gap-2">
                      <Info size={18} className="text-blue-400 shrink-0" />
                      {faq.pregunta}
                    </span>
                    {openIndex === index ? (
                      <ChevronUp className="text-blue-500" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </button>
                  
                  {openIndex === index && (
                    <div className="px-5 pb-5 pl-11 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3 bg-gray-50/30 animate-in fade-in slide-in-from-top-1">
                      {faq.respuesta}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sección de Recursos / Documentación */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Documentación</h2>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Manual de Operación v2.1</h3>
                  <p className="text-sm text-gray-500">Guía sobre el nuevo flujo de cotizaciones SIG y facturación.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Contacto */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">¿Necesitas soporte?</h3>
                <p className="text-blue-100 text-sm mb-6">
                  Nuestro equipo técnico está disponible de Lunes a Viernes, de 9:00 a 18:00 hrs.
                </p>
                
                <div className="space-y-4">
                  <a href="mailto:soporte@sig.biz" className="flex items-center gap-3 bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors">
                    <Mail size={20} />
                    <span className="font-medium">soporte@sig.biz</span>
                  </a>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                    <Phone size={20} />
                    <span className="font-medium">Ext. 5678 (Interna)</span>
                  </div>
                </div>
              </div>
              
              {/* Decoración de fondo */}
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-blue-500 rounded-full blur-2xl opacity-50"></div>
              <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-blue-400 rounded-full blur-xl opacity-30"></div>
            </div>

            {/* Tarjeta Secundaria */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={24} />
              </div>
              <h3 className="font-bold text-gray-800">Reportar un Bug</h3>
              <p className="text-gray-500 text-xs mt-2 mb-4">
                Si encuentras un error en el sistema, por favor notifícalo al equipo de desarrollo.
              </p>
              <button 
                className="w-full py-2 px-4 border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors text-sm"
                onClick={() => alert("Función de reporte directo en desarrollo. Por favor envía un correo.")}
              >
                Enviar Reporte
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}