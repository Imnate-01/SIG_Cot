"use client";
import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { 
  Save, X, Plus, Trash2, Eye, Building2, User, FileText, Settings, DollarSign, Calendar, Truck, UserCircle
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CotizacionUsFormData, TravelLeg, LaborDay, UsRates } from "../components/StandardRatesPDF";

const PDFDownloadLinkDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p>Loading PDF...</p> }
);
import StandardRatesPDF from "../components/StandardRatesPDF";

export default function NuevaCotizacionUsPage() {
  const router = useRouter();

  // Estados
  const [loading, setLoading] = useState(false);
  const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);

  // Initial Rates (2026 standard)
  const initialRates: UsRates = {
    regular: 208,
    overtime: 312,
    premium: 416,
    travel_reg: 181,
    travel_sat: 272,
    travel_sun: 362,
  };

  const [formData, setFormData] = useState<CotizacionUsFormData>({
    customer: "",
    city_state: "",
    scope_of_visit: "",
    equipment_to_service: "",
    payment_terms: "Net 30 Days",
    quoted_by: "",
    quote_date: new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric' }),
    quote_number: "",
    travel_legs: [],
    labor_schedule: [],
    preparation_amount: 0,
    expenses_amount: 0,
    calibration_amount: 0,
    sales_accommodation_amount: 0,
    travel_subtotal: 0,
    labor_subtotal: 0,
    grand_total: 0,
    rates: initialRates
  });

  // Derived state to keep subtotals in sync
  useEffect(() => {
    let travelSub = 0;
    formData.travel_legs.forEach(leg => {
      travelSub += (leg.reg_hrs * formData.rates.travel_reg) + 
                   (leg.sat_hrs * formData.rates.travel_sat) + 
                   (leg.sun_hrs * formData.rates.travel_sun);
    });

    let laborSub = 0;
    formData.labor_schedule.forEach(day => {
      laborSub += (day.reg_hrs * formData.rates.regular) + 
                  (day.ot_hrs * formData.rates.overtime) + 
                  (day.premium_hrs * formData.rates.premium);
    });

    const grand = travelSub + laborSub + Number(formData.preparation_amount) + Number(formData.expenses_amount) + Number(formData.calibration_amount) - Number(formData.sales_accommodation_amount);

    setFormData(prev => ({
      ...prev,
      travel_subtotal: travelSub,
      labor_subtotal: laborSub,
      grand_total: grand
    }));
  }, [formData.travel_legs, formData.labor_schedule, formData.preparation_amount, formData.expenses_amount, formData.calibration_amount, formData.sales_accommodation_amount, formData.rates]);

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      rates: { ...prev.rates, [name]: Number(value) }
    }));
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
  };

  // Travel Handlers
  const addTravelLeg = () => {
    setFormData(prev => ({
      ...prev,
      travel_legs: [...prev.travel_legs, { id: Date.now().toString(), date: "", from: "", to: "", reg_hrs: 0, sat_hrs: 0, sun_hrs: 0, total: 0 }]
    }));
  };
  const updateTravelLeg = (id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      travel_legs: prev.travel_legs.map(leg => leg.id === id ? { ...leg, [field]: value } : leg)
    }));
  };
  const removeTravelLeg = (id: string) => {
    setFormData(prev => ({ ...prev, travel_legs: prev.travel_legs.filter(leg => leg.id !== id) }));
  };

  // Labor Handlers
  const addLaborDay = () => {
    setFormData(prev => ({
      ...prev,
      labor_schedule: [...prev.labor_schedule, { id: Date.now().toString(), date: "", type: "MONDAY REG", reg_hrs: 0, ot_hrs: 0, premium_hrs: 0, total: 0 }]
    }));
  };
  const updateLaborDay = (id: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      labor_schedule: prev.labor_schedule.map(day => day.id === id ? { ...day, [field]: value } : day)
    }));
  };
  const removeLaborDay = (id: string) => {
    setFormData(prev => ({ ...prev, labor_schedule: prev.labor_schedule.filter(day => day.id !== id) }));
  };

  // Save
  const handleSave = async () => {
    try {
      setLoading(true);
      const { data } = await api.post('/cotizaciones-us', formData);
      if (data.success) {
        setQuoteNumber(data.data.quote_number);
        setFormData(prev => ({ ...prev, quote_number: data.data.quote_number }));
        toast.success(`Cotización ${data.data.quote_number} guardada exitosamente`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al guardar la cotización");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="text-blue-600 dark:text-blue-400" size={32} />
            Nueva Cotización - Standard Rates (US)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Crea una cotización sin contrato con tarifas por hora y cronograma de actividades.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setModalVistaPreviaAbierto(true)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-white px-5 py-3 rounded-xl font-medium transition-all"
          >
            <Eye size={20} /> Vista Previa
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm disabled:opacity-50"
          >
            <Save size={20} /> {loading ? "Guardando..." : "Guardar Cotización"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado izquierdo: Información General y Tarifas */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <Building2 className="text-blue-500" size={20}/> Información del Cliente
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                <input type="text" name="customer" value={formData.customer} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" placeholder="ej. CF Burger" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City/State</label>
                <input type="text" name="city_state" value={formData.city_state} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" placeholder="ej. Detroit, MI" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope of Visit</label>
                <textarea name="scope_of_visit" value={formData.scope_of_visit} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" rows={3} placeholder="ej. SF40 line install..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment to be Serviced</label>
                <input type="text" name="equipment_to_service" value={formData.equipment_to_service} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                <input type="text" name="payment_terms" value={formData.payment_terms} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <UserCircle className="text-green-500" size={20}/> Cotizada Por
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre (Quoted by)</label>
                <input type="text" name="quoted_by" value={formData.quoted_by} onChange={handleInputChange} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" placeholder="ej. Brian Bergren" />
              </div>
            </div>
          </div>

          {/* Configuración de Tarifas */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <Settings className="text-purple-500" size={20}/> Field Service Rates (USD/Hr)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Regular (M-F)</label>
                <input type="number" name="regular" value={formData.rates.regular} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Overtime</label>
                <input type="number" name="overtime" value={formData.rates.overtime} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Premium (Sat/Sun)</label>
                <input type="number" name="premium" value={formData.rates.premium} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Travel (M-F)</label>
                <input type="number" name="travel_reg" value={formData.rates.travel_reg} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Travel (Sat)</label>
                <input type="number" name="travel_sat" value={formData.rates.travel_sat} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Travel (Sun)</label>
                <input type="number" name="travel_sun" value={formData.rates.travel_sun} onChange={handleRateChange} className="w-full p-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Lado derecho: Cronogramas y Totales */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Travel Time */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Truck className="text-orange-500" size={20}/> Travel Time
              </h2>
              <button onClick={addTravelLeg} className="text-sm bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors">
                <Plus size={16}/> Agregar Leg
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.travel_legs.map((leg, i) => (
                <div key={leg.id} className="p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl relative group">
                  <button onClick={() => removeTravelLeg(leg.id)} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                  <div className="grid grid-cols-12 gap-3 mb-2">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-500">Fecha</label>
                      <input type="text" placeholder="ej. 5/11/2026" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" value={leg.date} onChange={(e) => updateTravelLeg(leg.id, "date", e.target.value)} />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500">From</label>
                      <input type="text" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" value={leg.from} onChange={(e) => updateTravelLeg(leg.id, "from", e.target.value)} />
                    </div>
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-500">To</label>
                      <input type="text" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" value={leg.to} onChange={(e) => updateTravelLeg(leg.id, "to", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Reg Hrs (M-F)</label>
                      <input type="number" className="w-full p-1.5 bg-transparent border-b border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500" value={leg.reg_hrs || ""} onChange={(e) => updateTravelLeg(leg.id, "reg_hrs", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Sat Hrs</label>
                      <input type="number" className="w-full p-1.5 bg-transparent border-b border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500" value={leg.sat_hrs || ""} onChange={(e) => updateTravelLeg(leg.id, "sat_hrs", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500">Sun/Hol Hrs</label>
                      <input type="number" className="w-full p-1.5 bg-transparent border-b border-gray-200 dark:border-zinc-700 focus:outline-none focus:border-blue-500" value={leg.sun_hrs || ""} onChange={(e) => updateTravelLeg(leg.id, "sun_hrs", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
              {formData.travel_legs.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                  No hay viajes configurados.
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end font-bold text-gray-800 dark:text-white">
              Travel Subtotal: <span className="ml-2 text-blue-600 dark:text-blue-400">${formData.travel_subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Labor Schedule */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Calendar className="text-indigo-500" size={20}/> Labor Schedule
              </h2>
              <button onClick={addLaborDay} className="text-sm bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors">
                <Plus size={16}/> Agregar Día
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.labor_schedule.map((day, i) => (
                <div key={day.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl">
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500 md:hidden">Fecha</label>
                    <input type="text" placeholder="5/11" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm" value={day.date} onChange={(e) => updateLaborDay(day.id, "date", e.target.value)} />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-gray-500 md:hidden">Tipo</label>
                    <select className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm" value={day.type} onChange={(e) => updateLaborDay(day.id, "type", e.target.value)}>
                      <option value="MONDAY REG">Monday</option>
                      <option value="TUESDAY REG">Tuesday</option>
                      <option value="WEDNESDAY REG">Wednesday</option>
                      <option value="THURSDAY REG">Thursday</option>
                      <option value="FRIDAY REG">Friday</option>
                      <option value="SATURDAY OT">Saturday</option>
                      <option value="SUNDAY DBL">Sunday</option>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-500">Reg Hrs</label>
                    <input type="number" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm" value={day.reg_hrs || ""} onChange={(e) => updateLaborDay(day.id, "reg_hrs", Number(e.target.value))} disabled={day.type.includes("SATURDAY") || day.type.includes("SUNDAY")} />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-500">OT Hrs</label>
                    <input type="number" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm" value={day.ot_hrs || ""} onChange={(e) => updateLaborDay(day.id, "ot_hrs", Number(e.target.value))} disabled={day.type.includes("SATURDAY") || day.type.includes("SUNDAY")} />
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-500">Prem Hrs</label>
                    <input type="number" className="w-full p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm" value={day.premium_hrs || ""} onChange={(e) => updateLaborDay(day.id, "premium_hrs", Number(e.target.value))} disabled={!day.type.includes("SATURDAY") && !day.type.includes("SUNDAY")} />
                  </div>
                  <button onClick={() => removeLaborDay(day.id)} className="p-2 text-gray-400 hover:text-red-500 mt-4 md:mt-0">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {formData.labor_schedule.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                  No hay cronograma laboral configurado.
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end font-bold text-gray-800 dark:text-white">
              Labor Subtotal: <span className="ml-2 text-indigo-600 dark:text-indigo-400">${formData.labor_subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Otros Subtotales */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <DollarSign className="text-green-500" size={20}/> Additional Amounts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preparation Amount ($)</label>
                <input type="number" name="preparation_amount" value={formData.preparation_amount || ""} onChange={handleNumberInput} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
                <p className="text-xs text-gray-500 mt-1">Calcula {formData.rates.regular > 0 ? (formData.preparation_amount / formData.rates.regular).toFixed(1) : 0} hrs Regulares</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expenses (Billed at Cost) ($)</label>
                <input type="number" name="expenses_amount" value={formData.expenses_amount || ""} onChange={handleNumberInput} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Calibration Subtotal ($)</label>
                <input type="number" name="calibration_amount" value={formData.calibration_amount || ""} onChange={handleNumberInput} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Accommodation ($)</label>
                <input type="number" name="sales_accommodation_amount" value={formData.sales_accommodation_amount || ""} onChange={handleNumberInput} className="w-full p-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg" />
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-900 dark:bg-black rounded-xl text-white flex justify-between items-center shadow-lg">
              <span className="text-lg font-medium">GRAND TOTAL</span>
              <span className="text-2xl font-bold">${formData.grand_total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Vista Previa PDF */}
      {modalVistaPreviaAbierto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-500" /> Vista Previa PDF
              </h2>
              <div className="flex items-center gap-3">
                <PDFDownloadLinkDynamic
                  document={<StandardRatesPDF formData={formData} />}
                  fileName={`SIG_US_QUOTE_${formData.customer.replace(/\s+/g, '_')}.pdf`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  {({ loading }) => (loading ? "Generando..." : "Descargar PDF")}
                </PDFDownloadLinkDynamic>
                <button onClick={() => setModalVistaPreviaAbierto(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-zinc-950">
              <PDFDownloadLinkDynamic
                document={<StandardRatesPDF formData={formData} />}
                fileName={`SIG_US_QUOTE.pdf`}
              >
                {({ url }) => (
                  url ? <iframe src={url} className="w-full h-full border-0" title="PDF Preview" /> : <div className="flex items-center justify-center h-full"><p>Generando...</p></div>
                )}
              </PDFDownloadLinkDynamic>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
