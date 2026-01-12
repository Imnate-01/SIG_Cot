"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useParams, useRouter } from "next/navigation";
import { 
  Save, 
  ArrowLeft, 
  FileCheck, 
  Trash2, 
  Eye, 
  X, 
  Download 
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Document, Page, Text, View, StyleSheet, Image, pdf } from "@react-pdf/renderer";

// --- 1. CARGA DINÁMICA DEL VISOR ---
const PDFViewerDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p className="text-center p-4">Cargando visor...</p> }
);

// --- 2. ESTILOS ACTUALIZADOS (Con columnas definidas igual que en Nueva) ---
const pdfStyles = StyleSheet.create({
  page: { padding: 35, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15, paddingBottom: 10, borderBottom: "2px solid #2563eb", alignItems: 'center' },
  logo: { width: 60, height: 60, marginBottom: 5, objectFit: "contain" },
  companyName: { fontSize: 13, fontWeight: "bold" },
  headerRight: { textAlign: "right" },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 4, marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 10 },
  column: { flex: 1, marginRight: 10 },
  label: { fontSize: 8, fontWeight: "bold", marginBottom: 2 },
  value: { fontSize: 9, marginBottom: 2, lineHeight: 1.3 },
  
  // Estilos de Tabla Mejorados
  table: { marginTop: 10, marginBottom: 15 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: 5, fontWeight: "bold", fontSize: 8 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #e5e7eb", padding: 5, fontSize: 8 },
  
  // Columnas específicas (Alineadas con Nueva Cotización)
  colDesc: { flex: 2 }, 
  colTiny: { width: 35, textAlign: "center" }, // Para "Ing."
  colSmall: { width: 55, textAlign: "center" }, // Para Cant, Precio, Total

  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#dbeafe", padding: 6, marginTop: 4, fontWeight: "bold", fontSize: 9 },
  footer: { position: "absolute", bottom: 30, left: 35, right: 35, textAlign: "center", fontSize: 8, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 8 },
  signatureSection: { marginTop: 20, marginBottom: 10 },
  signatureText: { fontSize: 9, marginBottom: 5, color: "#000", lineHeight: 1.3 },
  signatureImage: { width: 100, height: 50, objectFit: "contain", marginLeft: 0, marginBottom: 0 },
  signatureLine: { borderBottom: "1px solid #000", width: 180, marginTop: 5, marginBottom: 4 },
  signatureName: { fontSize: 9, fontWeight: "bold" },
  signatureJob: { fontSize: 9, fontWeight: "bold" }
});

// --- 3. COMPONENTE VISUAL DEL PDF ---
const CotizacionDocument = ({ data }: { data: any }) => {
  const fecha = new Date(data.fecha_creacion).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  
  const cliente = data.clientes || {};
  const usuario = data.usuarios || {}; 
  const items = data.cotizacion_items || [];
  const condiciones = data.condiciones || {}; 
  
  const proveedor = {
    nombre: "SIG Combibloc México, S.A. de C.V.",
    direccion: "Av. Emilio Castelar No. 75",
    ciudad: "Ciudad de México, CP 11550",
    rfc: "SCM..." 
  };

  const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.subtotal || i.total), 0);
  const totalGuardado = Number(data.total);
  const iva = totalGuardado > subtotal ? totalGuardado - subtotal : 0;
  const moneda = condiciones.moneda || "USD"; 

  // Fallback para notas antiguas
  const notasLimpias = !data.condiciones && data.notas 
    ? data.notas.split('CONDICIONES:')[1] || data.notas 
    : null;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View>
            <Image style={pdfStyles.logo} src="/SIG_logo.png" />
            <Text style={pdfStyles.companyName}>SIG Combibloc</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={{ fontSize: 9, marginBottom: 3 }}>
                <Text style={{ fontWeight: "bold" }}>COTIZACIÓN No: </Text>
                {data.numero_cotizacion}
            </Text>
            <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>FECHA: </Text>{fecha}</Text>
          </View>
        </View>

        {/* Datos Proveedor / Facturar */}
        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>PROVEEDOR:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{proveedor.nombre}</Text>
            <Text style={pdfStyles.value}>{proveedor.direccion}</Text>
            <Text style={pdfStyles.value}>{proveedor.ciudad}</Text>
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>FACTURAR A (SOLD TO):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{cliente.empresa || cliente.nombre}</Text>
            <Text style={pdfStyles.value}>{cliente.direccion}</Text>
            <Text style={pdfStyles.value}>{cliente.ciudad} {cliente.cp ? `, CP ${cliente.cp}` : ''}</Text>
            <Text style={pdfStyles.value}>RFC: {cliente.rfc || "No registrado"}</Text>
          </View>
        </View>

        {/* Ship To */}
        <View style={pdfStyles.row}>
             <View style={pdfStyles.column}>
                <Text style={pdfStyles.sectionTitle}>LUGAR DEL SERVICIO (SHIP TO):</Text>
                <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{cliente.empresa || cliente.nombre}</Text>
                <Text style={pdfStyles.value}>{cliente.direccion}</Text>
                <Text style={pdfStyles.value}>{cliente.ciudad}</Text>
             </View>
        </View>

        {/* Contactos */}
        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>De (Ejecutivo):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{usuario.nombre || "Ejecutivo de Cuenta"}</Text>
            <Text style={pdfStyles.value}>{usuario.email}</Text>
            <Text style={pdfStyles.value}>{usuario.telefono}</Text>
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>Contacto Cliente:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{cliente.nombre}</Text>
            <Text style={pdfStyles.value}>{cliente.correo}</Text>
            <Text style={pdfStyles.value}>{cliente.telefono}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>Detalle / Servicio</Text>
            {/* ✅ Columna "Ing." Agregada */}
            <Text style={pdfStyles.colTiny}>Ing.</Text>
            <Text style={pdfStyles.colSmall}>Cant.</Text>
            <Text style={pdfStyles.colSmall}>P. Unit.</Text>
            <Text style={pdfStyles.colSmall}>Total</Text>
          </View>
          
          {items.map((item: any, idx: number) => {
            // Lógica para mostrar ingenieros:
            // 1. Si hay desglose (array en JSONB), contamos elementos.
            // 2. Si no, usamos el campo 'ingenieros' que agregamos a la BD.
            // 3. Si todo falla, asumimos 1.
            const numIngenieros = item.desglose && item.desglose.length > 0 
                ? item.desglose.length 
                : (item.ingenieros || 1);

            return (
              <View key={idx} style={pdfStyles.tableRow}>
                <View style={pdfStyles.colDesc}>
                  <Text>{item.concepto}</Text>
                  
                  {/* Renderizar Desglose (Nombres) */}
                  {item.desglose && Array.isArray(item.desglose) && item.desglose.length > 0 && item.desglose.map((d: any, i: number) => (
                     <Text key={i} style={{ fontSize: 7, color: "#4b5563", marginLeft: 4, marginTop: 1 }}>
                       • {d.nombre || `Ing. ${i + 1}`}: {d.horas}h
                     </Text>
                  ))}
                  
                  {/* Renderizar Notas */}
                  {item.detalles && <Text style={{ fontSize: 7, color: "#6b7280", fontStyle: 'italic', marginTop: 1 }}>Nota: {item.detalles}</Text>}
                </View>

                {/* ✅ Celda "Ing." */}
                <Text style={pdfStyles.colTiny}>{numIngenieros}</Text>

                <Text style={pdfStyles.colSmall}>{item.cantidad}</Text>
                <Text style={pdfStyles.colSmall}>${Number(item.precio_unitario).toFixed(2)}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>${Number(item.subtotal || item.total).toFixed(2)}</Text>
              </View>
            );
          })}

          <View style={pdfStyles.total}>
            <Text>Subtotal:</Text>
            <Text>${subtotal.toFixed(2)} {moneda}</Text>
          </View>

          {iva > 0 && (
            <View style={[pdfStyles.total, { backgroundColor: "#f3f4f6" }]}>
              <Text>IVA (16%):</Text>
              <Text>${iva.toFixed(2)} {moneda}</Text>
            </View>
          )}

          <View style={[pdfStyles.total, { backgroundColor: "#dbeafe" }]}>
            <Text>TOTAL:</Text>
            <Text>${totalGuardado.toFixed(2)} {moneda}</Text>
          </View>
        </View>

        {/* Condiciones */}
        {data.condiciones ? (
          <>
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.label}>Condiciones Generales:</Text>
              <Text style={pdfStyles.value}>
                <Text style={{ fontWeight: "bold" }}>Precios: </Text>{condiciones.precios || "N/A"} | 
                <Text style={{ fontWeight: "bold" }}> Moneda: </Text>{condiciones.moneda || "USD"}
                {condiciones.maquina && <Text> | <Text style={{ fontWeight: "bold" }}>Máquina: </Text>{condiciones.maquina}</Text>}
              </Text>
            </View>

            {condiciones.observaciones && (
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.label}>Observaciones:</Text>
                <Text style={pdfStyles.value}>{condiciones.observaciones}</Text>
              </View>
            )}
          </>
        ) : (
          notasLimpias && (
            <View style={pdfStyles.section}>
               <Text style={pdfStyles.label}>Notas / Condiciones:</Text>
               <Text style={pdfStyles.value}>{notasLimpias.trim()}</Text>
            </View>
          )
        )}

        {/* Firma */}
        <View style={pdfStyles.signatureSection}>
          <Text style={pdfStyles.signatureText}>
            Atentamente,
          </Text>
          <Image style={pdfStyles.signatureImage} src="/firma_julio.png" />
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureName}>{usuario.nombre || "Representante SIG"}</Text>
          <Text style={pdfStyles.signatureJob}>{usuario.puesto || "Service Sales"}</Text>
        </View>

        <View style={pdfStyles.footer}>
          <Text style={{ fontWeight: "bold" }}>{proveedor.nombre}</Text>
          <Text>{proveedor.direccion}, {proveedor.ciudad}</Text>
          <Text style={{ marginTop: 2 }}>www.sig.biz</Text>
        </View>
      </Page>
    </Document>
  );
};

// --- 4. PÁGINA PRINCIPAL DE GESTIÓN ---
export default function GestionCotizacion() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [estado, setEstado] = useState("borrador");
  const [ordenCompra, setOrdenCompra] = useState("");
  const [estatusPO, setEstatusPO] = useState("pendiente");
  
  const [cotizacion, setCotizacion] = useState<any>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        const { data } = await api.get(`/cotizaciones/${id}`);
        setCotizacion(data.data);
        setEstado(data.data.estado || "borrador");
        setOrdenCompra(data.data.orden_compra || "");
        setEstatusPO(data.data.estatus_po || "pendiente");
      } catch (error) {
        alert("Error al cargar la cotización");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCotizacion();
  }, [id]);

  const handleGuardarCambios = async () => {
    try {
      await api.put(`/cotizaciones/${id}/estado`, {
        estado,
        orden_compra: ordenCompra,
        estatus_po: estatusPO
      });
      alert("✅ Estado actualizado correctamente");
      router.push("/cotizaciones");
    } catch (error) {
      alert("Error al actualizar");
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm("⚠️ ¿Estás seguro de que deseas ELIMINAR esta cotización?");
    if (!confirmado) return;
    try {
      await api.delete(`/cotizaciones/${id}`);
      alert("🗑️ Cotización eliminada correctamente");
      router.push("/cotizaciones");
    } catch (error) {
      console.error(error);
      alert("❌ Error al eliminar.");
    }
  };

  const handleDownloadPdf = async () => {
    const blob = await pdf(<CotizacionDocument data={cotizacion} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion_${cotizacion.numero_cotizacion}.pdf`;
    link.click();
  };

  if (loading) return <div className="p-10 text-center">Cargando detalles...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
      <div className="w-full max-w-2xl">
        
        <Link href="/cotizaciones" className="flex items-center text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={20} className="mr-2"/> Volver al tablero
        </Link>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileCheck /> Gestión de Cotización
              </h2>
              <p className="opacity-90 mt-2">Folio: {cotizacion?.numero_cotizacion}</p>
              <p className="opacity-75 text-sm">{cotizacion?.clientes?.nombre}</p>
            </div>
            
            <button 
              onClick={() => setShowPdfModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-semibold backdrop-blur-sm shadow-sm"
            >
              <Eye size={18} /> Ver Cotización
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-center mb-4">
               <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-full font-bold text-lg border border-gray-200">
                 Total: ${Number(cotizacion?.total).toLocaleString()} USD
               </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Estado de la Cotización</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="borrador">🟡 Borrador / Pendiente</option>
                <option value="aceptada">🟢 Aceptada (Ganada)</option>
                <option value="rechazada">🔴 Rechazada (Perdida)</option>
              </select>
            </div>

            {estado === "aceptada" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                   Datos de Orden de Compra (PO)
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Número de PO</label>
                    <input
                      type="text"
                      value={ordenCompra}
                      onChange={(e) => setOrdenCompra(e.target.value)}
                      placeholder="Ej: PO-450099123"
                      className="w-full p-3 border border-green-300 rounded-lg focus:outline-none focus:border-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-green-700 uppercase mb-1">Estatus</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="po_status" 
                          value="pendiente"
                          checked={estatusPO === "pendiente"}
                          onChange={() => setEstatusPO("pendiente")}
                          className="accent-orange-500 w-5 h-5"
                        />
                        <span className="text-gray-700">Pendiente</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="po_status" 
                          value="completada"
                          checked={estatusPO === "completada"}
                          onChange={() => setEstatusPO("completada")}
                          className="accent-green-600 w-5 h-5"
                        />
                        <span className="text-gray-700 font-semibold">Completada</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                <button
                  onClick={handleGuardarCambios}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={24} /> Guardar Cambios
                </button>

                <button
                  onClick={handleEliminar}
                  className="w-full bg-white text-red-600 border-2 border-red-100 py-3 rounded-xl font-bold text-lg hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={20} /> Eliminar Cotización
                </button>
            </div>
          </div>
        </div>
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Vista Previa: {cotizacion?.numero_cotizacion}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Download size={16} /> Descargar PDF
                </button>
                <button 
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-200">
              <PDFViewerDynamic width="100%" height="100%" className="border-0">
                <CotizacionDocument data={cotizacion} />
              </PDFViewerDynamic>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}