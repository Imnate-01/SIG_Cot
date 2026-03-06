
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface Cotizacion {
    id: number;
    numero_cotizacion: string;
    fecha_creacion: string;
    total: number;
    estado: string;
    estatus_po: string;
    clientes: { nombre: string; empresa: string };
    usuarios: { nombre: string };
    creado_por_nombre: string;
    descripcion?: string | null; // Nuevo campo
}

export const exportToExcel = async (cotizaciones: Cotizacion[]) => {
    // 1. Crear Workbook y Worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Cotizaciones");

    // 2. Definir Columnas
    worksheet.columns = [
        { header: "Folio", key: "folio", width: 15 },
        { header: "Cliente", key: "cliente", width: 30 },
        { header: "Descripción", key: "descripcion", width: 40 }, // Nueva columna
        { header: "Creado por", key: "creado_por", width: 20 },
        { header: "Fecha", key: "fecha", width: 15 },
        { header: "Total USD", key: "total", width: 15 },
        { header: "Estado", key: "estado", width: 15 },
        { header: "Estatus PO", key: "estatus_po", width: 15 },
    ];

    // 3. Estilizar Encabezados
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Azul Oscuro (blue-900 aprox)
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25; // Altura un poco mayor

    // 4. Agregar Datos
    cotizaciones.forEach((cot) => {
        const row = worksheet.addRow({
            folio: cot.numero_cotizacion,
            cliente: cot.clientes?.empresa
                ? `${cot.clientes.empresa} (${cot.clientes.nombre})`
                : cot.clientes?.nombre || "Sin cliente",
            descripcion: cot.descripcion || "", // Mapeo de descripción
            creado_por: cot.creado_por_nombre || "Sistema",
            fecha: new Date(cot.fecha_creacion).toLocaleDateString("es-MX"),
            total: cot.total,
            estado: cot.estado.toUpperCase(),
            estatus_po: cot.estatus_po || "PENDIENTE",
        });

        // Formato de Moneda para Total
        const totalCell = row.getCell("total");
        totalCell.numFmt = '"$"#,##0.00';

        // Colores condicionales para Estado
        const estadoCell = row.getCell("estado");
        const estado = cot.estado.toLowerCase();

        // Configurar relleno según estado
        let fillColor = "FFFFFFFF"; // Blanco por defecto
        let fontColor = "FF000000"; // Negro

        if (estado === "aceptada") {
            fillColor = "FFDCFCE7"; // green-100
            fontColor = "FF166534"; // green-800
        } else if (estado === "rechazada") {
            fillColor = "FFFEE2E2"; // red-100
            fontColor = "FF991B1B"; // red-800
        } else if (estado === "borrador") {
            fillColor = "FFF1F5F9"; // slate-100
            fontColor = "FF475569"; // slate-600
        } else {
            fillColor = "FFFEF9C3"; // yellow-100
            fontColor = "FF854D0E"; // yellow-800
        }

        estadoCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
        };
        estadoCell.font = { color: { argb: fontColor }, bold: true };
        estadoCell.alignment = { horizontal: "center" };


        // Colores condicionales para Estatus PO
        const poCell = row.getCell("estatus_po");
        const estatusPO = (cot.estatus_po || "").toLowerCase();

        let poFill = "FFFFFFFF";
        let poFont = "FF000000";

        if (estatusPO === "completada" || estatusPO === "pagada") {
            poFill = "FFDCFCE7"; // green-100
            poFont = "FF166534"; // green-800
        } else if (estatusPO === "pendiente") {
            poFill = "FFFEE2E2"; // red-100
            poFont = "FF991B1B"; // red-800
        }

        poCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: poFill },
        };
        poCell.font = { color: { argb: poFont } };
        poCell.alignment = { horizontal: "center" };


        // Bordes para toda la fila
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });
    });

    // 5. Generar Buffer y Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `Cotizaciones_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
};
