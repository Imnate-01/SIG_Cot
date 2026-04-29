"use client";
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  Save,
  ArrowLeft,
  FileCheck,
  Trash2,
  Eye,
  X,
  Download,
  FileText
} from "lucide-react";
import dynamic from "next/dynamic";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { toast } from "sonner"; // Importamos toast
import { useTranslations } from "next-intl";

// --- 1. CARGA DINÁMICA DEL VISOR ---
const PDFViewerDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p className="text-center p-4">Cargando visor...</p> }
);

// --- 2. FUNCIÓN PARA GENERAR ESTILOS DINÁMICOS SEGÚN CANTIDAD DE ITEMS ---
const buildPdfStyles = (itemCount: number) => {
  // Escala: 1.0 para <=3 items, baja progresivamente hasta 0.65 para 10+ items
  const scale = itemCount <= 3 ? 1 : itemCount <= 5 ? 0.9 : itemCount <= 7 ? 0.8 : itemCount <= 9 ? 0.72 : 0.65;

  return StyleSheet.create({
    page: { padding: 30 * scale + 5, fontSize: 10 * scale, fontFamily: "Helvetica" },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 * scale, paddingBottom: 6 * scale, borderBottom: "2px solid #2563eb", alignItems: 'center' },
    logo: { width: 50 * scale + 10, height: 50 * scale + 10, marginBottom: 3 * scale, objectFit: "contain" as const },
    companyName: { fontSize: 13 * scale, fontWeight: "bold" },
    headerRight: { textAlign: "right" as const },
    section: { marginBottom: 6 * scale },
    sectionTitle: { fontSize: 9 * scale, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 3 * scale, marginBottom: 2 * scale },
    row: { flexDirection: "row" as const, marginBottom: 6 * scale },
    column: { flex: 1, marginRight: 8 * scale },
    label: { fontSize: 8 * scale, fontWeight: "bold", marginBottom: 1 },
    value: { fontSize: 9 * scale, marginBottom: 1, lineHeight: 1.3 },

    // Estilos de Tabla
    table: { marginTop: 6 * scale, marginBottom: 8 * scale },
    tableHeader: { flexDirection: "row" as const, backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: 4 * scale, fontWeight: "bold", fontSize: 8 * scale },
    tableRow: { flexDirection: "row" as const, borderBottom: "1px solid #e5e7eb", padding: 3 * scale, fontSize: 8 * scale },

    // Columnas
    colDesc: { flex: 2 },
    colTiny: { width: 35, textAlign: "center" as const },
    colSmall: { width: 55, textAlign: "center" as const },

    total: { flexDirection: "row" as const, justifyContent: "space-between" as const, backgroundColor: "#dbeafe", padding: 4 * scale, marginTop: 2 * scale, fontWeight: "bold", fontSize: 9 * scale },
    footer: { textAlign: "center" as const, fontSize: 7 * scale, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 5 * scale, marginTop: 8 * scale },
    signatureSection: { marginTop: 10 * scale, marginBottom: 4 * scale },
    signatureText: { fontSize: 9 * scale, marginBottom: 3 * scale, color: "#000", lineHeight: 1.3 },
    signatureImage: { width: 80 * scale + 20, height: 40 * scale + 10, objectFit: "contain" as const, marginLeft: 0, marginBottom: 0 },
    signatureLine: { borderBottom: "1px solid #000", width: 150 * scale + 30, marginTop: 3 * scale, marginBottom: 2 * scale },
    signatureName: { fontSize: 9 * scale, fontWeight: "bold" },
    signatureJob: { fontSize: 9 * scale, fontWeight: "bold" },
    desgloseText: { fontSize: 7 * scale, color: "#4b5563", marginLeft: 4, marginTop: 1 },
    notaText: { fontSize: 7 * scale, color: "#6b7280", fontStyle: "italic" as const, marginTop: 1 }
  });
};

// --- 3. COMPONENTE VISUAL DEL PDF ---
// Note: We'll keep the PDF static text logic in Spanish inside the PDF generator for this scope, 
// unless asked to internationalize the generated PDF docs as well. Let's internationalize only UI first.

const CotizacionDocument = ({ data }: { data: any }) => {
  const fecha = new Date(data.fecha_creacion).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const cliente = data.clientes || {};
  const usuario = data.usuarios || {};
  const items = data.cotizacion_items || [];
  const condiciones = data.condiciones || {};

  // Extraer información estructurada si existe, si no hacer fallback
  const datosForma = data.datos_forma || null;

  const proveedor = datosForma?.proveedor || {
    nombre: "SIG Combibloc México, S.A. de C.V.",
    direccion: "Av. Emilio Castelar No. 75",
    ciudad: "Ciudad de México, CP 11550",
    rfc: "SCM..."
  };

  const facturarA = datosForma?.facturarA || {
    nombre: cliente.empresa || cliente.nombre || "",
    direccion: cliente.direccion || "",
    ciudad: `${cliente.ciudad || ""} ${cliente.cp ? `, CP ${cliente.cp}` : ''}`.trim(),
    rfc: cliente.rfc || "No registrado"
  };

  const shipTo = datosForma?.shipToMismoQueFacturar 
    ? (datosForma?.facturarA || facturarA) 
    : (datosForma?.shipTo || {
        nombre: cliente.empresa || cliente.nombre || "",
        direccion: cliente.direccion || "",
        ciudad: cliente.ciudad || ""
      });

  const contactoPrincipal = datosForma?.contactoPrincipal || {
    nombre: usuario.nombre || "Ejecutivo de Cuenta",
    email: usuario.email,
    telefono: usuario.telefono
  };

  const contactoSecundario = datosForma?.contactoSecundario || {
    nombre: cliente.nombre,
    email: cliente.correo,
    telefono: cliente.telefono
  };

  // Generar estilos dinámicos según la cantidad de items
  const pdfStyles = buildPdfStyles(items.length);

  // Determinar puesto del usuario — misma lógica que en el PDF de creación/edición:
  // 1. Si el nombre incluye "eduardo" → cargo especial "Back Office Manager"
  // 2. Si no, buscar el puesto en la lista de usuarios del sistema por email del contactoPrincipal
  // 3. Fallback: puesto del join de BD, luego "Coordinador de Servicio Técnico"
  const nombreContacto = (contactoPrincipal.nombre || "").toLowerCase();
  let puestoUsuario = usuario.puesto || "Coordinador de Servicio Técnico";
  if (nombreContacto.includes("eduardo")) {
    puestoUsuario = "Back Office Manager";
  } else if (nombreContacto.includes("santoyo") || nombreContacto.includes("jonh") || nombreContacto.includes("john")) {
    puestoUsuario = "Service Sales Manager";
  }

  const subtotal = items.reduce((sum: number, i: any) => sum + Number(i.subtotal || i.total), 0);
  const totalGuardado = Number(data.total);
  const iva = totalGuardado > subtotal ? totalGuardado - subtotal : 0;
  const moneda = condiciones.moneda || "USD";
  const formatCurrency = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <Text style={pdfStyles.value}>{proveedor.ciudad || ""} {proveedor.cp ? `, CP ${proveedor.cp}` : ''}</Text>
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>FACTURAR A (SOLD TO):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{facturarA.nombre}</Text>
            <Text style={pdfStyles.value}>{facturarA.direccion}</Text>
            <Text style={pdfStyles.value}>{facturarA.ciudad || ""} {datosForma?.facturarA?.cp ? `, CP ${datosForma.facturarA.cp}` : ''}</Text>
            {facturarA.rfc && <Text style={pdfStyles.value}>RFC: {facturarA.rfc}</Text>}
          </View>
        </View>

        {/* Ship To */}
        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>LUGAR DEL SERVICIO (SHIP TO):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{shipTo.nombre}</Text>
            <Text style={pdfStyles.value}>{shipTo.direccion}</Text>
            <Text style={pdfStyles.value}>{shipTo.ciudad || ""} {datosForma?.shipTo?.cp ? `, CP ${datosForma.shipTo.cp}` : ''}</Text>
          </View>
        </View>

        {/* Contactos */}
        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>De (Ejecutivo):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{contactoPrincipal.nombre}</Text>
            <Text style={pdfStyles.value}>{contactoPrincipal.email}</Text>
            <Text style={pdfStyles.value}>{contactoPrincipal.telefono}</Text>
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>Contacto Cliente:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{contactoSecundario.nombre}</Text>
            <Text style={pdfStyles.value}>{contactoSecundario.email}</Text>
            <Text style={pdfStyles.value}>{contactoSecundario.telefono}</Text>
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
            const tieneDesgloseValido = item.desglose && item.desglose.length > 0 && 
              (item.desglose.length > 1 || item.desglose[0].nombre || item.desglose[0].horas > 0);
            
            // Priorizar item.ingenieros si es válido (incluso si es 6 y desglose tiene 1 elemento vacío)
            const numIngenieros = item.ingenieros ? item.ingenieros : (tieneDesgloseValido ? item.desglose.length : 1);


            return (
              <View key={idx} style={pdfStyles.tableRow}>
                <View style={pdfStyles.colDesc}>
                  <Text>{item.concepto}</Text>

                  {/* Renderizar Desglose (Nombres) */}
                  {tieneDesgloseValido && item.desglose.map((d: any, i: number) => {
                    if (!d.nombre && (!d.horas || d.horas === 0)) return null;
                    return (
                      <Text key={i} style={pdfStyles.desgloseText}>
                        • {d.nombre || `Ing. ${i + 1}`}: {d.horas}h
                      </Text>
                    );
                  })}

                  {/* Renderizar Notas */}
                  {item.detalles && <Text style={pdfStyles.notaText}>Nota: {item.detalles}</Text>}
                </View>

                {/* ✅ Celda "Ing." */}
                <Text style={pdfStyles.colTiny}>{numIngenieros}</Text>

                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>{item.cantidad}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>${formatCurrency(Number(item.precio_unitario))}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold", fontSize: 9 * (items.length <= 3 ? 1 : 0.8) }]}>${formatCurrency(Number(item.subtotal || item.total))}</Text>
              </View>
            );
          })}

          <View style={pdfStyles.total}>
            <Text>Subtotal:</Text>
            <Text>${formatCurrency(subtotal)} {moneda}</Text>
          </View>

          {iva > 0 && (
            <View style={[pdfStyles.total, { backgroundColor: "#f3f4f6" }]}>
              <Text>IVA (16%):</Text>
              <Text>${formatCurrency(iva)} {moneda}</Text>
            </View>
          )}

          <View style={[pdfStyles.total, { backgroundColor: "#dbeafe" }]}>
            <Text>TOTAL:</Text>
            <Text>${formatCurrency(totalGuardado)} {moneda}</Text>
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

        {/* Spacer para empujar la firma al fondo de la página */}
        <View style={{ flexGrow: 1 }} />

        {/* Firma + Footer: wrap=false para que no se separen en otra hoja */}
        <View wrap={false} style={pdfStyles.signatureSection}>
          <Text style={pdfStyles.signatureText}>
            {condiciones.entidad === "US" ? "Send purchase order to " : "Enviar orden de compra a "}
            <Text style={{ color: "blue" }}>{contactoPrincipal.email || ""}</Text>
            {condiciones.entidad === "US" ? " to the attention of " : " con atención a "}{contactoPrincipal.nombre || "Representante SIG"}.
          </Text>
          <Image style={pdfStyles.signatureImage} src={(contactoPrincipal.nombre || "").toLowerCase().includes("eduardo") ? "/eduardo_firma.png" : ((contactoPrincipal.nombre || "").toLowerCase().includes("santoyo") || (contactoPrincipal.nombre || "").toLowerCase().includes("jonh") || (contactoPrincipal.nombre || "").toLowerCase().includes("john")) ? "/santoyo.png" : "/firma_julio.png"} />
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureName}>{contactoPrincipal.nombre || "Representante SIG"}</Text>
          <Text style={pdfStyles.signatureJob}>{puestoUsuario}</Text>

          <View style={pdfStyles.footer}>
            <Text style={{ fontWeight: "bold" }}>{proveedor.nombre}</Text>
            <Text>{proveedor.direccion}{proveedor.colonia ? `, ${proveedor.colonia}` : ""}, {proveedor.ciudad}{proveedor.cp ? `, C.P. ${proveedor.cp}` : ""}</Text>
            <Text style={{ marginTop: 2 }}>www.sig.biz</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// --- 4. PÁGINA PRINCIPAL DE GESTIÓN ---
export default function GestionCotizacion() {
  const t = useTranslations("GestionCotizacion");
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
        toast.error("Error al cargar la cotización");
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
      toast.success(t("toastStatusUpdated"), { description: t("toastStatusUpdatedDesc") });
      router.push("/cotizaciones");
    } catch (error) {
      toast.error(t("toastStatusError"), { description: t("toastStatusErrorDesc") });
    }
  };

  const handleEliminar = async () => {
    const confirmado = window.confirm(t("confirmDelete"));
    if (!confirmado) return;
    try {
      await api.delete(`/cotizaciones/${id}`);
      toast.success(t("toastDeleted"), { description: t("toastDeletedDesc") });
      router.push("/cotizaciones");
    } catch (error) {
      console.error(error);
      toast.error(t("toastDeleteError"), { description: t("toastDeleteErrorDesc") });
    }
  };

  const handleDownloadPdf = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(<CotizacionDocument data={cotizacion} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion_${cotizacion.numero_cotizacion}.pdf`;
    link.click();
  };

  if (loading) return <div className="p-10 text-center dark:text-white">{t("loading")}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 flex justify-center">
      <div className="w-full max-w-2xl">

        <Link href="/cotizaciones" className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-6 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> {t("backToBoard")}
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 dark:bg-blue-700 p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileCheck /> {t("title")}
              </h2>
              <p className="opacity-90 mt-2">{t("folio")}: {cotizacion?.numero_cotizacion}</p>
              <p className="opacity-75 text-sm">{cotizacion?.clientes?.nombre}</p>

              {/* Descripción — solo renderiza si existe */}
              {cotizacion?.descripcion && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm border border-white/20">
                  <span className="opacity-60 text-xs">📋</span>
                  <span className="font-medium">{cotizacion.descripcion}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowPdfModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-semibold backdrop-blur-sm shadow-sm"
            >
              <Eye size={18} /> {t("btnPreview")}
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-center mb-4">
              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-white px-4 py-2 rounded-full font-bold text-lg border border-gray-200 dark:border-zinc-700">
                {t("total")}: ${Number(cotizacion?.total).toLocaleString()} USD
              </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t("statusLabel")}</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              >
                <option value="borrador">{t("statusDraft")}</option>
                <option value="aceptada">{t("statusWon")}</option>
                <option value="rechazada">{t("statusLost")}</option>
              </select>
            </div>

            {estado === "aceptada" && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2">
                  {t("poDataTitle")}
                </h3>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1">{t("poNumber")}</label>
                    <input
                      type="text"
                      value={ordenCompra}
                      onChange={(e) => setOrdenCompra(e.target.value)}
                      placeholder={t("poPlaceholder")}
                      className="w-full p-3 border border-green-300 dark:border-green-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:border-green-600 dark:focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1">{t("poStatus")}</label>
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
                        <span className="text-gray-700 dark:text-gray-300">{t("poPending")}</span>
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
                        <span className="text-gray-700 dark:text-gray-300 font-semibold">{t("poCompleted")}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">

              {/* Botón Editar solo si es borrador */}
              {estado === "borrador" && (
                <Link
                  href={`/cotizaciones/editar/${id}`}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <FileText size={24} /> {t("btnEdit")}
                </Link>
              )}

              <button
                onClick={handleGuardarCambios}
                className="w-full bg-blue-600 dark:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Save size={24} /> {t("btnSave")}
              </button>

              <button
                onClick={handleEliminar}
                className="w-full bg-white dark:bg-transparent text-red-600 dark:text-red-400 border-2 border-red-100 dark:border-red-900/50 py-3 rounded-xl font-bold text-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={20} /> {t("btnDelete")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 dark:border-zinc-800">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t("modalPreviewTitle", { folio: cotizacion?.numero_cotizacion })}</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Download size={16} /> {t("btnDownload")}
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-200 dark:bg-zinc-950">
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