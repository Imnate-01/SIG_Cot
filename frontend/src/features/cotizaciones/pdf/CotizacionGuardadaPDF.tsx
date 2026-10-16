/* eslint-disable @typescript-eslint/no-explicit-any -- `data` es la fila de BD con joins (se tipará más adelante) */
import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { buildPdfStyles } from "./estilosPdf";
import { imagenFirma, puestoFirmante } from "../firmantes";
import {
  esCostoVuelo,
  esPartidaServicioExterno,
  servicioExternoDesdePartida,
  horasPorIngenieroTexto,
  formatearHoras,
} from "../pricing";
import { EncabezadoServiciosPDF, FilaServicioPDF, TablaServiciosExternosPDF, formatCurrency } from "./tablasPdf";

/**
 * PDF de una cotización YA GUARDADA (pantalla de detalle /cotizaciones/[id]).
 * Lee precios y subtotales tal como quedaron en la base de datos.
 */
// Note: We'll keep the PDF static text logic in Spanish inside the PDF generator for this scope, 
// unless asked to internationalize the generated PDF docs as well. Let's internationalize only UI first.

export const CotizacionGuardadaPDF = ({ data }: { data: any }) => {
  const fecha = new Date(data.fecha_creacion).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  const cliente = data.clientes || {};
  const usuario = data.usuarios || {};
  const todasLasPartidas = data.cotizacion_items || [];
  // Las partidas marcadas como servicio externo van en su propia tabla
  const items = todasLasPartidas.filter((i: any) => !esPartidaServicioExterno(i));
  const externos = todasLasPartidas.filter((i: any) => esPartidaServicioExterno(i)).map(servicioExternoDesdePartida);
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
  const pdfStyles = buildPdfStyles(todasLasPartidas.length);

  // Determinar puesto del usuario — misma lógica que en el PDF de creación/edición:
  // 1. Si el nombre incluye "eduardo" → cargo especial "Back Office Manager"
  // 2. Si no, buscar el puesto en la lista de usuarios del sistema por email del contactoPrincipal
  // 3. Fallback: puesto del join de BD, luego "Coordinador de Servicio Técnico"
  const puestoUsuario = puestoFirmante(contactoPrincipal.nombre, usuario.puesto);

  const subtotalDe = (lista: any[]) => lista.reduce((sum: number, i: any) => sum + Number(i.subtotal || i.total || 0), 0);
  const subtotalServicios = subtotalDe(items);
  const subtotalExternos = subtotalDe(todasLasPartidas.filter((i: any) => esPartidaServicioExterno(i)));
  const subtotal = subtotalServicios + subtotalExternos;
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

        {/* Tabla de servicios técnicos: Total = Hrs. totales × P. Unit. en cada línea */}
        {items.length > 0 && (
          <View style={pdfStyles.table}>
            <EncabezadoServiciosPDF s={pdfStyles} isUS={false} />
            {items.map((item: any, idx: number) => {
              const vuelo = esCostoVuelo({ concepto: item.concepto || "" });
              const desglose = Array.isArray(item.desglose) ? item.desglose : [];
              const tieneDesglose = desglose.some((d: any) => d?.nombre || Number(d?.horas) > 0);
              const numIngenieros = Number(item.ingenieros) || (tieneDesglose ? desglose.length : 1);
              // En la BD `cantidad` ya es el total de horas (horas × ingenieros, o suma del desglose)
              const horasTotales = Number(item.cantidad) || 0;
              return (
                <FilaServicioPDF
                  key={idx}
                  s={pdfStyles}
                  isUS={false}
                  concepto={item.concepto}
                  desglose={desglose}
                  nota={item.detalles}
                  ingenieros={vuelo ? null : numIngenieros}
                  horasPorIngeniero={vuelo ? null : horasPorIngenieroTexto(numIngenieros, horasTotales, desglose)}
                  horasTotales={vuelo ? null : formatearHoras(horasTotales)}
                  precioUnitario={Number(item.precio_unitario)}
                  total={Number(item.subtotal || item.total)}
                  fontSizeTotal={9 * (items.length <= 3 ? 1 : 0.8)}
                />
              );
            })}
          </View>
        )}

        <TablaServiciosExternosPDF s={pdfStyles} isUS={false} titulo={condiciones.tituloServiciosExternos} servicios={externos} />

        <View style={{ marginBottom: 8 }}>
          {items.length > 0 && externos.length > 0 ? (
            <>
              <View style={pdfStyles.total}>
                <Text>Subtotal servicios técnicos:</Text>
                <Text>${formatCurrency(subtotalServicios)} {moneda}</Text>
              </View>
              <View style={pdfStyles.total}>
                <Text>Subtotal servicios adicionales:</Text>
                <Text>${formatCurrency(subtotalExternos)} {moneda}</Text>
              </View>
            </>
          ) : (
            <View style={pdfStyles.total}>
              <Text>Subtotal:</Text>
              <Text>${formatCurrency(subtotal)} {moneda}</Text>
            </View>
          )}

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
          <Image style={pdfStyles.signatureImage} src={imagenFirma(contactoPrincipal.nombre)} />
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
