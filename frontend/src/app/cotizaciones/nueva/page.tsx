"use client";
import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import { pdf } from "@react-pdf/renderer";
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
} from "lucide-react";

import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink, 
  PDFViewer, 
  Image 
} from "@react-pdf/renderer";
import dynamic from "next/dynamic";

const PDFViewerDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <p>Cargando visor...</p> }
);

const PDFDownloadLinkDynamic = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <p>Preparando...</p> }
);

/* ===================== Tipos ===================== */

interface Proveedor { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; rfc?: string; }
interface FacturarA { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface ShipTo { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface Contacto { nombre: string; email: string; telefono: string; }
interface Condiciones { precios: string; moneda: string; maquina: string; observaciones: string; }
interface CotizacionFormData { proveedor: Proveedor; facturarA: FacturarA; shipTo: ShipTo; shipToMismoQueFacturar: boolean; contactoPrincipal: Contacto; contactoSecundario: Contacto; condiciones: Condiciones; }
interface ClientePredefinido {
  id: string | number;
  nombre: string;
  empresa?: string;
  contacto_nombre?: string; // ✅
  correo?: string;
  telefono?: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  cp: string;
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
}

interface DesgloseIngeniero { uid: string; nombre: string; horas: number; }
interface ServicioTarifado { id: number; tarifaId: string; ingenieros: number; cantidad: number; conContrato: boolean; detalles?: string; desglose: DesgloseIngeniero[]; total: number; }

/* ===================== Estilos PDF ===================== */

const pdfStyles = StyleSheet.create({
  page: { 
    padding: 35, 
    fontSize: 10, 
    fontFamily: "Helvetica",
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 15, 
    paddingBottom: 10, 
    borderBottom: "2px solid #2563eb", 
    alignItems: 'center'
  },
  logo: { 
    width: 60, 
    height: 60, 
    marginBottom: 5, 
    objectFit: "contain" 
  },
  companyName: { 
    fontSize: 13, 
    fontWeight: "bold" 
  },
  headerRight: { 
    textAlign: "right" 
  },
  section: { 
    marginBottom: 10, 
  },
  sectionTitle: { 
    fontSize: 9, 
    fontWeight: "bold", 
    backgroundColor: "#f3f4f6", 
    padding: 4, 
    marginBottom: 4 
  },
  row: { 
    flexDirection: "row", 
    marginBottom: 10 
  },
  column: { 
    flex: 1, 
    marginRight: 10 
  },
  label: { 
    fontSize: 8, 
    fontWeight: "bold", 
    marginBottom: 2 
  },
  value: { 
    fontSize: 9, 
    marginBottom: 2,
    lineHeight: 1.3 
  },
  // Estilos de Tabla
  table: { marginTop: 10, marginBottom: 15 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: 5, fontWeight: "bold", fontSize: 8 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #e5e7eb", padding: 5, fontSize: 8 },
  
  colDesc: { flex: 2 }, 
  colTiny: { width: 35, textAlign: "center" }, 
  colSmall: { width: 55, textAlign: "center" }, 

  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#dbeafe", padding: 6, marginTop: 4, fontWeight: "bold", fontSize: 9 },
  footer: { position: "absolute", bottom: 30, left: 35, right: 35, textAlign: "center", fontSize: 8, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 8 },
  signatureSection: { marginTop: 20, marginBottom: 10 },
  signatureText: { fontSize: 9, marginBottom: 5, color: "#000", lineHeight: 1.3 },
  signatureImage: { width: 100, height: 50, objectFit: "contain", marginLeft: 0, marginBottom: 0 },
  signatureLine: { borderBottom: "1px solid #000", width: 180, marginTop: 5, marginBottom: 4 },
  signatureName: { fontSize: 9, fontWeight: "bold" },
  signatureJob: { fontSize: 9, fontWeight: "bold" }
});

/* ===================== Componente PDF ===================== */

interface CotizacionPDFProps {
  formData: CotizacionFormData;
  itemsServicio: ServicioTarifado[];
  aplicarIVA: boolean;
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[]; 
}

const CotizacionPDF: React.FC<CotizacionPDFProps> = ({ formData, itemsServicio, aplicarIVA, tarifas, folio, usuariosRegistrados }) => {
  const subtotal = itemsServicio.reduce((sum, i) => sum + i.total, 0);
  const iva = aplicarIVA ? subtotal * 0.16 : 0;
  const total = subtotal + iva;
  const fecha = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  
  const shipToData = formData.shipToMismoQueFacturar ? formData.facturarA : formData.shipTo;
  
  const puestoUsuario = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email)?.puesto || "Coordinador de Servicio Técnico";
  const displayFolio = folio ? folio : "BORRADOR";

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
                <Text style={{ fontWeight: "bold" }}>COTIZACIÓN No: </Text>
                {displayFolio}
            </Text>
            <Text style={{ fontSize: 9 }}><Text style={{ fontWeight: "bold" }}>FECHA: </Text>{fecha}</Text>
          </View>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>PROVEEDOR:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.proveedor.nombre}</Text>
            <Text style={pdfStyles.value}>{formData.proveedor.direccion}</Text>
            <Text style={pdfStyles.value}>{formData.proveedor.ciudad}, C.P. {formData.proveedor.cp}</Text>
            {formData.proveedor.rfc && <Text style={pdfStyles.value}>RFC: {formData.proveedor.rfc}</Text>}
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.sectionTitle}>FACTURAR A (SOLD TO):</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.facturarA.nombre || "No especificado"}</Text>
            <Text style={pdfStyles.value}>{formData.facturarA.direccion || "No especificado"}</Text>
            <Text style={pdfStyles.value}>{formData.facturarA.colonia || "No especificado"}</Text>
            <Text style={pdfStyles.value}>{formData.facturarA.ciudad || "No especificado"}{formData.facturarA.cp ? `, C.P. ${formData.facturarA.cp}` : ""}</Text>
          </View>
        </View>

        <View style={pdfStyles.row}>
             <View style={pdfStyles.column}>
                <Text style={pdfStyles.sectionTitle}>LUGAR DEL SERVICIO (SHIP TO):</Text>
                <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{shipToData.nombre || "No especificado"}</Text>
                <Text style={pdfStyles.value}>{shipToData.direccion || ""}</Text>
                <Text style={pdfStyles.value}>{shipToData.colonia || ""}</Text>
                <Text style={pdfStyles.value}>{shipToData.ciudad || ""}{shipToData.cp ? `, C.P. ${shipToData.cp}` : ""}</Text>
             </View>
        </View>

        <View style={pdfStyles.row}>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>De:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.contactoPrincipal.nombre || "No especificado"}</Text>
            <Text style={pdfStyles.value}>E-mail: {formData.contactoPrincipal.email || "No especificado"}</Text>
            <Text style={pdfStyles.value}>Tel: {formData.contactoPrincipal.telefono || "No especificado"}</Text>
          </View>
          <View style={pdfStyles.column}>
            <Text style={pdfStyles.label}>Contacto:</Text>
            <Text style={[pdfStyles.value, { fontWeight: "bold" }]}>{formData.contactoSecundario.nombre || "No especificado"}</Text>
            <Text style={pdfStyles.value}>E-mail: {formData.contactoSecundario.email || "No especificado"}</Text>
            <Text style={pdfStyles.value}>Tel: {formData.contactoSecundario.telefono || "No especificado"}</Text>
          </View>
        </View>

        {/* Tabla */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>Detalle</Text>
            <Text style={pdfStyles.colTiny}>Ing.</Text>
            <Text style={pdfStyles.colSmall}>Cant.</Text>
            <Text style={pdfStyles.colSmall}>P. Unit.</Text>
            <Text style={pdfStyles.colSmall}>Total</Text>
          </View>
          
          {itemsServicio.map((item) => {
            const tarifa = tarifas.find((t) => String(t.id) === item.tarifaId);
            const precioUnitario = item.conContrato
              ? tarifa?.precio_con_contrato || 0
              : tarifa?.precio_sin_contrato || 0;

            const numIngenieros = tarifa?.requiere_desglose && item.desglose && item.desglose.length > 0 
                ? item.desglose.length 
                : (item.ingenieros || 1);

            return (
              <View key={item.id} style={pdfStyles.tableRow}>
                <View style={pdfStyles.colDesc}>
                  <Text>{tarifa?.concepto || "No especificado"}</Text>
                  
                  {tarifa?.requiere_desglose && item.desglose.length > 0 && item.desglose.map((d, idx) => (
                      <Text key={idx} style={{ fontSize: 7, color: "#4b5563", marginLeft: 4, marginTop: 1 }}>• {d.nombre || `Ing. ${idx + 1}`}: {d.horas}h</Text>
                  ))}
                  
                  {item.detalles && <Text style={{ fontSize: 7, color: "#6b7280", marginTop: 1, fontStyle: 'italic' }}>Nota: {item.detalles}</Text>}
                </View>
                
                <Text style={pdfStyles.colTiny}>{numIngenieros}</Text>
                <Text style={pdfStyles.colSmall}>{item.cantidad}</Text>
                <Text style={pdfStyles.colSmall}>${precioUnitario.toFixed(2)}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>${item.total.toFixed(2)}</Text>
              </View>
            );
          })}

          <View style={pdfStyles.total}>
            <Text>Subtotal:</Text>
            <Text>${subtotal.toFixed(2)} {formData.condiciones.moneda}</Text>
          </View>

          {aplicarIVA && (
            <View style={[pdfStyles.total, { backgroundColor: "#f3f4f6" }]}>
              <Text>IVA (16%):</Text>
              <Text>${iva.toFixed(2)} {formData.condiciones.moneda}</Text>
            </View>
          )}

          <View style={[pdfStyles.total, { backgroundColor: "#dbeafe", fontSize: 9 }]}>
            <Text>TOTAL:</Text>
            <Text>${total.toFixed(2)} {formData.condiciones.moneda}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.label}>Condiciones Generales:</Text>
          <Text style={pdfStyles.value}>
            <Text style={{ fontWeight: "bold" }}>Precios: </Text>{formData.condiciones.precios} | <Text style={{ fontWeight: "bold" }}>Moneda: </Text>{formData.condiciones.moneda}
            {formData.condiciones.maquina && <Text> | <Text style={{ fontWeight: "bold" }}>Máquina: </Text>{formData.condiciones.maquina}</Text>}
          </Text>
        </View>

        {formData.condiciones.observaciones && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.label}>Observaciones:</Text>
            <Text style={pdfStyles.value}>{formData.condiciones.observaciones}</Text>
          </View>
        )}

        <View style={pdfStyles.signatureSection}>
          <Text style={pdfStyles.signatureText}>
            Enviar orden de compra a <Text style={{ color: "blue", textDecoration: "none" }}>{emailUsuario}</Text> con atención a {nombreUsuario}.
          </Text>
          <Image style={pdfStyles.signatureImage} src="/firma_julio.png" />
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureName}>{nombreUsuario}</Text>
          <Text style={pdfStyles.signatureJob}>{puestoUsuario}</Text>
        </View>

        <View style={pdfStyles.footer}>
          <Text style={{ fontWeight: "bold" }}>{formData.proveedor.nombre}</Text>
          <Text>{formData.proveedor.direccion}, {formData.proveedor.colonia}, {formData.proveedor.ciudad}, C.P. {formData.proveedor.cp}</Text>
          <Text style={{ marginTop: 2 }}>www.sig.biz</Text>
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
  aplicarIVA: boolean;
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[]; 
}

const ModalVistaPrevia: React.FC<ModalVistaPreviaProps> = ({ isOpen, onClose, formData, itemsServicio, aplicarIVA, tarifas, folio, usuariosRegistrados }) => {
  if (!isOpen) return null;

  const [correoGenerado, setCorreoGenerado] = useState("");
  const [generandoCorreo, setGenerandoCorreo] = useState(false);
  const folioParaIA = folio || "PENDIENTE DE ASIGNACIÓN";

  const [reporteTecnico, setReporteTecnico] = useState<File | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setReporteTecnico(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false });

  const copiarAlPortapapeles = (texto: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(() => alert("Copiado")).catch(() => copiarFallback(texto));
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
    try { document.execCommand('copy'); alert("Copiado"); } catch (err) { alert("No se pudo copiar."); }
    document.body.removeChild(textArea);
  };

  const generarCorreo = async () => {
    setGenerandoCorreo(true);
    try {
        const subtotal = itemsServicio.reduce((sum, i) => sum + i.total, 0);
        const total = subtotal * (aplicarIVA ? 1.16 : 1);
        
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
        if(data.result) setCorreoGenerado(data.result);
    } catch (e) {
        alert("Error generando correo con IA");
    } finally {
        setGenerandoCorreo(false);
    }
  };

  const handleDownloadMerged = async () => {
    setIsMerging(true);
    try {
        const quoteBlob = await pdf(
            <CotizacionPDF 
                formData={formData} 
                itemsServicio={itemsServicio} 
                aplicarIVA={aplicarIVA} 
                tarifas={tarifas} 
                folio={folio}
                usuariosRegistrados={usuariosRegistrados} 
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
        alert("Error al fusionar PDFs.");
    } finally {
        setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-row overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Vista Previa</h2>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadMerged} disabled={isMerging} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">
                        {isMerging ? "Generando PDF..." : <><Download size={18} /> {reporteTecnico ? "Descargar Cotización + Reporte" : "Descargar PDF"}</>}
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
                </div>
            </div>
            <div className="flex-1 bg-gray-100">
                <PDFViewerDynamic width="100%" height="100%" className="border-0">
                    <CotizacionPDF formData={formData} itemsServicio={itemsServicio} aplicarIVA={aplicarIVA} tarifas={tarifas} folio={folio} usuariosRegistrados={usuariosRegistrados} />
                </PDFViewerDynamic>
            </div>
        </div>
        <div className="w-1/3 bg-gray-50 p-6 flex flex-col overflow-y-auto gap-8">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><Paperclip size={16} className="text-blue-600"/> Anexar Reporte Técnico (TSR)</h3>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
                    <input {...getInputProps()} />
                    {reporteTecnico ? (
                        <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                            <FileCheck size={20} /><span className="text-sm truncate max-w-[200px]">{reporteTecnico.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); setReporteTecnico(null); }} className="ml-2 p-1 hover:bg-red-100 text-red-500 rounded-full"><X size={14}/></button>
                        </div>
                    ) : ( <div className="text-gray-500 text-xs"><p className="mb-1">Arrastra tu PDF aquí</p><span className="text-blue-500 underline">o haz clic para buscar</span></div> )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">Se unirá automáticamente al final de la cotización al descargar.</p>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2"><Sparkles className="text-purple-600" /> Asistente de Envío</h3>
                <p className="text-sm text-gray-500 mb-4">Genera un correo profesional para acompañar este PDF.</p>
                <button onClick={generarCorreo} disabled={generandoCorreo} className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex justify-center items-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50">
                    {generandoCorreo ? <span className="animate-pulse">Redactando...</span> : <><Mail size={18}/> Generar Correo con IA</>}
                </button>
                {correoGenerado && (
                    <div className="mt-4 flex-1 flex flex-col animate-fadeIn">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1">Borrador sugerido:</label>
                        <textarea className="w-full h-48 p-4 border rounded-xl text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" value={correoGenerado} readOnly />
                        <button onClick={() => copiarAlPortapapeles(correoGenerado)} className="mt-3 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-white flex justify-center items-center gap-2"><Copy size={16}/> Copiar Texto</button>
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
    condiciones: { precios: "Los precios cotizados no incluyen IVA", moneda: "USD", maquina: "", observaciones: "" },
  });

  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
  const [shipToSeleccionadoId, setShipToSeleccionadoId] = useState<string>(""); 
  const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<string>(""); 
  const [modoNuevoCliente, setModoNuevoCliente] = useState<boolean>(false);
  const [itemsServicio, setItemsServicio] = useState<ServicioTarifado[]>([{ id: 1, tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: 'init_1', nombre: '', horas: 0 }], },]);
  const [aplicarIVA, setAplicarIVA] = useState<boolean>(true);
  const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState<boolean>(false);
  
  const [mejorandoTexto, setMejorandoTexto] = useState(false);
  const [textoClienteSucio, setTextoClienteSucio] = useState("");
  const [extrayendoCliente, setExtrayendoCliente] = useState(false);

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
        const { data } = await api.get('/servicios');
        const lista: Tarifa[] = (Array.isArray(data) ? data : data.data || []).map((s: any) => ({
             id: s.id,
             concepto: s.concepto,
             unidad: s.unidad,
             precio_sin_contrato: Number(s.precio_sin_contrato),
             precio_con_contrato: Number(s.precio_con_contrato),
             moneda: s.moneda,
             requiere_desglose: s.concepto.toLowerCase().includes('viaje') 
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
        const precioUnitario = item.conContrato
          ? tarifa?.precio_con_contrato || 0
          : tarifa?.precio_sin_contrato || 0

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
        aplicarIVA,
        subtotal: itemsServicio.reduce((sum, i) => sum + i.total, 0),
        iva: (itemsServicio.reduce((sum, i) => sum + i.total, 0)) * (aplicarIVA ? 0.16 : 0),
        total: (itemsServicio.reduce((sum, i) => sum + i.total, 0)) * (aplicarIVA ? 1.16 : 1),
        estado: 'borrador'
      }
      const { data } = await api.post('/cotizaciones', payload);
      
      if (data.data && data.data.id) {
          const nuevoFolio = `SIG-${data.data.id}`; 
          setFolioGenerado(nuevoFolio);
          alert(`✅ Cotización guardada exitosamente. Folio asignado: ${nuevoFolio}`);
      } else {
          alert(`✅ Cotización guardada.`);
      }

    } catch (error: any) {
      console.error('Error:', error)
      const mensajeError = error.response?.data?.message || error.message || 'Error desconocido';
      alert('❌ Error al guardar la cotización: ' + mensajeError)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCliente = (value: string) => {
  if (value === "nuevo") {
    setModoNuevoCliente(true);
    setClienteSeleccionadoId("nuevo");
    setFormData((prev) => ({
      ...prev,
      facturarA: { nombre: "", direccion: "", colonia: "", ciudad: "", cp: "" },
      contactoSecundario: { nombre: "", email: "", telefono: "" },
    }));
    return;
  }

  setModoNuevoCliente(false);
  setClienteSeleccionadoId(value);

  const cliente = clientesDisponibles.find((c) => String(c.id) === value);
  if (!cliente) return;

  setFormData((prev) => ({
    ...prev,
    facturarA: {
      nombre: cliente.nombre || "",
      direccion: cliente.direccion || "",
      colonia: cliente.colonia || "",
      ciudad: cliente.ciudad || "",
      cp: cliente.cp || "",
    },
    contactoSecundario: {
      // ✅ aquí el cambio:
      nombre: (cliente as any).contacto_nombre || "", // o cliente.contacto_nombre si ya lo tienes tipado
      email: cliente.correo || "",
      telefono: cliente.telefono || "",
    },
  }));
};


  const handleSelectShipTo = (value: string) => {
      setShipToSeleccionadoId(value);
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

  const toggleShipToMismo = () => { setFormData(prev => ({ ...prev, shipToMismoQueFacturar: !prev.shipToMismoQueFacturar })); };

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

  const agregarLineaServicio = () => { setItemsServicio((prev) => [ ...prev, { id: Date.now(), tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: Date.now().toString(), nombre: '', horas: 0 }] }, ]); };

  const eliminarLineaServicio = (id: number) => { setItemsServicio((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev ); };

  const actualizarLineaServicio = (id: number, campo: keyof Omit<ServicioTarifado, "total">, valor: any) => {
    setItemsServicio((prev) => prev.map((item) => {
        if (item.id !== id) return item;
        const updated: ServicioTarifado = { ...item };
        if (campo === "tarifaId") updated.tarifaId = String(valor);
        else if (campo === "conContrato") updated.conContrato = Boolean(valor);
        else if (campo === "detalles") updated.detalles = String(valor);
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
             if (diff > 0) { for(let i = 0; i < diff; i++) updated.desglose.push({ uid: Math.random().toString(), nombre: '', horas: 0 }); } 
             else if (diff < 0) { updated.desglose = updated.desglose.slice(0, updated.ingenieros); }
        }
        if (tarifa) {
          const precioUnitario = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
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
          if(item.id !== itemId) return item;
          const updated = { ...item };
          const nuevoDesglose = [...updated.desglose];
          nuevoDesglose[indexDesglose] = { ...nuevoDesglose[indexDesglose], [campo]: campo === 'horas' ? (Number(valor) || 0) : valor };
          updated.desglose = nuevoDesglose;
          
          const tarifa = tarifasDisponibles.find(t => String(t.id) === updated.tarifaId);
          if (tarifa && tarifa.requiere_desglose) {
              const totalHoras = nuevoDesglose.reduce((acc, curr) => acc + curr.horas, 0);
              updated.cantidad = totalHoras;
              const precio = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
              updated.total = precio * totalHoras;
          }
          return updated;
      }));
  }

  const mejorarObservaciones = async () => {
    const textoOriginal = formData.condiciones.observaciones;
    if (!textoOriginal || textoOriginal.length < 5) { alert("Escribe algo en las observaciones primero."); return; }
    setMejorandoTexto(true);
    try {
      const { data } = await api.post("/ia/mejorar-texto", { text: textoOriginal });
      if (data.result) handleInputChange("condiciones", "observaciones", data.result);
    } catch (error) { alert("Error al mejorar texto con IA"); } finally { setMejorandoTexto(false); }
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
          }
      } catch (error) { alert("Error extrayendo datos con IA"); } finally { setExtrayendoCliente(false); }
  }

  const subtotalServicios = itemsServicio.reduce((sum, i) => sum + i.total, 0);
  const ivaServicios = aplicarIVA ? subtotalServicios * 0.16 : 0;
  const totalServicios = subtotalServicios + ivaServicios;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Cotizador de Servicio Técnico</h1>
              <p className="text-gray-500">Generación de ofertas para asistencia y soporte en planta.</p>
            </div>
            {/* --- AQUÍ ELIMINÉ EL BOTÓN DE VISTA PREVIA --- */}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="text-blue-600" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800">Información del proveedor</h2><p className="text-sm text-gray-500">Datos fijos de SIG</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la empresa</label><input type="text" value={formData.proveedor.nombre} disabled className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label><input type="text" value={formData.proveedor.direccion} disabled className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Colonia</label><input type="text" value={formData.proveedor.colonia} disabled className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label><input type="text" value={formData.proveedor.ciudad} disabled className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Código postal</label><input type="text" value={formData.proveedor.cp} disabled className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed" /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-xl"><User className="text-green-600" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800">Facturar a (Bill To)</h2><p className="text-sm text-gray-500">Selecciona un cliente existente o agrega uno nuevo</p></div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
            <select value={clienteSeleccionadoId} onChange={(e) => handleSelectCliente(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:outline-none transition-colors">
              <option value="">Selecciona un cliente...</option>
              {clientesDisponibles.map((c) => ( <option key={c.id} value={c.id}>{c.nombre}</option> ))}
              <option value="nuevo">➕ Agregar nuevo cliente</option>
            </select>
          </div>

          {modoNuevoCliente && (
              <div className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-100 animate-fadeIn">
                  <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-2"><Wand2 size={16}/> Autocompletar con IA</h3>
                  <p className="text-xs text-purple-600 mb-3">Pega aquí la firma del correo o los datos fiscales desordenados:</p>
                  <textarea 
                      value={textoClienteSucio}
                      onChange={(e) => setTextoClienteSucio(e.target.value)}
                      className="w-full p-3 text-sm border border-purple-200 rounded-lg mb-3 focus:outline-none focus:border-purple-500"
                      placeholder="Ej: Razón Social: Empresa SA de CV, Calle Reforma 222, Col. Juarez, CDMX..."
                      rows={3}
                  />
                  <button 
                      onClick={extraerDatosCliente}
                      disabled={extrayendoCliente || !textoClienteSucio}
                      className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                      {extrayendoCliente ? "Analizando..." : "Extraer Datos"}
                  </button>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del cliente</label><input type="text" value={formData.facturarA.nombre} onChange={(e) => handleFacturarFieldChange("nombre", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Nombre o razón social" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label><input type="text" value={formData.facturarA.direccion} onChange={(e) => handleFacturarFieldChange("direccion", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Calle, número, etc." /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Colonia</label><input type="text" value={formData.facturarA.colonia} onChange={(e) => handleFacturarFieldChange("colonia", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Colonia o barrio" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label><input type="text" value={formData.facturarA.ciudad} onChange={(e) => handleFacturarFieldChange("ciudad", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Ciudad, estado" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Código postal</label><input type="text" value={formData.facturarA.cp} onChange={(e) => handleFacturarFieldChange("cp", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="CP" /></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-teal-100 rounded-xl"><MapPin className="text-teal-600" size={24} /></div>
            <div><h2 className="text-2xl font-bold text-gray-800">Lugar del servicio (Ship To)</h2><p className="text-sm text-gray-500">Dirección física donde se realizan los trabajos</p></div>
          </div>
          <div className="mb-6 bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-3 transition-all hover:border-teal-300 cursor-pointer" onClick={toggleShipToMismo}>
                <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${formData.shipToMismoQueFacturar ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-300'}`}>{formData.shipToMismoQueFacturar && <CheckSquare size={16} className="text-white" />}</div>
                <span className="text-gray-700 font-semibold select-none">Usar la misma dirección y datos que "Facturar A"</span>
          </div>
          {!formData.shipToMismoQueFacturar && (
              <div className="animate-fadeIn">
                <div className="mb-6">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar ubicación conocida:</label>
                     <select value={shipToSeleccionadoId} onChange={(e) => handleSelectShipTo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-teal-500 focus:outline-none transition-colors">
                        <option value="">-- Escribir manualmente o seleccionar --</option>
                        {clientesDisponibles.map(c => ( <option key={c.id} value={c.id}>{c.nombre} - {c.ciudad}</option> ))}
                     </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Nombre / Planta</label><input type="text" value={formData.shipTo.nombre} onChange={(e) => setFormData(prev => ({...prev, shipTo: {...prev.shipTo, nombre: e.target.value}}))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none transition-colors" placeholder="Ej: Planta Producción Norte" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label><input type="text" value={formData.shipTo.direccion} onChange={(e) => setFormData(prev => ({...prev, shipTo: {...prev.shipTo, direccion: e.target.value}}))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none transition-colors" placeholder="Calle, número, etc." /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Colonia</label><input type="text" value={formData.shipTo.colonia} onChange={(e) => setFormData(prev => ({...prev, shipTo: {...prev.shipTo, colonia: e.target.value}}))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none transition-colors" placeholder="Colonia" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label><input type="text" value={formData.shipTo.ciudad} onChange={(e) => setFormData(prev => ({...prev, shipTo: {...prev.shipTo, ciudad: e.target.value}}))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none transition-colors" placeholder="Ciudad" /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Código postal</label><input type="text" value={formData.shipTo.cp} onChange={(e) => setFormData(prev => ({...prev, shipTo: {...prev.shipTo, cp: e.target.value}}))} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none transition-colors" placeholder="CP" /></div>
                </div>
              </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Users size={100} /></div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={20} className="text-blue-600"/>Solicitante (Quien cotiza)</h3>
            <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-2">Seleccionar usuario registrado:</label>
                <select value={usuarioSeleccionadoId} onChange={(e) => handleSelectUsuario(e.target.value)} className="w-full px-4 py-2 border border-blue-200 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none bg-white">
                    <option value="">-- Seleccionar usuario --</option>
                    {usuariosRegistrados.map(user => ( <option key={user.id} value={user.id}>{user.nombre} - {user.puesto}</option> ))}
                </select>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label><input type="text" value={formData.contactoPrincipal.nombre} onChange={(e) => handleInputChange("contactoPrincipal", "nombre", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50' : 'bg-white'}`} placeholder="Nombre completo" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Email</label><input type="email" value={formData.contactoPrincipal.email} onChange={(e) => handleInputChange("contactoPrincipal", "email", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50' : 'bg-white'}`} placeholder="correo@sig.biz" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label><input type="tel" value={formData.contactoPrincipal.telefono} onChange={(e) => handleInputChange("contactoPrincipal", "telefono", e.target.value)} className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors ${usuarioSeleccionadoId ? 'bg-gray-50' : 'bg-white'}`} placeholder="+52 55 1234 5678" /></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Contacto secundario (Cliente)</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label><input type="text" value={formData.contactoSecundario.nombre} onChange={(e) => handleInputChange("contactoSecundario", "nombre", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Nombre completo" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Email</label><input type="email" value={formData.contactoSecundario.email} onChange={(e) => handleInputChange("contactoSecundario", "email", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="correo@cliente.com" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label><input type="tel" value={formData.contactoSecundario.telefono} onChange={(e) => handleInputChange("contactoSecundario", "telefono", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="+52 55 1234 5678" /></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><div className="p-3 bg-purple-100 rounded-xl"><FileText className="text-purple-600" size={24} /></div><div><h2 className="text-2xl font-bold text-gray-800">Detalles del servicio</h2><p className="text-sm text-gray-500">Selecciona la tarifa, número de ingenieros y horas/días</p></div></div>
            <button onClick={agregarLineaServicio} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all">+ Agregar concepto</button>
          </div>
          <div className="space-y-6">
            {itemsServicio.map((item) => {
              // USAR TARIFAS DINÁMICAS
              const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
              const esViaje = tarifa?.requiere_desglose;
              
              return (
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 bg-gray-50 relative">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start mb-4">
                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Concepto de servicio</label>
                    <select value={item.tarifaId} onChange={(e) => actualizarLineaServicio(item.id, "tarifaId", e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none bg-white">
                        <option value="">Selecciona una tarifa</option>
                        {/* RENDERIZADO DINÁMICO */}
                        {tarifasDisponibles.map((t) => ( <option key={t.id} value={t.id}>{t.concepto}</option> ))}
                    </select>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">N.º de ingenieros</label><input type="number" min={1} value={item.ingenieros} onChange={(e) => actualizarLineaServicio(item.id, "ingenieros", e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-center text-gray-900 focus:border-blue-500 focus:outline-none bg-white" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total {tarifa?.unidad === "dia" ? "Días" : "Horas"}</label><input type="number" min={1} value={item.cantidad} onChange={(e) => !esViaje && actualizarLineaServicio(item.id, "cantidad", e.target.value)} readOnly={!!esViaje} className={`w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-bold focus:border-blue-500 focus:outline-none ${esViaje ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-900'}`} /></div>
                  </div>
                  {esViaje && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-lg animate-fadeIn">
                          <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2"><Users size={16}/> Desglose de horas por Ingeniero</h4>
                          <div className="space-y-2">{item.desglose.map((d, idx) => ( <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center"><span className="text-xs font-bold text-blue-500 w-8">#{idx + 1}</span><div className="flex-1 w-full"><input type="text" placeholder={`Nombre del Ingeniero ${idx + 1}`} value={d.nombre} onChange={(e) => actualizarDesglose(item.id, idx, 'nombre', e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded text-sm focus:ring-2 focus:ring-blue-300 outline-none" /></div><div className="w-full sm:w-32 flex items-center gap-2"><input type="number" placeholder="Horas" value={d.horas} onChange={(e) => actualizarDesglose(item.id, idx, 'horas', e.target.value)} className="w-full px-3 py-2 border border-blue-200 rounded text-center font-bold text-sm focus:ring-2 focus:ring-blue-300 outline-none" /><span className="text-xs text-gray-500">hrs</span></div></div> ))}</div>
                          <div className="mt-3 text-right text-xs font-bold text-blue-700">Suma total de horas: {item.cantidad}</div>
                      </div>
                  )}
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-center justify-between pt-3 border-t border-gray-200 mt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">Tipo:</span>
                      <label className="inline-flex items-center gap-1 text-sm cursor-pointer"><input type="radio" className="accent-blue-600" checked={item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", true)} /> Con contrato</label>
                      <label className="inline-flex items-center gap-1 text-sm cursor-pointer"><input type="radio" className="accent-blue-600" checked={!item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", false)} /> Sin contrato</label>
                      {tarifa && ( <span className="text-xs text-gray-500 ml-2 hidden sm:inline">(${ (item.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato).toFixed(2) } / {tarifa.unidad})</span> )}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex flex-col items-end"><span className="text-xs text-gray-500">Total línea</span><span className="text-xl font-bold text-gray-800">${item.total.toFixed(2)} USD</span></div>
                      {itemsServicio.length > 1 && ( <button onClick={() => eliminarLineaServicio(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar concepto"><Trash2 size={20}/></button> )}
                    </div>
                  </div>
                  {!esViaje && ( <div className="mt-3"><input type="text" placeholder="Detalles adicionales (opcional)" value={item.detalles} onChange={(e) => actualizarLineaServicio(item.id, "detalles", e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:border-blue-500 outline-none" /></div> )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="bg-blue-50 rounded-xl p-6 min-w-[300px] shadow-inner">
              <div className="flex items-center justify-between mb-3 border-b border-blue-200 pb-3"><label htmlFor="aplicarIVA" className="text-gray-700 font-semibold cursor-pointer select-none">Aplicar IVA (16%)</label><input type="checkbox" id="aplicarIVA" checked={aplicarIVA} onChange={(e) => setAplicarIVA(e.target.checked)} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" /></div>
              <div className="flex items-center justify-between mb-2"><span className="text-gray-600 font-medium">Subtotal:</span><span className="text-gray-800 font-semibold">${subtotalServicios.toFixed(2)} USD</span></div>
              <div className="flex items-center justify-between mb-2"><span className="text-gray-600 font-medium">IVA (16%):</span><span className="text-gray-800 font-semibold">${ivaServicios.toFixed(2)} USD</span></div>
              <div className="border-t-2 border-blue-200 pt-3 mt-3"><div className="flex items-center justify-between"><span className="text-xl font-bold text-gray-800">Total:</span><span className="text-2xl font-bold text-blue-600">${totalServicios.toFixed(2)} USD</span></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-orange-100 rounded-xl"><Calculator className="text-orange-600" size={24} /></div><div><h2 className="text-2xl font-bold text-gray-800">Condiciones generales</h2><p className="text-sm text-gray-500">Ajusta la moneda, máquina y notas</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Nota de precios</label><input type="text" value={formData.condiciones.precios} onChange={(e) => handleInputChange("condiciones", "precios", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Los precios cotizados no incluyen IVA" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Moneda</label><select value={formData.condiciones.moneda} onChange={(e) => handleInputChange("condiciones", "moneda", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:outline-none transition-colors"><option value="USD">USD</option><option value="MXN">MXN</option><option value="EUR">EUR</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Máquina / equipo</label><input type="text" value={formData.condiciones.maquina} onChange={(e) => handleInputChange("condiciones", "maquina", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Ej: CFA 909-32 8539 51 015" /></div>
            <div className="md:col-span-2">
                <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Observaciones</label>
                    <button onClick={mejorarObservaciones} disabled={mejorandoTexto} className={`text-xs flex items-center gap-1 px-3 py-1 rounded-full transition-all font-bold ${mejorandoTexto ? "bg-purple-100 text-purple-400 cursor-wait" : "bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-105"}`}>
                        <Sparkles size={14} /> {mejorandoTexto ? "Mejorando..." : "Mejorar redacción con IA"}
                    </button>
                </div>
                <textarea rows={4} value={formData.condiciones.observaciones} onChange={(e) => handleInputChange("condiciones", "observaciones", e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none transition-colors resize-none" placeholder="Notas adicionales..." />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-end gap-4 mt-6">
          <button className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold">
            Cancelar
          </button>
          {/* ✅ NUEVA UBICACIÓN DEL BOTÓN DE VISTA PREVIA */}
          <button 
            onClick={() => setModalVistaPreviaAbierto(true)} 
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            <Eye size={20} /> Vista previa
          </button>

          <button
            onClick={handleGuardar}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {loading ? "Guardando..." : "Guardar cotización"}
          </button>
        </div>
      </div>

      {/* Modal Vista Previa */}
      <ModalVistaPrevia
        isOpen={modalVistaPreviaAbierto}
        onClose={() => setModalVistaPreviaAbierto(false)}
        formData={formData}
        itemsServicio={itemsServicio}
        aplicarIVA={aplicarIVA}
        tarifas={tarifasDisponibles} // PASAMOS LAS TARIFAS DINÁMICAS
        folio={folioGenerado}
        usuariosRegistrados={usuariosRegistrados}
      />
    </div>
  );
};

export default NuevaCotizacionPage;