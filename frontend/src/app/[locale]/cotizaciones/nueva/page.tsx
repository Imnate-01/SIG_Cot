"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/services/api";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import MachineCombobox from "@/components/MachineCombobox";
import {
  Download,
  Eye,
  Save,
  Building2,
  User,
  FileText,
  Calculator,
  X,
  Users,
  MapPin,
  CheckSquare,
  Trash2,
  Sparkles,
  Wand2,
  Mail,
  Copy,
  Paperclip,
  FileCheck,
  Edit2,
} from "lucide-react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image
} from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const PDFDownloadLinkDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p>Loading...</p> }
);

/* ===================== Tipos ===================== */

interface Proveedor { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; rfc?: string; }
interface FacturarA { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface ShipTo { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface Contacto { nombre: string; email: string; telefono: string; }
interface Condiciones { precios: string; moneda: string; maquina: string; observaciones: string; entidad?: "MX" | "US" | "CA"; scopeOfVisit?: string; equipmentToService?: string; paymentTerms?: string; }
interface CotizacionFormData {
  proveedor: Proveedor;
  facturarA: FacturarA;
  shipTo: ShipTo;
  shipToMismoQueFacturar: boolean;
  contactoPrincipal: Contacto;
  contactoSecundario: Contacto;
  condiciones: Condiciones;
  descripcion: string;
  tipo_servicio: string;
}
interface ClienteDireccion {
  id: string | number;
  tipo: "sold_to" | "ship_to";
  empresa_planta_nombre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  cp: string;
  contacto_nombre: string;
  contacto_correo: string;
  contacto_telefono: string;
}

interface ClienteMaquina {
  id: string | number;
  modelo_maquina: string;
  serie: string;
  machine_id: string;
  direccion_id?: number | null;
}

interface ClientePredefinido {
  id: string | number;
  nombre: string;
  empresa?: string;
  contacto_nombre?: string;
  correo?: string;
  telefono?: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  cp: string;
  pais?: string;
  cliente_direcciones?: ClienteDireccion[];
  cliente_maquinas?: ClienteMaquina[];
}

interface UsuarioRegistrado { id: string; nombre: string; email: string; telefono: string; puesto?: string; departamento?: string; }

interface Tarifa {
  id: string | number;
  concepto: string;
  unidad: "hora" | "dia";
  precio_sin_contrato: number;
  precio_con_contrato: number;
  moneda?: string;
  requiere_desglose?: boolean;
  categoria?: string;
}

interface DesgloseIngeniero { uid: string; nombre: string; horas: number; }
interface ServicioTarifado { id: number; tarifaId: string; ingenieros: number; cantidad: number; conContrato: boolean; detalles?: string; desglose: DesgloseIngeniero[]; total: number; esPrecioManual?: boolean; precioManual?: number; }

/* ===================== Estilos PDF Dinámicos ===================== */
const buildPdfStyles = (itemCount: number) => {
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
        table: { marginTop: 6 * scale, marginBottom: 8 * scale },
        tableHeader: { flexDirection: "row" as const, backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: 4 * scale, fontWeight: "bold", fontSize: 8 * scale },
        tableRow: { flexDirection: "row" as const, borderBottom: "1px solid #e5e7eb", padding: 3 * scale, fontSize: 8 * scale },
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
        notaText: { fontSize: 7 * scale, color: "#6b7280", fontStyle: "italic" as const, marginTop: 1 },
        descripcionBadge: { fontSize: 8 * scale, color: "#4b5563", marginTop: 2, fontStyle: "italic" as const }
    });
};

/* ===================== Componente PDF ===================== */

interface CotizacionPDFProps {
  formData: CotizacionFormData;
  itemsServicio: ServicioTarifado[];
  aplicarIVA: boolean;
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[];
  tarifasCliente?: Record<string, number>;
}

const CotizacionPDF: React.FC<CotizacionPDFProps> = ({ formData, itemsServicio, tarifas, folio, usuariosRegistrados, tarifasCliente = {} }) => {
  const pdfStyles = buildPdfStyles(itemsServicio.length);
  const subtotal = itemsServicio.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal;
  const isUS = formData.condiciones.entidad === "US" || formData.condiciones.entidad === "CA";
  const fecha = new Date().toLocaleDateString(isUS ? "en-US" : "es-MX", { day: "numeric", month: "long", year: "numeric" });

  const shipToData = formData.shipToMismoQueFacturar ? formData.facturarA : formData.shipTo;

  const puestoUsuarioRaw = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email)?.puesto || "Coordinador de Servicio Técnico";
  const nombreUsuarioCheck = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email)?.nombre || "";
  let puestoUsuario = puestoUsuarioRaw;
  if (nombreUsuarioCheck.toLowerCase().includes("eduardo")) {
    puestoUsuario = "Back Office Manager";
  } else if (nombreUsuarioCheck.toLowerCase().includes("santoyo") || nombreUsuarioCheck.toLowerCase().includes("jonh") || nombreUsuarioCheck.toLowerCase().includes("john")) {
    puestoUsuario = "Service Sales Manager";
  }
  const displayFolio = folio ? folio : (isUS ? "DRAFT" : "BORRADOR");
  const formatCurrency = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const usuarioSeleccionado = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email);
  const nombreUsuario = usuarioSeleccionado?.nombre || formData.contactoPrincipal.nombre || "Representante SIG";
  const emailUsuario = usuarioSeleccionado?.email || formData.contactoPrincipal.email || "contacto@sig.biz";

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View>
            <Image style={pdfStyles.logo} src="/SIG_logo.png" />
            <Text style={pdfStyles.companyName}>SIG Combibloc</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={{ fontSize: 9, marginBottom: 3 }}>
              <Text style={{ fontWeight: "bold" }}>{isUS ? "QUOTE No: " : "COTIZACIÓN No: "}</Text>
              {displayFolio}
            </Text>
            <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>{isUS ? "DATE: " : "FECHA: "}</Text>{fecha}</Text>
            {formData.descripcion && <Text style={pdfStyles.descripcionBadge}>{formData.descripcion}</Text>}
          </View>
        </View>



        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>{isUS ? "VENDOR:" : "PROVEEDOR:"}</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.proveedor.nombre}</Text>
            <Text style={pdfStyles.value}>{formData.proveedor.direccion}</Text>
            <Text style={pdfStyles.value}>{formData.proveedor.ciudad}{formData.proveedor.cp ? `, C.P. ${formData.proveedor.cp}` : ""}</Text>
            {formData.proveedor.rfc && <Text style={pdfStyles.value}>RFC: {formData.proveedor.rfc}</Text>}
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>{isUS ? "BILL TO (SOLD TO):" : "FACTURAR A (SOLD TO):"}</Text>
            {formData.facturarA.nombre ? <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.facturarA.nombre}</Text> : null}
            {formData.facturarA.direccion ? <Text style={pdfStyles.value}>{formData.facturarA.direccion}</Text> : null}
            {formData.facturarA.colonia ? <Text style={pdfStyles.value}>{formData.facturarA.colonia}</Text> : null}
            {(formData.facturarA.ciudad || formData.facturarA.cp) ? <Text style={pdfStyles.value}>{formData.facturarA.ciudad}{formData.facturarA.cp ? `, C.P. ${formData.facturarA.cp}` : ""}</Text> : null}
          </View>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>{isUS ? "SERVICE LOCATION (SHIP TO):" : "LUGAR DEL SERVICIO (SHIP TO):"}</Text>
            {shipToData.nombre ? <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{shipToData.nombre}</Text> : null}
            {shipToData.direccion ? <Text style={pdfStyles.value}>{shipToData.direccion}</Text> : null}
            {shipToData.colonia ? <Text style={pdfStyles.value}>{shipToData.colonia}</Text> : null}
            {(shipToData.ciudad || shipToData.cp) ? <Text style={pdfStyles.value}>{shipToData.ciudad}{shipToData.cp ? `, C.P. ${shipToData.cp}` : ""}</Text> : null}
          </View>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>{isUS ? "From:" : "De:"}</Text>
            {formData.contactoPrincipal.nombre ? <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.contactoPrincipal.nombre}</Text> : null}
            {formData.contactoPrincipal.email ? <Text style={pdfStyles.value}>E-mail: {formData.contactoPrincipal.email}</Text> : null}
            {formData.contactoPrincipal.telefono ? <Text style={pdfStyles.value}>Tel: {formData.contactoPrincipal.telefono}</Text> : null}
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>{isUS ? "Contact:" : "Contacto:"}</Text>
            {formData.contactoSecundario.nombre ? <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.contactoSecundario.nombre}</Text> : null}
            {formData.contactoSecundario.email ? <Text style={pdfStyles.value}>E-mail: {formData.contactoSecundario.email}</Text> : null}
            {formData.contactoSecundario.telefono ? <Text style={pdfStyles.value}>Tel: {formData.contactoSecundario.telefono}</Text> : null}
          </View>
        </View>

        {/* Tabla */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>{isUS ? "Detail" : "Detalle"}</Text>
            <Text style={pdfStyles.colTiny}>{isUS ? "Eng." : "Ing."}</Text>
            <Text style={pdfStyles.colSmall}>{isUS ? "Qty.Hrs." : "Cant.Hrs."}</Text>
            <Text style={pdfStyles.colSmall}>{isUS ? "Unit P." : "P. Unit."}</Text>
            <Text style={pdfStyles.colSmall}>Total</Text>
          </View>

          {itemsServicio.map((item) => {
            const tarifa = tarifas.find((t) => String(t.id) === item.tarifaId);
            // Bug 3 fix: use client contract rate if available
            let precioUnitario: number;
            if (item.esPrecioManual && item.precioManual !== undefined) {
              precioUnitario = item.precioManual;
            } else if (item.conContrato && tarifasCliente[item.tarifaId]) {
              precioUnitario = tarifasCliente[item.tarifaId];
            } else {
              precioUnitario = item.conContrato ? tarifa?.precio_con_contrato || 0 : tarifa?.precio_sin_contrato || 0;
            }

            // Bug 5 fix: prioritize item.ingenieros
            const numIngenieros = item.ingenieros ? item.ingenieros : (tarifa?.requiere_desglose && item.desglose && item.desglose.length > 0 ? item.desglose.length : 1);

            // Bug 4 fix: validate breakdown
            const tieneDesgloseValido = item.desglose && item.desglose.length > 0 &&
              (item.desglose.length > 1 || item.desglose[0]?.nombre || (item.desglose[0]?.horas && item.desglose[0].horas > 0));

            return (
              <View key={item.id} style={pdfStyles.tableRow}>
                <View style={pdfStyles.colDesc}>
                  <Text>{tarifa?.concepto || (isUS ? "Not specified" : "No especificado")}</Text>

                  {tieneDesgloseValido && item.desglose.map((d, idx) => {
                    if (!d.nombre && (!d.horas || d.horas === 0)) return null;
                    return (
                      <Text key={idx} style={pdfStyles.desgloseText}>• {d.nombre || (isUS ? `Eng. ${idx + 1}` : `Ing. ${idx + 1}`)}: {d.horas}h</Text>
                    );
                  })}

                  {item.detalles && <Text style={pdfStyles.notaText}>{isUS ? "Note: " : "Nota: "}{item.detalles}</Text>}
                </View>

                <Text style={pdfStyles.colTiny}>{numIngenieros}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>{item.cantidad}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>${formatCurrency(precioUnitario)}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold", fontSize: 9 * (itemsServicio.length <= 3 ? 1 : 0.8) }]}>${formatCurrency(item.total)}</Text>
              </View>
            );
          })}

          <View style={pdfStyles.total}>
            <Text>Subtotal:</Text>
            <Text>${formatCurrency(subtotal)} {formData.condiciones.moneda}</Text>
          </View>

          <View style={[pdfStyles.total, { backgroundColor: "#dbeafe" }]}>
            <Text>TOTAL:</Text>
            <Text>${formatCurrency(total)} {formData.condiciones.moneda}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>{isUS ? "General Conditions:" : "Condiciones Generales:"}</Text>
          <Text style={pdfStyles.value}>
            {!isUS && <Text><Text style={{ fontWeight: "bold" }}>Precios: </Text>{formData.condiciones.precios} | <Text style={{ fontWeight: "bold" }}>Moneda: </Text>{formData.condiciones.moneda}</Text>}
            {(!isUS && formData.condiciones.maquina) && <Text> | <Text style={{ fontWeight: "bold" }}>Máquina: </Text>{formData.condiciones.maquina}</Text>}
            {(isUS && formData.condiciones.maquina) && <Text><Text style={{ fontWeight: "bold" }}>Machine: </Text>{formData.condiciones.maquina}</Text>}
          </Text>
        </View>

        {formData.condiciones.observaciones && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>{isUS ? "Observations:" : "Observaciones:"}</Text>
            <Text style={pdfStyles.value}>{formData.condiciones.observaciones}</Text>
          </View>
        )}

        {isUS && formData.condiciones.scopeOfVisit && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Scope of visit:</Text>
            <Text style={pdfStyles.value}>{formData.condiciones.scopeOfVisit}</Text>
          </View>
        )}

        {isUS && formData.condiciones.equipmentToService && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Equipment to be Serviced:</Text>
            <Text style={pdfStyles.value}>{formData.condiciones.equipmentToService}</Text>
          </View>
        )}

        {isUS && formData.condiciones.paymentTerms && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Payment Terms:</Text>
            <Text style={pdfStyles.value}>{formData.condiciones.paymentTerms}</Text>
          </View>
        )}

        {isUS && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Terms and Conditions:</Text>
            <Text style={[pdfStyles.value, { fontSize: 7, textAlign: "justify" }]}>
              If there is an existing written agreement between Customer and SIG governing the sale of the products or services quoted herein, the terms of that agreement shall apply. In the absence of such agreement, this Quotation and any resulting orders are subject to SIG's General Terms and Conditions of Sale, a current copy of which can be found at https://www.sig.biz/en/general-terms-and-conditions-for-customers ("GTC"). By placing an order, Customer agrees to be bound by the GTC, which are incorporated by reference. Any terms in Customer's purchase order or other documents that are different from, or in addition to, the GTC are expressly rejected and shall have no effect unless accepted by SIG in a signed writing.
            </Text>
          </View>
        )}

        {/* Spacer para empujar la firma al fondo de la página */}
        <View style={{ flexGrow: 1 }} />

        {/* Firma + Footer: wrap=false para mantenerlos juntos */}
        <View wrap={false} style={pdfStyles.signatureSection}>
          <Text style={pdfStyles.signatureText}>
            {isUS ? "Send purchase order to " : "Enviar orden de compra a "}
            <Text style={{ color: "blue", textDecoration: "none" }}>{emailUsuario}</Text>
            {isUS ? " to the attention of " : " con atención a "}{nombreUsuario}.
          </Text>
          <Image style={pdfStyles.signatureImage} src={nombreUsuario.toLowerCase().includes("eduardo") ? "/eduardo_firma.png" : (nombreUsuario.toLowerCase().includes("santoyo") || nombreUsuario.toLowerCase().includes("jonh") || nombreUsuario.toLowerCase().includes("john")) ? "/santoyo.png" : "/firma_julio.png"} />
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureName}>{nombreUsuario}</Text>
          <Text style={pdfStyles.signatureJob}>{puestoUsuario}</Text>

          <View style={pdfStyles.footer}>
            <Text style={{ fontWeight: "bold" }}>{formData.proveedor.nombre}</Text>
            <Text>{formData.proveedor.direccion}, {formData.proveedor.colonia}, {formData.proveedor.ciudad}, C.P. {formData.proveedor.cp}</Text>
            <Text style={{ marginTop: 2 }}>www.sig.biz</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

/* ===================== Modal Vista Previa ===================== */

interface ModalVistaPreviaProps {
  isOpen: boolean;
  onClose: () => void;
  formData: CotizacionFormData;
  itemsServicio: ServicioTarifado[];
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[];
  tarifasCliente?: Record<string, number>;
}

const ModalVistaPrevia: React.FC<ModalVistaPreviaProps> = ({ isOpen, onClose, formData, itemsServicio, tarifas, folio, usuariosRegistrados, tarifasCliente = {} }) => {
  const t = useTranslations("NuevaCotizacion");

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let url = "";
    const renderPDF = async () => {
      try {
        const { pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(
          <CotizacionPDF
            formData={formData}
            itemsServicio={itemsServicio}
            aplicarIVA={true}
            tarifas={tarifas}
            folio={folio}
            usuariosRegistrados={usuariosRegistrados}
            tarifasCliente={tarifasCliente}
          />
        ).toBlob();
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (e) {
        console.error("PDF Render Error", e);
      }
    };
    renderPDF();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [isOpen, formData, itemsServicio, tarifas, folio, usuariosRegistrados]);

  const [correoGenerado, setCorreoGenerado] = useState("");
  const [generandoCorreo, setGenerandoCorreo] = useState(false);
  const folioParaIA = folio || "PENDIENTE DE ASIGNACIÓN";

  const [reporteTecnico, setReporteTecnico] = useState<File | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setReporteTecnico(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false });

  if (!isOpen) return null;

  const copiarAlPortapapeles = (texto: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => toast.success(t("toastCopied"))).catch(() => copiarFallback(texto));
    } else {
      copiarFallback(texto);
    }
  };

  const copiarFallback = (texto: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = texto;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); toast.success(t("toastCopied")); } catch (err) { toast.error(t("toastCopyError")); }
    document.body.removeChild(textArea);
  };

  const generarCorreo = async () => {
    setGenerandoCorreo(true);
    try {
      const subtotal = itemsServicio.reduce((sum, i) => sum + i.total, 0);
      const total = subtotal;

      const { data } = await api.post("/ia/generar-correo", {
        cliente: formData.facturarA.nombre,
        numeroCotizacion: folioParaIA,
        servicios: itemsServicio.map(i => {
          const t = tarifas.find(t => String(t.id) === i.tarifaId);
          return t ? t.concepto : "";
        }).join(", "),
        total: total.toFixed(2),
        moneda: formData.condiciones.moneda
      });
      if (data.result) setCorreoGenerado(data.result);
    } catch (e) {
      toast.error(t("toastAiError"));
    } finally {
      setGenerandoCorreo(false);
    }
  };

  const handleDownloadMerged = async () => {
    setIsMerging(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const quoteBlob = await pdf(
        <CotizacionPDF
          formData={formData}
          itemsServicio={itemsServicio}
          aplicarIVA={true}
          tarifas={tarifas}
          folio={folio}
          usuariosRegistrados={usuariosRegistrados}
          tarifasCliente={tarifasCliente}
        />
      ).toBlob();

      if (!reporteTecnico) {
        const url = URL.createObjectURL(quoteBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Cotizacion_${folio || 'Borrador'}.pdf`;
        link.click();
        setIsMerging(false);
        return;
      }

      const quoteArrayBuffer = await quoteBlob.arrayBuffer();
      const reportArrayBuffer = await reporteTecnico.arrayBuffer();
      const mergedPdf = await PDFDocument.create();
      const quotePdf = await PDFDocument.load(quoteArrayBuffer);
      const reportPdf = await PDFDocument.load(reportArrayBuffer);

      (await mergedPdf.copyPages(quotePdf, quotePdf.getPageIndices())).forEach(page => mergedPdf.addPage(page));
      (await mergedPdf.copyPages(reportPdf, reportPdf.getPageIndices())).forEach(page => mergedPdf.addPage(page));

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cotizacion_${folio || 'Borrador'}_FULL.pdf`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      toast.error(t("toastMergeError"));
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-row overflow-hidden border border-gray-200 dark:border-zinc-800">
        <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("previewTitle")}</h2>
            <div className="flex items-center gap-3">
              <button onClick={handleDownloadMerged} disabled={isMerging} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">
                {isMerging ? t("btnGenerating") : <><Download size={18} /> {reporteTecnico ? t("btnDownloadMerge") : t("btnDownload")}</>}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 dark:text-gray-400"><X size={24} /></button>
            </div>
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-zinc-950 relative">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Generando vista previa...</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-1/3 bg-gray-50 dark:bg-zinc-950 p-6 flex flex-col overflow-y-auto gap-8 border-l border-gray-200 dark:border-zinc-800">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3"><Paperclip size={16} className="text-blue-600 dark:text-blue-400" /> {t("attachReport")}</h3>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'}`}>
              <input {...getInputProps()} />
              {reporteTecnico ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium">
                  <FileCheck size={20} /><span className="text-sm truncate max-w-[200px]">{reporteTecnico.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); setReporteTecnico(null); }} className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full"><X size={14} /></button>
                </div>
              ) : (<div className="text-gray-500 dark:text-gray-400 text-xs"><p className="mb-1">{t("dragDrop")}</p><span className="text-blue-500 dark:text-blue-400 underline">{t("clickToBrowse")}</span></div>)}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">{t("mergeNote")}</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2"><Sparkles className="text-purple-600 dark:text-purple-400" /> {t("aiAssistant")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("aiAssistantDesc")}</p>
            <button onClick={generarCorreo} disabled={generandoCorreo} className="w-full py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 dark:hover:bg-purple-600 transition-all disabled:opacity-50">
              {generandoCorreo ? <span className="animate-pulse">{t("btnAiDrafting")}</span> : <><Mail size={18} /> {t("btnAiMail")}</>}
            </button>
            {correoGenerado && (
              <div className="mt-4 flex-1 flex flex-col animate-fadeIn">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t("aiDraftSuggested")}</label>
                <textarea className="w-full h-48 p-4 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" value={correoGenerado} readOnly />
                <button onClick={() => copiarAlPortapapeles(correoGenerado)} className="mt-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-zinc-800 flex justify-center items-center gap-2 transition-colors"><Copy size={16} /> {t("btnCopyText")}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ===================== Componente principal ===================== */

const NuevaCotizacionPage: React.FC = () => {
  const t = useTranslations("NuevaCotizacion");

  const [clientesDisponibles, setClientesDisponibles] = useState<ClientePredefinido[]>([]);
  const [usuariosRegistrados, setUsuariosRegistrados] = useState<UsuarioRegistrado[]>([]);
  const [tarifasDisponibles, setTarifasDisponibles] = useState<Tarifa[]>([]);
  const [folioGenerado, setFolioGenerado] = useState<string | null>(null);

  const [formData, setFormData] = useState<CotizacionFormData>({
    proveedor: { nombre: "SIG Combibloc México, S.A. de C.V.", direccion: "Av. Emilio Castelar No. 75", colonia: "Polanco IV Sección", ciudad: "Ciudad de México", cp: "11550" },
    facturarA: { nombre: "", direccion: "", colonia: "", ciudad: "", cp: "" },
    shipTo: { nombre: "", direccion: "", colonia: "", ciudad: "", cp: "" },
    shipToMismoQueFacturar: true,
    contactoPrincipal: { nombre: "", email: "", telefono: "" },
    contactoSecundario: { nombre: "", email: "", telefono: "" },
    condiciones: { precios: "Los precios cotizados no incluyen IVA", moneda: "USD", maquina: "", observaciones: "", entidad: "MX" },
    descripcion: "", // Init
    tipo_servicio: "TM",
  });

  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
  const [shipToSeleccionadoId, setShipToSeleccionadoId] = useState<string>("");
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<string>("");
  const [modoNuevoCliente, setModoNuevoCliente] = useState<boolean>(false);

  const [direccionesSoldTo, setDireccionesSoldTo] = useState<ClienteDireccion[]>([]);
  const [direccionesShipTo, setDireccionesShipTo] = useState<ClienteDireccion[]>([]);
  const [maquinasCliente, setMaquinasCliente] = useState<ClienteMaquina[]>([]);
  const [soldToSeleccionadoId, setSoldToSeleccionadoId] = useState<string>("");
  const [itemsServicio, setItemsServicio] = useState<ServicioTarifado[]>([{ id: 1, tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: 'init_1', nombre: '', horas: 0 }], }]);
  const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState<boolean>(false);

  const [mejorandoTexto, setMejorandoTexto] = useState(false);
  const [textoClienteSucio, setTextoClienteSucio] = useState("");
  const [extrayendoCliente, setExtrayendoCliente] = useState(false);

  // Client-specific contract rate overrides: { servicio_id: precio_contrato }
  const [tarifasCliente, setTarifasCliente] = useState<Record<string, number>>({});
  const clienteTieneContrato = Object.keys(tarifasCliente).length > 0;

  // Auto-recalculate items when overrides change
  useEffect(() => {
    setItemsServicio(prev => {
      let changed = false;
      const newItems = prev.map(item => {
        const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
        if (!tarifa) return item;

        const precioUnitario = item.esPrecioManual && item.precioManual !== undefined
          ? item.precioManual
          : (item.conContrato && tarifasCliente[item.tarifaId]
            ? tarifasCliente[item.tarifaId]
            : (item.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato));

        const expectedTotal = tarifa.requiere_desglose
          ? precioUnitario * item.cantidad
          : precioUnitario * item.ingenieros * item.cantidad;

        if (item.total !== expectedTotal) {
          changed = true;
          return { ...item, total: expectedTotal };
        }
        return item;
      });
      return changed ? newItems : prev;
    });
  }, [tarifasCliente, tarifasDisponibles]);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data } = await api.get('/clientes');
        const lista = Array.isArray(data) ? data : data.data || [];
        setClientesDisponibles(lista);
      } catch (error) {
        console.error("Error cargando clientes:", error);
      }
    };

    const fetchUsuarios = async () => {
      try {
        const { data } = await api.get('/usuarios');
        const lista = Array.isArray(data) ? data : data.data || [];
        setUsuariosRegistrados(lista);
      } catch (error) {
        console.error("Error cargando usuarios:", error);
      }
    };

    const fetchServicios = async () => {
      try {
        const { data } = await api.get('/servicios?region=MX');
        const lista: Tarifa[] = (Array.isArray(data) ? data : data.data || []).map((s: any) => ({
          id: s.id,
          concepto: s.concepto,
          unidad: s.unidad,
          precio_sin_contrato: Number(s.precio_sin_contrato),
          precio_con_contrato: Number(s.precio_con_contrato),
          moneda: s.moneda,
          requiere_desglose: s.concepto.toLowerCase().includes('viaje') || s.concepto.toLowerCase().includes('travel'),
          categoria: s.categoria || 'Servicio Técnico'
        }));
        setTarifasDisponibles(lista);
      } catch (error) {
        console.error("Error cargando servicios:", error);
      }
    };

    fetchClientes();
    fetchUsuarios();
    fetchServicios();
  }, []);

  // Re-fetch rates filtered by region when entity changes
  const fetchTarifasByRegion = async (region: string) => {
    try {
      const { data } = await api.get(`/servicios?region=${region}`);
      const lista: Tarifa[] = (Array.isArray(data) ? data : data.data || []).map((s: any) => ({
        id: s.id,
        concepto: s.concepto,
        unidad: s.unidad,
        precio_sin_contrato: Number(s.precio_sin_contrato),
        precio_con_contrato: Number(s.precio_con_contrato),
        moneda: s.moneda,
        requiere_desglose: s.concepto.toLowerCase().includes('viaje') || s.concepto.toLowerCase().includes('travel'),
        categoria: s.categoria || 'Servicio Técnico'
      }));
      setTarifasDisponibles(lista);
      // Reset service items since rates changed
      setItemsServicio([{ id: 1, tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: 'init_1', nombre: '', horas: 0 }] }]);
    } catch (error) {
      console.error("Error cargando servicios por región:", error);
    }
  };

  const handleInputChange = <K extends keyof CotizacionFormData>(seccion: K, campo: string, valor: any) => {
    setFormData((prev) => ({
      ...prev,
      [seccion]: { ...(prev[seccion] as Record<string, any> || {}), [campo]: valor }
    }));
  };

  const [loading, setLoading] = useState(false)

  const handleGuardar = async () => {
    try {
      setLoading(true)

      const itemsFormateados = itemsServicio.map(item => {
        const tarifa = tarifasDisponibles.find(t => String(t.id) === item.tarifaId)
        const precioUnitario = item.esPrecioManual && item.precioManual !== undefined
          ? item.precioManual
          : (item.conContrato && tarifasCliente[item.tarifaId]
            ? tarifasCliente[item.tarifaId]
            : (item.conContrato ? tarifa?.precio_con_contrato || 0 : tarifa?.precio_sin_contrato || 0));

        const cantidadReal = tarifa?.requiere_desglose
          ? item.cantidad
          : (item.cantidad * (item.ingenieros || 1));

        return {
          concepto: tarifa?.concepto || 'Servicio no especificado',
          cantidad: cantidadReal,
          precioUnitario: precioUnitario,
          total: item.total,
          detalles: item.detalles || "",
          desglose: item.desglose || [],
          ingenieros: item.ingenieros || 1
        }
      })

      const payload = {
        cliente_id: clienteSeleccionadoId === "nuevo" ? null : clienteSeleccionadoId,
        proveedor: formData.proveedor,
        facturarA: formData.facturarA,
        shipTo: formData.shipTo,
        shipToMismoQueFacturar: formData.shipToMismoQueFacturar,
        contactoPrincipal: formData.contactoPrincipal,
        contactoSecundario: formData.contactoSecundario,
        condiciones: formData.condiciones,
        itemsServicio: itemsFormateados,
        descripcion: formData.descripcion,
        tipo_servicio: formData.tipo_servicio,
        subtotal: itemsServicio.reduce((sum, i) => sum + i.total, 0),
        iva: 0,
        total: itemsServicio.reduce((sum, i) => sum + i.total, 0),
        estado: 'borrador',
        datos_forma: formData
      }
      const { data } = await api.post('/cotizaciones', payload);

      if (data.data && data.data.id) {
        const entidadPrefix = formData.condiciones.entidad || "MX";
        const nuevoFolio = `SIG-${entidadPrefix}-${data.data.id}`;
        setFolioGenerado(nuevoFolio);
        toast.success(t("toastSaveSuccess", { folio: nuevoFolio }));
      } else {
        toast.success(t("toastSaveBasic"));
      }

    } catch (error: any) {
      console.error('Error:', error)
      const mensajeError = error.response?.data?.message || error.message || 'Error desconocido';
      toast.error(t("toastSaveError"), { description: mensajeError });
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCliente = (value: string) => {
    if (value === "nuevo") {
      setModoNuevoCliente(true);
      setClienteSeleccionadoId("nuevo");
      setDireccionesSoldTo([]);
      setDireccionesShipTo([]);
      setMaquinasCliente([]);
      setSoldToSeleccionadoId("");
      setShipToSeleccionadoId("");
      setFormData((prev) => ({
        ...prev,
        facturarA: { nombre: "", direccion: "", colonia: "", ciudad: "", cp: "" },
        contactoSecundario: { nombre: "", email: "", telefono: "" },
      }));
      return;
    }

    setModoNuevoCliente(false);
    setClienteSeleccionadoId(value);

    // Fetch client-specific contract rates
    api.get(`/tarifas-cliente/${value}`).then(({ data }) => {
      const overrides: Record<string, number> = {};
      (data.data || []).forEach((tc: any) => {
        overrides[String(tc.servicio_id)] = Number(tc.precio_contrato);
      });
      setTarifasCliente(overrides);
    }).catch(() => setTarifasCliente({}));

    const cliente = clientesDisponibles.find((c) => String(c.id) === value);
    if (!cliente) return;

    const soldTo = cliente.cliente_direcciones?.filter(d => d.tipo === 'sold_to') || [];
    const shipTo = cliente.cliente_direcciones?.filter(d => d.tipo === 'ship_to') || [];
    const maquinas = cliente.cliente_maquinas || [];

    setDireccionesSoldTo(soldTo);
    setDireccionesShipTo(shipTo);
    setMaquinasCliente(maquinas);

    // Seleccionar el primero por defecto si existe
    const defaultSoldTo = soldTo[0];
    const defaultShipTo = shipTo[0];

    if (defaultSoldTo) {
      setSoldToSeleccionadoId(String(defaultSoldTo.id));
    } else {
      setSoldToSeleccionadoId("");
    }

    if (defaultShipTo) {
      setShipToSeleccionadoId(String(defaultShipTo.id));
    } else {
      setShipToSeleccionadoId("");
    }

    setFormData((prev) => ({
      ...prev,
      facturarA: {
        nombre: defaultSoldTo?.empresa_planta_nombre || cliente.nombre || "",
        direccion: defaultSoldTo?.direccion || cliente.direccion || "",
        colonia: defaultSoldTo?.colonia || cliente.colonia || "",
        ciudad: defaultSoldTo?.ciudad || cliente.ciudad || "",
        cp: defaultSoldTo?.cp || cliente.cp || "",
      },
      shipTo: {
        nombre: defaultShipTo?.empresa_planta_nombre || cliente.nombre || "",
        direccion: defaultShipTo?.direccion || cliente.direccion || "",
        colonia: defaultShipTo?.colonia || cliente.colonia || "",
        ciudad: defaultShipTo?.ciudad || cliente.ciudad || "",
        cp: defaultShipTo?.cp || cliente.cp || "",
      },
      contactoSecundario: {
        nombre: defaultSoldTo?.contacto_nombre || cliente.contacto_nombre || "",
        email: defaultSoldTo?.contacto_correo || cliente.correo || "",
        telefono: defaultSoldTo?.contacto_telefono || cliente.telefono || "",
      },
    }));
  };

  const handleSelectSoldTo = (value: string) => {
    setSoldToSeleccionadoId(value);
    const soldTo = direccionesSoldTo.find((d) => String(d.id) === value);
    if (soldTo) {
      setFormData(prev => {
        const newState = {
          ...prev,
          facturarA: {
            nombre: soldTo.empresa_planta_nombre || "",
            direccion: soldTo.direccion || "",
            colonia: soldTo.colonia || "",
            ciudad: soldTo.ciudad || "",
            cp: soldTo.cp || ""
          },
          contactoSecundario: {
            nombre: soldTo.contacto_nombre || "",
            email: soldTo.contacto_correo || "",
            telefono: soldTo.contacto_telefono || "",
          }
        };

        // Si shipToMismoQueFacturar es true, intentar encontrar un Ship To equivalente
        if (prev.shipToMismoQueFacturar) {
          const matchingShipTo = direccionesShipTo.find(d =>
            d.empresa_planta_nombre === soldTo.empresa_planta_nombre ||
            (d.ciudad === soldTo.ciudad && d.direccion === soldTo.direccion)
          );

          if (matchingShipTo) {
            setShipToSeleccionadoId(String(matchingShipTo.id));
            newState.shipTo = {
              nombre: matchingShipTo.empresa_planta_nombre || "",
              direccion: matchingShipTo.direccion || "",
              colonia: matchingShipTo.colonia || "",
              ciudad: matchingShipTo.ciudad || "",
              cp: matchingShipTo.cp || ""
            };
            newState.condiciones.maquina = ""; // Reset machine selection
          }
        }

        return newState;
      });
    }
  };

  const handleSelectShipTo = (value: string) => {
    setShipToSeleccionadoId(value);
    const shipTo = direccionesShipTo.find((d) => String(d.id) === value);

    // Reset machine selection when Ship To changes
    setFormData(prev => ({
      ...prev,
      condiciones: { ...prev.condiciones, maquina: "" }
    }));

    if (shipTo) {
      setFormData(prev => ({
        ...prev,
        shipTo: {
          nombre: shipTo.empresa_planta_nombre || "",
          direccion: shipTo.direccion || "",
          colonia: shipTo.colonia || "",
          ciudad: shipTo.ciudad || "",
          cp: shipTo.cp || ""
        }
      }));
    } else {
      const cliente = clientesDisponibles.find((c) => String(c.id) === value);
      if (cliente) {
        setFormData(prev => ({
          ...prev,
          shipTo: {
            nombre: cliente.nombre || "",
            direccion: cliente.direccion || "",
            colonia: cliente.colonia || "",
            ciudad: cliente.ciudad || "",
            cp: cliente.cp || ""
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          shipTo: { nombre: "", direccion: "", colonia: "", ciudad: "", cp: "" }
        }));
      }
    }
  }

  const toggleShipToMismo = () => {
    setFormData(prev => {
      const isNowMismo = !prev.shipToMismoQueFacturar;
      const newState = { ...prev, shipToMismoQueFacturar: isNowMismo };

      if (isNowMismo && soldToSeleccionadoId) {
        // Al encenderlo, buscar el Ship To que haga match con el Sold To actual
        const soldTo = direccionesSoldTo.find((d) => String(d.id) === soldToSeleccionadoId);
        if (soldTo) {
          const matchingShipTo = direccionesShipTo.find(d =>
            d.empresa_planta_nombre === soldTo.empresa_planta_nombre ||
            (d.ciudad === soldTo.ciudad && d.direccion === soldTo.direccion)
          ) || direccionesShipTo[0];

          if (matchingShipTo) {
            setShipToSeleccionadoId(String(matchingShipTo.id));
            newState.shipTo = {
              nombre: matchingShipTo.empresa_planta_nombre || "",
              direccion: matchingShipTo.direccion || "",
              colonia: matchingShipTo.colonia || "",
              ciudad: matchingShipTo.ciudad || "",
              cp: matchingShipTo.cp || ""
            };
            newState.condiciones.maquina = ""; // Reset machine if changing logic
          }
        }
      }
      return newState;
    });
  };

  const handleSelectUsuario = (value: string) => {
    setUsuarioSeleccionadoId(value);
    const usuario = usuariosRegistrados.find((u) => String(u.id) === value);
    if (usuario) {
      setFormData((prev) => ({
        ...prev,
        contactoPrincipal: {
          nombre: usuario.nombre || "",
          email: usuario.email || "",
          telefono: usuario.telefono || ""
        }
      }));
    }
  };

  const handleFacturarFieldChange = (campo: keyof FacturarA, valor: string) => { handleInputChange("facturarA", campo, valor); };

  const agregarLineaServicio = () => { setItemsServicio((prev) => [...prev, { id: Date.now(), tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: Date.now().toString(), nombre: '', horas: 0 }] },]); };

  const eliminarLineaServicio = (id: number) => { setItemsServicio((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev); };

  const actualizarLineaServicio = (id: number, campo: keyof Omit<ServicioTarifado, "total">, valor: any) => {
    setItemsServicio((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated: ServicioTarifado = { ...item };
      if (campo === "tarifaId") updated.tarifaId = String(valor);
      else if (campo === "conContrato") updated.conContrato = Boolean(valor);
      else if (campo === "detalles") updated.detalles = String(valor);
      else if (campo === "esPrecioManual") {
        updated.esPrecioManual = Boolean(valor);
        if (updated.esPrecioManual && updated.precioManual === undefined) {
          const t = tarifasDisponibles.find((x) => String(x.id) === updated.tarifaId);
          updated.precioManual = updated.conContrato && tarifasCliente[updated.tarifaId] ? tarifasCliente[updated.tarifaId] : (updated.conContrato ? t?.precio_con_contrato : t?.precio_sin_contrato);
        }
      }
      else if (campo === "precioManual") updated.precioManual = Number(valor);
      else {
        if (campo === "ingenieros") {
          updated.ingenieros = Number(valor) || 0;
        } else if (campo === "cantidad") {
          updated.cantidad = Number(valor) || 0;
        } else if (campo === "id") {
          updated.id = Number(valor) || updated.id;
        } else {
          (updated as any)[campo] = valor;
        }
      }

      const tarifa = tarifasDisponibles.find((t) => String(t.id) === updated.tarifaId);
      const requiereDesglose = tarifa?.requiere_desglose;

      if ((campo === "ingenieros" || campo === "tarifaId") && requiereDesglose) {
        const diff = updated.ingenieros - updated.desglose.length;
        if (diff > 0) { for (let i = 0; i < diff; i++) updated.desglose.push({ uid: Math.random().toString(), nombre: '', horas: 0 }); }
        else if (diff < 0) { updated.desglose = updated.desglose.slice(0, updated.ingenieros); }
      }
      if (tarifa) {
        // Use client-specific contract rate if available, otherwise generic
        let precioUnitario: number;
        if (updated.esPrecioManual && updated.precioManual !== undefined) {
          precioUnitario = updated.precioManual;
        } else if (updated.conContrato && tarifasCliente[updated.tarifaId]) {
          precioUnitario = tarifasCliente[updated.tarifaId];
        } else {
          precioUnitario = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
        }
        if (requiereDesglose) {
          const totalHoras = updated.desglose.reduce((acc, curr) => acc + curr.horas, 0);
          updated.cantidad = totalHoras;
          updated.total = precioUnitario * totalHoras;
        } else {
          updated.total = precioUnitario * updated.ingenieros * updated.cantidad;
        }
      } else { updated.total = 0; }
      return updated;
    })
    );
  };

  const actualizarDesglose = (itemId: number, indexDesglose: number, campo: 'nombre' | 'horas', valor: any) => {
    setItemsServicio(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const updated = { ...item };
      const nuevoDesglose = [...updated.desglose];
      nuevoDesglose[indexDesglose] = { ...nuevoDesglose[indexDesglose], [campo]: campo === 'horas' ? (Number(valor) || 0) : valor };
      updated.desglose = nuevoDesglose;

      const tarifa = tarifasDisponibles.find(t => String(t.id) === updated.tarifaId);
      if (tarifa && tarifa.requiere_desglose) {
        const totalHoras = nuevoDesglose.reduce((acc, curr) => acc + curr.horas, 0);
        updated.cantidad = totalHoras;

        // Use client-specific contract rate if available, otherwise generic
        let precioUnitario: number;
        if (updated.esPrecioManual && updated.precioManual !== undefined) {
          precioUnitario = updated.precioManual;
        } else if (updated.conContrato && tarifasCliente[updated.tarifaId]) {
          precioUnitario = tarifasCliente[updated.tarifaId];
        } else {
          precioUnitario = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
        }

        updated.total = precioUnitario * totalHoras;
      }
      return updated;
    }));
  }

  const mejorarObservaciones = async () => {
    const textoOriginal = formData.condiciones.observaciones;
    if (!textoOriginal || textoOriginal.length < 5) { toast.warning(t("toastTextShort"), { description: t("toastTextShortDesc") }); return; }
    setMejorandoTexto(true);
    try {
      const { data } = await api.post("/ia/mejorar-texto", { text: textoOriginal });
      if (data.result) handleInputChange("condiciones", "observaciones", data.result);
    } catch (error) { toast.error(t("toastImproveError")); } finally { setMejorandoTexto(false); }
  };

  const extraerDatosCliente = async () => {
    if (!textoClienteSucio) return;
    setExtrayendoCliente(true);
    try {
      const { data } = await api.post("/ia/extraer-cliente", { text: textoClienteSucio });
      if (data.result) {
        setFormData(prev => ({
          ...prev,
          facturarA: {
            nombre: data.result.nombre || "",
            direccion: data.result.direccion || "",
            colonia: data.result.colonia || "",
            ciudad: data.result.ciudad || "",
            cp: data.result.cp || ""
          }
        }));
        setTextoClienteSucio("");
        toast.success(t("toastExtractSuccess"));
      }
    } catch (error) { toast.error(t("toastExtractError")); } finally { setExtrayendoCliente(false); }
  }

  const subtotalServicios = itemsServicio.reduce((sum, i) => sum + i.total, 0);
  const totalServicios = subtotalServicios;

  // Filter machines by selected Ship To
  const maquinasFiltradas = useMemo(() => {
    if (!shipToSeleccionadoId || !maquinasCliente.length) return maquinasCliente;
    const idNum = Number(shipToSeleccionadoId);
    const filtradas = maquinasCliente.filter(m => m.direccion_id === idNum);
    // If no machines have direccion_id assigned, show all (backwards compatible)
    return filtradas.length > 0 ? filtradas : maquinasCliente;
  }, [maquinasCliente, shipToSeleccionadoId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-blue-600 dark:border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t("pageTitle")}</h1>
              <p className="text-gray-500 dark:text-gray-400">{t("pageSubtitle")}</p>
            </div>
            {/* --- AQUÍ ELIMINÉ EL BOTÓN DE VISTA PREVIA --- */}
          </div>
        </div>



        {/* Bloque de Identificación (Descripción) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <FileText className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {t("identTitle")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("identSubtitle")}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t("identLabel")}
              <span className="font-normal text-gray-400 ml-2">{t("identOptional")}</span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder={t("identPlaceholder")}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-amber-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex justify-between">
              <span>
                {t("identHelp")}
              </span>
              <span className={formData.descripcion.length > 100 ? 'text-red-400' : 'text-gray-400'}>
                {formData.descripcion.length}/120
              </span>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Entidad Emisora
            </label>
            <select
              value={formData.condiciones.entidad || 'MX'}
              onChange={(e) => {
                const val = e.target.value as "MX" | "US";
                const proveedorUS = { nombre: "SIG Combibloc Inc.", direccion: "2501 Seaport Drive - Suite 100", colonia: "", ciudad: "Chester, PA 19013", cp: "19013", rfc: "" };
                const proveedorMX = { nombre: "SIG Combibloc México, S.A. de C.V.", direccion: "Av. Emilio Castelar No. 75", colonia: "Polanco IV Sección", ciudad: "Ciudad de México", cp: "11550", rfc: "" };
                setFormData(prev => ({
                  ...prev,
                  condiciones: { ...prev.condiciones, entidad: val, moneda: val === "US" ? "USD" : prev.condiciones.moneda },
                  proveedor: val === "US" ? proveedorUS : proveedorMX
                }));
                // Re-fetch tarifas for the selected region
                fetchTarifasByRegion(val);
              }}
              className="premium-select w-full md:w-1/2 lg:w-1/3 px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:border-amber-500 focus:outline-none transition-colors"
            >
              <option value="MX">SIG MX (México)</option>
              <option value="US">SIG US (Estados Unidos)</option>
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              ({t("currency")}: {formData.condiciones.entidad === "US" ? "USD" : formData.condiciones.moneda})
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl"><Building2 className="text-blue-600 dark:text-blue-400" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("provTitle")}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{t("provSubtitle")}</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("companyName")}</label><input type="text" value={formData.proveedor.nombre} disabled className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-400 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("address")}</label><input type="text" value={formData.proveedor.direccion} disabled className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-400 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("neighborhood")}</label><input type="text" value={formData.proveedor.colonia} disabled className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-400 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("city")}</label><input type="text" value={formData.proveedor.ciudad} disabled className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-400 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("zipCode")}</label><input type="text" value={formData.proveedor.cp} disabled className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-400 cursor-not-allowed" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl"><User className="text-green-600 dark:text-green-400" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("billTitle")}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{t("billSubtitle")}</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("client")}</label>
              <select value={clienteSeleccionadoId} onChange={(e) => handleSelectCliente(e.target.value)} className="premium-select w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-zinc-800 focus:border-blue-500 focus:outline-none transition-colors">
                <option value="">{t("selectClient")}</option>
                {clientesDisponibles
                  .filter((c) => {
                    const isUS = formData.condiciones.entidad === "US" || formData.condiciones.entidad === "CA";
                    if (isUS) return c.pais === "US" || c.pais === "CA";
                    return c.pais === "MX" || !c.pais;
                  })
                  .map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                <option value="nuevo">{t("addNewClient")}</option>
              </select>
            </div>

            {direccionesSoldTo.length > 0 && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Facturar A (Sold To)</label>
                <select value={soldToSeleccionadoId} onChange={(e) => handleSelectSoldTo(e.target.value)} className="premium-select w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-zinc-800 focus:border-blue-500 focus:outline-none transition-colors">
                  <option value="">Seleccione Razón Social</option>
                  {direccionesSoldTo.map((d) => (
                    <option key={d.id} value={d.id}>{d.empresa_planta_nombre} - {d.ciudad}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {modoNuevoCliente && (
            <div className="mb-6 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 animate-fadeIn">
              <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2"><Wand2 size={16} /> {t("aiAutofill")}</h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">{t("aiAutofillDesc")}</p>
              <textarea
                value={textoClienteSucio}
                onChange={(e) => setTextoClienteSucio(e.target.value)}
                className="w-full p-3 text-sm border border-purple-200 dark:border-purple-800 dark:bg-zinc-800 dark:text-gray-200 rounded-lg mb-3 focus:outline-none focus:border-purple-500"
                placeholder={t("aiAutofillPlaceholder")}
                rows={3}
              />
              <button
                onClick={extraerDatosCliente}
                disabled={extrayendoCliente || !textoClienteSucio}
                className="bg-purple-600 dark:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-all disabled:opacity-50"
              >
                {extrayendoCliente ? t("aiAnalyzing") : t("aiExtract")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("clientName")}</label><input type="text" value={formData.facturarA.nombre} onChange={(e) => handleFacturarFieldChange("nombre", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("clientNamePlaceholder")} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("address")}</label><input type="text" value={formData.facturarA.direccion} onChange={(e) => handleFacturarFieldChange("direccion", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("addressPlaceholder")} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("neighborhood")}</label><input type="text" value={formData.facturarA.colonia} onChange={(e) => handleFacturarFieldChange("colonia", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("neighborhoodPlaceholder")} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("city")}</label><input type="text" value={formData.facturarA.ciudad} onChange={(e) => handleFacturarFieldChange("ciudad", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("cityPlaceholder")} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("zipCode")}</label><input type="text" value={formData.facturarA.cp} onChange={(e) => handleFacturarFieldChange("cp", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("zipPlaceholder")} /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl"><MapPin className="text-teal-600 dark:text-teal-400" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("shipTitle")}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{t("shipSubtitle")}</p></div>
          </div>
          <div className="mb-6 bg-teal-50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-900/30 flex items-center gap-3 transition-all hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer" onClick={toggleShipToMismo}>
            <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${formData.shipToMismoQueFacturar ? 'bg-teal-600 border-teal-600 dark:bg-teal-500 dark:border-teal-500' : 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600'}`}>{formData.shipToMismoQueFacturar && <CheckSquare size={16} className="text-white" />}</div>
            <span className="text-gray-700 dark:text-gray-300 font-semibold select-none">{t("shipSameAsBill")}</span>
          </div>
          {!formData.shipToMismoQueFacturar && (
            <div className="animate-fadeIn">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {direccionesShipTo.length > 0 ? "Seleccionar Planta (Ship To)" : t("shipSelectKnown")}
                </label>
                <select value={shipToSeleccionadoId} onChange={(e) => handleSelectShipTo(e.target.value)} className="premium-select w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-zinc-800 focus:border-teal-500 focus:outline-none transition-colors">
                  <option value="">{t("shipSelectPlaceholder")}</option>
                  {direccionesShipTo.length > 0
                    ? direccionesShipTo.map(d => (<option key={d.id} value={d.id}>{d.empresa_planta_nombre} - {d.ciudad}</option>))
                    : clientesDisponibles.map(c => (<option key={c.id} value={c.id}>{c.nombre} - {c.ciudad}</option>))
                  }
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("shipNamePlant")}</label><input type="text" value={formData.shipTo.nombre} onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, nombre: e.target.value } }))} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none transition-colors" placeholder={t("shipNamePlaceholder")} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("address")}</label><input type="text" value={formData.shipTo.direccion} onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, direccion: e.target.value } }))} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none transition-colors" placeholder={t("addressPlaceholder")} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("neighborhood")}</label><input type="text" value={formData.shipTo.colonia} onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, colonia: e.target.value } }))} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none transition-colors" placeholder={t("neighborhoodPlaceholder")} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("city")}</label><input type="text" value={formData.shipTo.ciudad} onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, ciudad: e.target.value } }))} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none transition-colors" placeholder={t("cityPlaceholder")} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("zipCode")}</label><input type="text" value={formData.shipTo.cp} onChange={(e) => setFormData(prev => ({ ...prev, shipTo: { ...prev.shipTo, cp: e.target.value } }))} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:outline-none transition-colors" placeholder={t("zipPlaceholder")} /></div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10"><Users size={100} className="dark:text-white" /></div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Users size={20} className="text-blue-600 dark:text-blue-400" />{t("requesterTitle")}</h3>
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">{t("selectRegistered")}</label>
              <select value={usuarioSeleccionadoId} onChange={(e) => handleSelectUsuario(e.target.value)} className="premium-select w-full px-4 py-2 border border-blue-200 dark:border-blue-900/30 rounded-lg text-gray-800 dark:text-white focus:border-blue-500 focus:outline-none bg-white dark:bg-zinc-800">
                <option value="">{t("selectUser")}</option>
                {usuariosRegistrados.map(user => (<option key={user.id} value={user.id}>{user.nombre} - {user.puesto}</option>))}
              </select>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("name")}</label><input type="text" value={formData.contactoPrincipal.nombre} onChange={(e) => handleInputChange("contactoPrincipal", "nombre", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-800'}`} placeholder={t("namePlaceholder")} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("email")}</label><input type="email" value={formData.contactoPrincipal.email} onChange={(e) => handleInputChange("contactoPrincipal", "email", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-800'}`} placeholder="correo@sig.biz" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("phone")}</label><input type="tel" value={formData.contactoPrincipal.telefono} onChange={(e) => handleInputChange("contactoPrincipal", "telefono", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-800'}`} placeholder="+52 55 1234 5678" /></div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t("secondaryContact")}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("name")}</label><input type="text" value={formData.contactoSecundario.nombre} onChange={(e) => handleInputChange("contactoSecundario", "nombre", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("namePlaceholder")} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("email")}</label><input type="email" value={formData.contactoSecundario.email} onChange={(e) => handleInputChange("contactoSecundario", "email", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="correo@cliente.com" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("phone")}</label><input type="tel" value={formData.contactoSecundario.telefono} onChange={(e) => handleInputChange("contactoSecundario", "telefono", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="+52 55 1234 5678" /></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl"><FileText className="text-purple-600 dark:text-purple-400" size={24} /></div><div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("serviceTitle")}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{t("serviceSubtitle")}</p></div></div>
            <button onClick={agregarLineaServicio} className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-md hover:shadow-lg">{t("addConcept")}</button>
          </div>
          <div className="space-y-6">
            {itemsServicio.map((item) => {
              // USAR TARIFAS DINÁMICAS
              const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
              const esViaje = tarifa?.requiere_desglose;

              return (
                <div key={item.id} className="border border-gray-200 dark:border-zinc-700 rounded-xl p-5 bg-gray-50 dark:bg-zinc-800/50 relative">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start mb-4">
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t("serviceConcept")}</label>
                      <select value={item.tarifaId} onChange={(e) => actualizarLineaServicio(item.id, "tarifaId", e.target.value)} className="premium-select w-full px-3 py-2 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none bg-white dark:bg-zinc-800">
                        <option value="">{t("selectRate")}</option>
                        {/* RENDERIZADO DINÁMICO POR TIPOS */}
                        <optgroup label="Servicio Técnico">
                          {tarifasDisponibles.filter(t => t.categoria === 'Servicio Técnico').map((t) => (<option key={t.id} value={t.id}>{t.concepto}</option>))}
                        </optgroup>
                        <optgroup label="Servicio de Ingeniería Aséptica">
                          {tarifasDisponibles.filter(t => t.categoria === 'Servicio de Ingeniería Aséptica').map((t) => (<option key={t.id} value={t.id}>{t.concepto}</option>))}
                        </optgroup>
                      </select>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t("numEngineers")}</label><input type="number" min={1} value={item.ingenieros} onChange={(e) => actualizarLineaServicio(item.id, "ingenieros", e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-center text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none bg-white dark:bg-zinc-800" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{tarifa?.unidad === "dia" ? t("totalDays") : t("totalHours")}</label><input type="number" min={1} value={item.cantidad} onChange={(e) => !esViaje && actualizarLineaServicio(item.id, "cantidad", e.target.value)} readOnly={!!esViaje} className={`w-full px-3 py-2 border-2 border-gray-200 dark:border-zinc-700 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none ${esViaje ? 'bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-400' : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white'}`} /></div>
                  </div>
                  {esViaje && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 p-4 rounded-lg animate-fadeIn">
                      <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2"><Users size={16} /> {t("breakdownTitle")}</h4>
                      <div className="space-y-2">{item.desglose.map((d, idx) => (<div key={idx} className="flex flex-col sm:flex-row gap-3 items-center"><span className="text-xs font-bold text-blue-500 dark:text-blue-400 w-8">#{idx + 1}</span><div className="flex-1 w-full"><input type="text" placeholder={t("engineerNamePlaceholder", { num: idx + 1 })} value={d.nombre} onChange={(e) => actualizarDesglose(item.id, idx, 'nombre', e.target.value)} className="w-full px-3 py-2 border border-blue-200 dark:border-blue-900/30 dark:bg-zinc-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-blue-300 outline-none" /></div><div className="w-full sm:w-32 flex items-center gap-2"><input type="number" placeholder={t("hoursPlaceholder")} value={d.horas} onChange={(e) => actualizarDesglose(item.id, idx, 'horas', e.target.value)} className="w-full px-3 py-2 border border-blue-200 dark:border-blue-900/30 dark:bg-zinc-900 dark:text-white rounded text-center font-bold text-sm focus:ring-2 focus:ring-blue-300 outline-none" /><span className="text-xs text-gray-500 dark:text-gray-400">{t("hrs")}</span></div></div>))}</div>
                      <div className="mt-3 text-right text-xs font-bold text-blue-700 dark:text-blue-300">{t("totalHoursSum")}: {item.cantidad}</div>
                    </div>
                  )}
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-center justify-between pt-3 border-t border-gray-200 dark:border-zinc-700 mt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("type")}</span>
                      <label className="inline-flex items-center gap-1 text-sm cursor-pointer text-gray-700 dark:text-gray-300"><input type="radio" className="accent-blue-600" checked={item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", true)} /> {t("withContract")}</label>
                      <label className="inline-flex items-center gap-1 text-sm cursor-pointer text-gray-700 dark:text-gray-300"><input type="radio" className="accent-blue-600" checked={!item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", false)} /> {t("withoutContract")}</label>
                      
                      <div className="flex items-center bg-gray-100 dark:bg-zinc-800/50 rounded-lg p-1 ml-2">
                        <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${item.esPrecioManual ? 'bg-white text-blue-600 dark:bg-zinc-700 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-zinc-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-transparent'}`}>
                          <input type="checkbox" className="sr-only" checked={!!item.esPrecioManual} onChange={(e) => actualizarLineaServicio(item.id, "esPrecioManual", e.target.checked)} /> 
                          {item.esPrecioManual ? <Edit2 size={14} /> : null} Precio Manual
                        </label>
                      </div>
                      
                      {item.esPrecioManual && (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                          <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">$</span>
                          <input type="number" min={0} step="0.01" value={item.precioManual !== undefined ? item.precioManual : (item.conContrato && tarifa && tarifasCliente[tarifa.id] ? tarifasCliente[tarifa.id] : (item.conContrato ? tarifa?.precio_con_contrato : tarifa?.precio_sin_contrato))} onChange={(e) => actualizarLineaServicio(item.id, "precioManual", Number(e.target.value))} className="w-24 text-sm font-bold bg-transparent text-blue-900 dark:text-white outline-none placeholder-blue-300 dark:placeholder-blue-700" />
                        </div>
                      )}

                      {tarifa && !item.esPrecioManual && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">
                          (${(item.conContrato && tarifasCliente[tarifa.id] ? tarifasCliente[tarifa.id] : (item.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato)).toFixed(2)} / {tarifa.unidad})
                          {item.conContrato && tarifasCliente[tarifa.id] && <span className="ml-1 text-blue-500 font-bold">(Tarifa Especial)</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex flex-col items-end"><span className="text-xs text-gray-500 dark:text-gray-400">{t("lineTotal")}</span><span className="text-xl font-bold text-gray-800 dark:text-white">${item.total.toFixed(2)} USD</span></div>
                      {itemsServicio.length > 1 && (<button onClick={() => eliminarLineaServicio(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t("deleteConcept")}><Trash2 size={20} /></button>)}
                    </div>
                  </div>
                  {!esViaje && (<div className="mt-3"><input type="text" placeholder={t("additionalDetails")} value={item.detalles} onChange={(e) => actualizarLineaServicio(item.id, "detalles", e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded text-sm bg-white dark:bg-zinc-800 dark:text-white focus:border-blue-500 outline-none" /></div>)}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 min-w-[300px] shadow-inner border border-blue-100 dark:border-blue-900/20">
              <div className="flex items-center justify-between mb-2"><span className="text-gray-600 dark:text-gray-400 font-medium">{t("subtotal")}</span><span className="text-gray-800 dark:text-white font-semibold">${subtotalServicios.toFixed(2)} USD</span></div>
              <div className="border-t-2 border-blue-200 dark:border-blue-900/30 pt-3 mt-3"><div className="flex items-center justify-between"><span className="text-xl font-bold text-gray-800 dark:text-white">{t("total")}</span><span className="text-2xl font-bold text-blue-600 dark:text-blue-400">${subtotalServicios.toFixed(2)} USD</span></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl"><Calculator className="text-orange-600 dark:text-orange-400" size={24} /></div><div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("conditionsTitle")}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{t("conditionsSubtitle")}</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formData.condiciones.entidad !== "US" ? (
              <>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("priceNote")}</label><input type="text" value={formData.condiciones.precios} onChange={(e) => handleInputChange("condiciones", "precios", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t("priceNotePlaceholder")} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("currency")}</label><select value={formData.condiciones.moneda} onChange={(e) => handleInputChange("condiciones", "moneda", e.target.value)} className="premium-select w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"><option value="USD">USD</option><option value="MXN">MXN</option><option value="EUR">EUR</option></select></div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scope of visit</label>
                  <input type="text" value={formData.condiciones.scopeOfVisit || ""} onChange={(e) => handleInputChange("condiciones", "scopeOfVisit", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Enter scope of visit..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Equipment to be Serviced</label>
                  <input type="text" value={formData.condiciones.equipmentToService || ""} onChange={(e) => handleInputChange("condiciones", "equipmentToService", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Enter equipment details..." />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("machine")}</label>
              {maquinasFiltradas.length > 0 ? (
                <MachineCombobox
                  value={formData.condiciones.maquina}
                  onChange={(val) => handleInputChange("condiciones", "maquina", val)}
                  machines={maquinasFiltradas}
                  placeholder={shipToSeleccionadoId ? "Buscar máquina de esta planta..." : "Selecciona un Ship To para filtrar máquinas..."}
                />
              ) : (
                <textarea rows={2} value={formData.condiciones.maquina} onChange={(e) => handleInputChange("condiciones", "maquina", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder={formData.condiciones.entidad === "US" ? "CFA 406-32\n850451014" : t("machinePlaceholder")} />
              )}
              {shipToSeleccionadoId && maquinasFiltradas.length > 0 && (
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block"></span>
                  Mostrando {maquinasFiltradas.length} máquina{maquinasFiltradas.length !== 1 ? 's' : ''} de la planta seleccionada
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t("observations")}</label>
                <button onClick={mejorarObservaciones} disabled={mejorandoTexto} className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full transition-all font-bold ${mejorandoTexto ? "bg-purple-100 dark:bg-purple-900/30 text-purple-400 cursor-wait" : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 hover:scale-105"}`}>
                  <Sparkles size={14} /> {mejorandoTexto ? t("improvingText") : t("improveAI")}
                </button>
              </div>
              <textarea rows={4} value={formData.condiciones.observaciones} onChange={(e) => handleInputChange("condiciones", "observaciones", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-colors resize-none" placeholder={t("observationsPlaceholder")} />
            </div>

            {formData.condiciones.entidad === "US" && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
                  <input type="text" value={formData.condiciones.paymentTerms || ""} onChange={(e) => handleInputChange("condiciones", "paymentTerms", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Enter payment terms..." />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex justify-end gap-4 mt-6">
          <button className="px-6 py-3 border-2 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all font-semibold">
            {t("btnCancel")}
          </button>
          {/* ✅ NUEVA UBICACIÓN DEL BOTÓN DE VISTA PREVIA */}
          <button
            onClick={() => setModalVistaPreviaAbierto(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            <Eye size={20} /> {t("btnPreview")}
          </button>

          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {loading ? t("btnSaving") : t("btnSave")}
          </button>
        </div>
      </div>

      {/* Modal Vista Previa */}
      <ModalVistaPrevia
        isOpen={modalVistaPreviaAbierto}
        onClose={() => setModalVistaPreviaAbierto(false)}
        formData={formData}
        itemsServicio={itemsServicio}
        tarifas={tarifasDisponibles} // PASAMOS LAS TARIFAS DINÁMICAS
        folio={folioGenerado}
        usuariosRegistrados={usuariosRegistrados}
        tarifasCliente={tarifasCliente}
      />
    </div>
  );
};

export default NuevaCotizacionPage;