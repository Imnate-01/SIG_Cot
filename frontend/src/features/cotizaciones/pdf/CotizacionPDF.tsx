import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { buildPdfStyles } from "./estilosPdf";
import { imagenFirma, puestoFirmante } from "../firmantes";
import {
  precioUnitario as calcularPrecioUnitario,
  sumarTotales,
  esCostoVuelo as esTarifaCostoVuelo,
} from "../pricing";
import type { CotizacionFormData, ServicioTarifado, Tarifa, UsuarioRegistrado } from "../types";

/**
 * PDF de una cotización en edición (pantallas "nueva" y "editar").
 * El detalle de una cotización guardada usa su propio documento en
 * app/[locale]/cotizaciones/[id]/page.tsx (lee los datos ya guardados).
 */
export interface CotizacionPDFProps {
  formData: CotizacionFormData;
  itemsServicio: ServicioTarifado[];
  tarifas: Tarifa[];
  folio: string | null;
  usuariosRegistrados: UsuarioRegistrado[];
  tarifasCliente?: Record<string, number>;
}

export const CotizacionPDF: React.FC<CotizacionPDFProps> = ({ formData, itemsServicio, tarifas, folio, usuariosRegistrados, tarifasCliente = {} }) => {
  const pdfStyles = buildPdfStyles(itemsServicio.length);
  const subtotal = sumarTotales(itemsServicio);
  const total = subtotal;
  const isUS = formData.condiciones.entidad === "US" || formData.condiciones.entidad === "CA";
  const fecha = new Date().toLocaleDateString(isUS ? "en-US" : "es-MX", { day: "numeric", month: "long", year: "numeric" });

  const shipToData = formData.shipToMismoQueFacturar ? formData.facturarA : formData.shipTo;

  // Usuario registrado que firma (buscado por el correo del contacto principal)
  const usuarioSeleccionado = usuariosRegistrados.find(u => u.email === formData.contactoPrincipal.email);
  const puestoUsuario = puestoFirmante(usuarioSeleccionado?.nombre, usuarioSeleccionado?.puesto);
  const displayFolio = folio ? folio : (isUS ? "DRAFT" : "BORRADOR");
  const formatCurrency = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
            <Text style={pdfStyles.label}>{isUS ? "Customer:" : "Contacto:"}</Text>
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
            const esCostoVuelo = esTarifaCostoVuelo(tarifa);
            // Bug 3 fix: use client contract rate if available
            const precioUnitario = calcularPrecioUnitario(item, tarifa, tarifasCliente);

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

                <Text style={pdfStyles.colTiny}>{esCostoVuelo ? "N/A" : numIngenieros}</Text>
                <Text style={[pdfStyles.colSmall, { fontWeight: "bold" }]}>{esCostoVuelo ? "N/A" : item.cantidad}</Text>
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
          <Image style={pdfStyles.signatureImage} src={imagenFirma(nombreUsuario)} />
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
