"use client";
import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { useDropzone } from "react-dropzone";
import { PDFDocument } from "pdf-lib";
import { pdf } from "@react-pdf/renderer";
import { useParams, useRouter } from "next/navigation"; // Added useParams, useRouter
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
    ArrowLeft
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
import { toast } from "sonner";
import Link from "next/link"; // Added Link

const PDFViewerDynamic = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    { ssr: false, loading: () => <p>Cargando visor...</p> }
);

/* ===================== Tipos (Reused) ===================== */
interface Proveedor { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; rfc?: string; }
interface FacturarA { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface ShipTo { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
interface Contacto { nombre: string; email: string; telefono: string; }
interface Condiciones { precios: string; moneda: string; maquina: string; observaciones: string; }
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

/* ===================== Estilos PDF (Reused) ===================== */
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

/* ===================== Componente PDF (Reused) ===================== */
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
    const puestoUsuarioRaw = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email)?.puesto || "Coordinador de Servicio Técnico";
    const nombreUsuarioCheck = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email)?.nombre || "";
    const puestoUsuario = nombreUsuarioCheck.toLowerCase().includes("eduardo") ? "Back Office Manager" : puestoUsuarioRaw;
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
                        const precioUnitario = item.conContrato ? tarifa?.precio_con_contrato || 0 : tarifa?.precio_sin_contrato || 0;
                        const numIngenieros = tarifa?.requiere_desglose && item.desglose && item.desglose.length > 0 ? item.desglose.length : (item.ingenieros || 1);
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
                    <Text style={pdfStyles.signatureText}>Enviar orden de compra a <Text style={{ color: "blue", textDecoration: "none" }}>{emailUsuario}</Text> con atención a {nombreUsuario}.</Text>
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

/* ===================== Modal Vista Previa (Reused) ===================== */
// (Same component, no changes needed, just keeping it here for completeness)
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
    const onDrop = useCallback((acceptedFiles: File[]) => { if (acceptedFiles.length > 0) setReporteTecnico(acceptedFiles[0]); }, []);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false });

    const copiarAlPortapapeles = (texto: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(texto).then(() => toast.success("Copiado")).catch(() => { }); }
    };

    const generarCorreo = async () => {
        setGenerandoCorreo(true);
        try {
            const subtotal = itemsServicio.reduce((sum, i) => sum + i.total, 0);
            const total = subtotal * (aplicarIVA ? 1.16 : 1);
            const { data } = await api.post("/ia/generar-correo", {
                cliente: formData.facturarA.nombre,
                numeroCotizacion: folioParaIA,
                servicios: itemsServicio.map(i => { const t = tarifas.find(t => String(t.id) === i.tarifaId); return t ? t.concepto : ""; }).join(", "),
                total: total.toFixed(2),
                moneda: formData.condiciones.moneda
            });
            if (data.result) setCorreoGenerado(data.result);
        } catch (e) { toast.error("Error generando correo"); } finally { setGenerandoCorreo(false); }
    };

    const handleDownloadMerged = async () => {
        setIsMerging(true);
        try {
            const quoteBlob = await pdf(<CotizacionPDF formData={formData} itemsServicio={itemsServicio} aplicarIVA={aplicarIVA} tarifas={tarifas} folio={folio} usuariosRegistrados={usuariosRegistrados} />).toBlob();
            if (!reporteTecnico) {
                const url = URL.createObjectURL(quoteBlob);
                const link = document.createElement('a'); link.href = url; link.download = `Cotizacion_${folio || 'Borrador'}.pdf`; link.click(); setIsMerging(false); return;
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
            const link = document.createElement('a'); link.href = url; link.download = `Cotizacion_${folio || 'Borrador'}_FULL.pdf`; link.click(); URL.revokeObjectURL(url);
        } catch (error) { toast.error("Error al fusionar PDFs."); } finally { setIsMerging(false); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-row overflow-hidden border border-gray-200 dark:border-zinc-800">
                <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Vista Previa</h2>
                        <div className="flex items-center gap-3">
                            <button onClick={handleDownloadMerged} disabled={isMerging} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">{isMerging ? "Generando..." : <><Download size={18} /> Descargar</>}</button>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500"><X size={24} /></button>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-zinc-950">
                        <PDFViewerDynamic width="100%" height="100%" className="border-0"><CotizacionPDF formData={formData} itemsServicio={itemsServicio} aplicarIVA={aplicarIVA} tarifas={tarifas} folio={folio} usuariosRegistrados={usuariosRegistrados} /></PDFViewerDynamic>
                    </div>
                </div>
                <div className="w-1/3 bg-gray-50 dark:bg-zinc-950 p-6 flex flex-col overflow-y-auto gap-8 border-l border-gray-200 dark:border-zinc-800">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3"><Paperclip size={16} /> Anexar TSR</h3>
                        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                            <input {...getInputProps()} />
                            {reporteTecnico ? <div className="flex items-center justify-center gap-2 text-green-600 font-medium"><FileCheck size={20} /><span className="truncate">{reporteTecnico.name}</span><button onClick={(e) => { e.stopPropagation(); setReporteTecnico(null); }} className="ml-2 text-red-500"><X size={14} /></button></div> : <div className="text-gray-500 text-xs"><p>Arrastra PDF aquí</p></div>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2"><Sparkles className="text-purple-600" /> Asistente de Envío</h3>
                        <button onClick={generarCorreo} disabled={generandoCorreo} className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex justify-center items-center gap-2">{generandoCorreo ? "..." : <><Mail size={18} /> Generar Correo</>}</button>
                        {correoGenerado && <div className="mt-4"><textarea className="w-full h-48 p-4 border rounded-xl text-sm" value={correoGenerado} readOnly /><button onClick={() => copiarAlPortapapeles(correoGenerado)} className="mt-3 py-2 border w-full rounded-lg flex justify-center gap-2"><Copy size={16} /> Copiar</button></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ===================== Componente principal ===================== */
const EditarCotizacionPage: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();

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
        descripcion: "",
        tipo_servicio: "TM"
    });

    const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
    const [shipToSeleccionadoId, setShipToSeleccionadoId] = useState<string>("");
    const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<string>("");
    const [modoNuevoCliente, setModoNuevoCliente] = useState<boolean>(false);
    const [itemsServicio, setItemsServicio] = useState<ServicioTarifado[]>([]);
    const [aplicarIVA, setAplicarIVA] = useState<boolean>(true);
    const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState<boolean>(false);

    const [mejorandoTexto, setMejorandoTexto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // FETCH DATA
    useEffect(() => {
        const loadAll = async () => {
            try {
                // 1. Cargar Catálogos
                const [resClientes, resUsuarios, resServicios] = await Promise.all([
                    api.get('/clientes'),
                    api.get('/usuarios'),
                    api.get('/servicios')
                ]);

                setClientesDisponibles(resClientes.data.data || []);
                setUsuariosRegistrados(resUsuarios.data.data || []);

                const listaServicios = (resServicios.data.data || []).map((s: any) => ({
                    id: s.id,
                    concepto: s.concepto,
                    unidad: s.unidad,
                    precio_sin_contrato: Number(s.precio_sin_contrato),
                    precio_con_contrato: Number(s.precio_con_contrato),
                    moneda: s.moneda,
                    requiere_desglose: s.concepto.toLowerCase().includes('viaje')
                }));
                setTarifasDisponibles(listaServicios);

                // 2. Cargar Cotización
                const { data: cotData } = await api.get(`/cotizaciones/${id}`);
                const cot = cotData.data;

                if (cot.estado !== 'borrador') {
                    toast.error("Solo se pueden editar cotizaciones en estado borrador");
                    router.push(`/cotizaciones/${id}`);
                    return;
                }

                setFolioGenerado(cot.numero_cotizacion);

                // Parsear datos
                const cliente = cot.clientes || {};
                const items = cot.cotizacion_items || [];
                const condiciones = cot.condiciones || {}; // JSONB

                setClienteSeleccionadoId(String(cot.cliente_id));

                // Populate Form
                setFormData({
                    proveedor: {
                        nombre: "SIG Combibloc México, S.A. de C.V.",
                        direccion: "Av. Emilio Castelar No. 75",
                        colonia: "Polanco IV Sección",
                        ciudad: "Ciudad de México",
                        cp: "11550"
                    },
                    facturarA: {
                        nombre: cliente.nombre || "",
                        direccion: cliente.direccion || "",
                        colonia: cliente.colonia || "",
                        ciudad: cliente.ciudad || "",
                        cp: cliente.cp || ""
                    },
                    shipTo: {
                        // TODO: Si guardáramos shipTo en DB, lo cargaríamos aquí. Por ahora, asumimos mismo que facturar o rellenamos
                        nombre: cliente.nombre || "",
                        direccion: cliente.direccion || "",
                        colonia: cliente.colonia || "",
                        ciudad: cliente.ciudad || "",
                        cp: cliente.cp || ""
                    },
                    shipToMismoQueFacturar: true, // Default

                    contactoPrincipal: {
                        // Intentamos sacar del usuario creador o guardado
                        nombre: cot.usuarios?.nombre || "",
                        email: cot.usuarios?.email || "",
                        telefono: cot.usuarios?.telefono || ""
                    },
                    contactoSecundario: {
                        nombre: cliente.contacto_nombre || "",
                        email: cliente.correo || "",
                        telefono: cliente.telefono || ""
                    },
                    condiciones: {
                        precios: condiciones.precios || "Los precios cotizados no incluyen IVA",
                        moneda: condiciones.moneda || "USD",
                        maquina: condiciones.maquina || "",
                        observaciones: condiciones.observaciones || ""
                    },
                    descripcion: cot.descripcion || "",
                    tipo_servicio: cot.tipo_servicio || "TM"
                });

                // Populate Items
                // Necesitamos 'descifrar' si es con contrato o no basado en precios, o asumimos contrato
                const loadedItems = items.map((i: any) => {
                    // Buscar tarifa por concepto (aproximado) o precio
                    // Como items guarda texto libre en concepto, tratamos de matchear con tarifaDisponibles
                    // O mejor, si guardamos tarifa_id en items, seria ideal. 
                    // Pero backend actual guarda 'concepto'.
                    // Vamos a intentar buscar por concepto exacto
                    const tarifaEncontrada = listaServicios.find((t: any) => t.concepto === i.concepto);

                    return {
                        id: i.id, // ID interno temporal
                        tarifaId: tarifaEncontrada ? String(tarifaEncontrada.id) : "",
                        ingenieros: i.ingenieros || 1,
                        cantidad: i.cantidad, // Ojo: en DB 'cantidad' a veces es total de horas
                        conContrato: true, // Default
                        detalles: i.detalles || "",
                        desglose: i.desglose || [], // JSON
                        total: i.subtotal || i.total
                    };
                });
                setItemsServicio(loadedItems);

            } catch (error) {
                console.error(error);
                toast.error("Error al cargar datos");
            } finally {
                setInitialLoading(false);
            }
        }
        if (id) loadAll();
    }, [id, router]);


    // HANDLERS (Same as Create, but calling update)

    const handleInputChange = <K extends keyof CotizacionFormData>(seccion: K, campo: string, valor: any) => {
        setFormData((prev) => ({ ...prev, [seccion]: { ...(prev[seccion] as Record<string, any> || {}), [campo]: valor } }));
    };

    const handleGuardar = async () => {
        try {
            setLoading(true)
            const itemsFormateados = itemsServicio.map(item => {
                const tarifa = tarifasDisponibles.find(t => String(t.id) === item.tarifaId)
                const precioUnitario = item.conContrato ? tarifa?.precio_con_contrato || 0 : tarifa?.precio_sin_contrato || 0
                const cantidadReal = tarifa?.requiere_desglose ? item.cantidad : (item.cantidad * (item.ingenieros || 1));
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
                total: (itemsServicio.reduce((sum, i) => sum + i.total, 0)) * (aplicarIVA ? 1.16 : 1),
                descripcion: formData.descripcion,
                tipo_servicio: formData.tipo_servicio,
            }

            // PUT Request
            await api.put(`/cotizaciones/${id}`, payload);
            toast.success("Cotización actualizada correctamente");
            router.push("/cotizaciones");

        } catch (error: any) {
            console.error('Error:', error)
            toast.error('Error al actualizar', { description: error.message });
        } finally {
            setLoading(false)
        }
    }

    // Helper functions (Simplified for brevity, logic shared with Create)
    const handleSelectCliente = (value: string) => {
        // (Simplificado) Importar lógica completa si es necesario cambiar cliente
        setClienteSeleccionadoId(value);
        const cliente = clientesDisponibles.find((c) => String(c.id) === value);
        if (cliente) {
            setFormData(prev => ({ ...prev, facturarA: { ...prev.facturarA, nombre: cliente.nombre, direccion: cliente.direccion, colonia: cliente.colonia, ciudad: cliente.ciudad, cp: cliente.cp } }));
        }
    };

    const handleSelectUsuario = (value: string) => { setUsuarioSeleccionadoId(value); };
    const handleFacturarFieldChange = (campo: keyof FacturarA, valor: string) => { handleInputChange("facturarA", campo, valor); };
    const agregarLineaServicio = () => { setItemsServicio((prev) => [...prev, { id: Date.now(), tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: Date.now().toString(), nombre: '', horas: 0 }] },]); };
    const eliminarLineaServicio = (id: number) => { setItemsServicio((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev); };

    const actualizarLineaServicio = (id: number, campo: keyof Omit<ServicioTarifado, "total">, valor: any) => {
        // Copy paste logic from Create
        setItemsServicio((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const updated: ServicioTarifado = { ...item };
            if (campo === "tarifaId") updated.tarifaId = String(valor);
            else if (campo === "conContrato") updated.conContrato = Boolean(valor);
            else if (campo === "detalles") updated.detalles = String(valor);
            else {
                if (campo === "ingenieros") updated.ingenieros = Number(valor) || 0;
                else if (campo === "cantidad") updated.cantidad = Number(valor) || 0;
                else if (campo === "id") updated.id = Number(valor) || updated.id;
                else (updated as any)[campo] = valor;
            }
            const tarifa = tarifasDisponibles.find((t) => String(t.id) === updated.tarifaId);
            const requiereDesglose = tarifa?.requiere_desglose;
            if ((campo === "ingenieros" || campo === "tarifaId") && requiereDesglose) {
                const diff = updated.ingenieros - updated.desglose.length;
                if (diff > 0) { for (let i = 0; i < diff; i++) updated.desglose.push({ uid: Math.random().toString(), nombre: '', horas: 0 }); }
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
        }));
    };

    const actualizarDesglose = (itemId: number, indexDesglose: number, campo: 'nombre' | 'horas', valor: any) => {
        // Copy paste logic from Create
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
                const precio = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
                updated.total = precio * totalHoras;
            }
            return updated;
        }));
    };

    const mejorarObservaciones = async () => {
        const textoOriginal = formData.condiciones.observaciones;
        if (!textoOriginal || textoOriginal.length < 5) return;
        setMejorandoTexto(true);
        try {
            const { data } = await api.post("/ia/mejorar-texto", { text: textoOriginal });
            if (data.result) handleInputChange("condiciones", "observaciones", data.result);
        } catch (error) { toast.error("Error AI"); } finally { setMejorandoTexto(false); }
    };

    const subtotalServicios = itemsServicio.reduce((sum, i) => sum + i.total, 0);
    const ivaServicios = aplicarIVA ? subtotalServicios * 0.16 : 0;
    const totalServicios = subtotalServicios + ivaServicios;

    if (initialLoading) return <div className="p-10 text-center">Cargando datos de cotización...</div>

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href={`/cotizaciones/${id}`} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors mb-4">
                        <ArrowLeft size={20} className="mr-2" /> Volver al detalle
                    </Link>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-amber-500">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Editar Cotización</h1>
                            <p className="text-gray-500 dark:text-gray-400">Modificando cotización folio: <b>{folioGenerado}</b></p>
                        </div>
                        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full font-bold text-sm">
                            Modo Edición
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 overflow-hidden mb-6">
                    <div className="bg-blue-600 p-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText size={20} className="text-blue-200" />
                            Información de la cotización
                        </h2>
                        <p className="text-blue-100 text-xs mt-1">Datos para identificar este documento</p>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción / Motivo (Opcional)</label>
                            <input
                                type="text"
                                value={formData.descripcion}
                                onChange={(e) => handleInputChange("descripcion", "", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Ej: Mantenimiento correctivo · Red profibus"
                                maxLength={120}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Describe brevemente el motivo del servicio. Aparecerá en la tarjeta y en el PDF.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Servicio</label>
                            <select
                                value={formData.tipo_servicio}
                                onChange={(e) => handleInputChange("tipo_servicio", "", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="TM">Mantenimiento (TM)</option>
                                <option value="Project">Proyecto (Project)</option>
                                <option value="Training">Entrenamiento</option>
                                <option value="Spares">Repuestos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda</label>
                            <select
                                value={formData.condiciones.moneda}
                                onChange={(e) => handleInputChange("condiciones", "moneda", e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="USD">Dólares (USD)</option>
                                <option value="MXN">Pesos Mexicanos (MXN)</option>
                                <option value="EUR">Euros (EUR)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIONES DEL FORMULARIO (Reuse same UI structure) */}

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-xl"><Building2 className="text-blue-600" size={24} /></div>
                        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Proveedor & Cliente</h2></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Cliente</label>
                            <select value={clienteSeleccionadoId} onChange={(e) => handleSelectCliente(e.target.value)} className="w-full p-3 border rounded-xl">
                                <option value="">Seleccionar...</option>
                                {clientesDisponibles.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                            </select>
                        </div>
                        {/* Facturar A inputs... */}
                        <div className="md:col-span-2"><label className="block text-sm font-semibold mb-2">Nombre Cliente</label><input type="text" value={formData.facturarA.nombre} onChange={(e) => handleFacturarFieldChange("nombre", e.target.value)} className="w-full p-3 border rounded-xl" /></div>
                        <div><label className="block text-sm font-semibold mb-2">Dirección</label><input type="text" value={formData.facturarA.direccion} onChange={(e) => handleFacturarFieldChange("direccion", e.target.value)} className="w-full p-3 border rounded-xl" /></div>
                        <div><label className="block text-sm font-semibold mb-2">Ciudad</label><input type="text" value={formData.facturarA.ciudad} onChange={(e) => handleFacturarFieldChange("ciudad", e.target.value)} className="w-full p-3 border rounded-xl" /></div>
                    </div>
                </div>

                {/* SERVICIOS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Servicios</h2>
                        <button onClick={agregarLineaServicio} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700">+ Agregar</button>
                    </div>

                    <div className="space-y-6">
                        {itemsServicio.map((item) => {
                            const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
                            const esViaje = tarifa?.requiere_desglose;
                            return (
                                <div key={item.id} className="border p-4 rounded-xl bg-gray-50 relative">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold uppercase">Concepto</label>
                                            <select value={item.tarifaId} onChange={(e) => actualizarLineaServicio(item.id, "tarifaId", e.target.value)} className="w-full p-2 border rounded">
                                                <option value="">Seleccionar</option>
                                                {tarifasDisponibles.map(t => <option key={t.id} value={t.id}>{t.concepto}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase">Ingenieros</label>
                                            <input type="number" min="1" value={item.ingenieros} onChange={(e) => actualizarLineaServicio(item.id, "ingenieros", e.target.value)} className="w-full p-2 border rounded text-center" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase">{tarifa?.unidad === 'dia' ? 'Días' : 'Horas'}</label>
                                            <input type="number" value={item.cantidad} onChange={(e) => !esViaje && actualizarLineaServicio(item.id, "cantidad", e.target.value)} readOnly={!!esViaje} className={`w-full p-2 border rounded text-center ${esViaje ? 'bg-gray-200' : ''}`} />
                                        </div>
                                    </div>
                                    {/* Desglose de viaje */}
                                    {esViaje && (
                                        <div className="mb-2 bg-blue-50 p-2 rounded border border-blue-200">
                                            {item.desglose.map((d, idx) => (
                                                <div key={idx} className="flex gap-2 mb-1">
                                                    <span className="text-xs font-bold">#{idx + 1}</span>
                                                    <input placeholder="Nombre" value={d.nombre} onChange={(e) => actualizarDesglose(item.id, idx, 'nombre', e.target.value)} className="flex-1 p-1 border rounded text-sm" />
                                                    <input type="number" placeholder="Hrs" value={d.horas} onChange={(e) => actualizarDesglose(item.id, idx, 'horas', e.target.value)} className="w-20 p-1 border rounded text-sm text-center" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                        <div className="text-xl font-bold text-gray-800">${item.total.toFixed(2)}</div>
                                        {itemsServicio.length > 1 && <button onClick={() => eliminarLineaServicio(item.id)} className="text-red-500"><Trash2 size={20} /></button>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <div className="bg-blue-50 p-4 rounded-xl min-w-[300px]">
                            <div className="flex justify-between mb-2"><span>Subtotal:</span><span className="font-bold">${subtotalServicios.toFixed(2)}</span></div>
                            <div className="flex justify-between mb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={aplicarIVA} onChange={(e) => setAplicarIVA(e.target.checked)} /> IVA (16%)</label><span className="font-bold">${ivaServicios.toFixed(2)}</span></div>
                            <div className="flex justify-between pt-2 border-t border-blue-200 text-xl font-bold text-blue-800"><span>Total:</span><span>${totalServicios.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                {/* CONDITIONS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6">
                    <h3 className="text-xl font-bold mb-4">Condiciones</h3>
                    <textarea rows={3} value={formData.condiciones.observaciones} onChange={(e) => handleInputChange("condiciones", "observaciones", e.target.value)} className="w-full p-3 border rounded text-sm mb-2" placeholder="Observaciones..." />
                    <div className="flex gap-2">
                        <button onClick={mejorarObservaciones} disabled={mejorandoTexto} className="bg-purple-100 text-purple-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1"><Sparkles size={12} /> Mejorar con IA</button>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex justify-end gap-4">
                    <button onClick={() => router.push(`/cotizaciones/${id}`)} className="px-6 py-3 border rounded-xl hover:bg-gray-50">Cancelar</button>
                    <button onClick={() => setModalVistaPreviaAbierto(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"><Eye size={20} /> Vista Previa</button>
                    <button onClick={handleGuardar} disabled={loading} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-bold shadow-lg">{loading ? 'Guardando...' : 'Guardar Cambios'}</button>
                </div>

            </div>

            <ModalVistaPrevia
                isOpen={modalVistaPreviaAbierto}
                onClose={() => setModalVistaPreviaAbierto(false)}
                formData={formData}
                itemsServicio={itemsServicio}
                aplicarIVA={aplicarIVA}
                tarifas={tarifasDisponibles}
                folio={folioGenerado}
                usuariosRegistrados={usuariosRegistrados}
            />
        </div>
    );
};

export default EditarCotizacionPage;

