import { describe, it, expect } from "vitest";
import {
  detectarEncabezado, extraerPartes, intervaloDeHoja, mapearEncabezados, normalizarIntervalo, normalizarPn,
  normalizarPosicion, normalizarSc, faltantes, duplicados, type Celda, type ParteBom,
} from "./leerBom";
import { compararBoms, filtrarGrupos } from "./comparar";
import { aCsv, filasDiferencias, filasLista, nombreArchivo, type Etiquetas } from "./exportar";
import { parsearCsv } from "./archivoBom";

const parte = (o: Partial<ParteBom>): ParteBom => ({
  sc: "SC04", seccion: "", posicion: "110", pn: "860504028", nuevoPn: null, descripcion: "SUCTION CUP", cantidad: 24,
  unidad: "PC", intervalo: "4K", intervaloOrigen: "fila", comentario: "", fila: 1, ...o,
});

describe("normalización", () => {
  it("encabezados de la matriz Nestlé (hoja 4K)", () => {
    const enc = ["SC", "Section", "Pos. No.", "Component number", "New part #", "Object description", "Qty", "Unit", "Interval"];
    expect(mapearEncabezados(enc)).toEqual({ sc: 0, seccion: 1, posicion: 2, pn: 3, nuevoPn: 4, descripcion: 5, cantidad: 6, unidad: 7, intervalo: 8 });
  });
  it("encabezados del prototipo y en español", () => {
    expect(mapearEncabezados(["Pos.", "Component number", "Object description", "Structural Component", "Qty", "Un", "Interval", "Remark"]))
      .toEqual({ posicion: 0, pn: 1, descripcion: 2, sc: 3, cantidad: 4, unidad: 5, intervalo: 6, comentario: 7 });
    expect(mapearEncabezados(["Número de parte", "Descripción", "Cantidad", "Posición"])).toEqual({ pn: 0, descripcion: 1, cantidad: 2, posicion: 3 });
  });
  it("HTW: Component # SIG es el número de parte; Meurer no se mapea", () => {
    expect(mapearEncabezados(["Component # SIG", "Component # Meurer", "Description", "Qty"])).toEqual({ pn: 0, descripcion: 2, cantidad: 3 });
  });
  it("encuentra la fila de encabezados debajo del título", () => {
    const filas: Celda[][] = [["Maintenance BOM of CFA 812-35"], ["869851069 FILLING MACHINE"], [], ["SC", "Pos. No.", "Component number", "Object description", "Qty"], ["SC04", 110, 860504028, "SUCTION CUP", 24]];
    expect(detectarEncabezado(filas)).toBe(3);
    expect(detectarEncabezado([["hola"], ["mundo"]])).toBe(-1);
  });
  it("valores", () => {
    expect([normalizarPn(860504028), normalizarPn("860504028.0"), normalizarPn(" 8605 04028 ")]).toEqual(["860504028", "860504028", "860504028"]);
    expect([normalizarSc("SC 04"), normalizarSc(4), normalizarSc("sc35"), normalizarSc("")]).toEqual(["SC04", "SC04", "SC35", ""]);
    expect([normalizarPosicion(10), normalizarPosicion("0010"), normalizarPosicion(""), normalizarPosicion("A1")]).toEqual(["010", "010", null, "A1"]);
    expect([normalizarIntervalo(4000), normalizarIntervalo("4,000"), normalizarIntervalo("4k"), normalizarIntervalo("16 K"), normalizarIntervalo("")]).toEqual(["4K", "4K", "4K", "16K", null]);
    expect([intervaloDeHoja("16K"), intervaloDeHoja("BOM 8k"), intervaloDeHoja("Total CFA"), intervaloDeHoja("BOM_SC08-SC14")]).toEqual(["16K", "8K", null, null]);
  });
  it("campos requeridos y columnas repetidas", () => {
    expect(faltantes({ pn: 0 })).toEqual(["descripcion", "cantidad"]);
    expect(duplicados({ pn: 1, descripcion: 1, cantidad: 2 })).toEqual(["pn", "descripcion"]);
  });
});

describe("extraerPartes", () => {
  const filas: Celda[][] = [
    ["Maintenance BOM of CFA 812-35"],
    ["SC", "Pos. No.", "Component number", "New part #", "Object description", "Qty", "Unit"],
    ["SC04", 110, 860504028, null, "SUCTION CUP", 24, "PC"],
    [null, 120, 860504031, null, "SUCTION CUP HOLDER", 24, "PC"],
    [], // vacía
    ["SC10", null, 869117016, 869117018, "PNEUMATIC CYLINDER D=32 HUB=50", 2, "PC"],
    ["SC", "Pos. No.", "Component number", null, "Object description", "Qty"], // encabezado repetido
    ["SC12", null, null, null, "Subtotal SC12", null], // título
  ];
  const partes = extraerPartes(filas, 1, mapearEncabezados(filas[1]), "16K");
  it("salta vacías, títulos y encabezados repetidos; conserva la fila de origen", () => {
    expect(partes.map((p) => `${p.sc}/${p.posicion}/${p.pn}@${p.fila}`)).toEqual(["SC04/110/860504028@3", "SC04/120/860504031@4", "SC10/null/869117016@6"]);
  });
  it("sin columna de intervalo lo toma de la hoja (8K/16K)", () => {
    expect(partes[0]).toMatchObject({ intervalo: "16K", intervaloOrigen: "hoja" });
  });
  it("registra el New part #", () => {
    expect(partes[2].nuevoPn).toBe("869117018");
  });
});

describe("compararBoms", () => {
  const A = [
    parte({ fila: 2 }),
    parte({ posicion: "120", pn: "860504031", descripcion: "SUCTION CUP HOLDER", cantidad: 16, fila: 3 }),
    parte({ sc: "SC05", posicion: "010", pn: "860505112", descripcion: "Feeder belt 25AT10/1400", intervalo: "4K", fila: 4 }),
    parte({ sc: "SC10", posicion: "130", pn: "869117016", descripcion: "Proximity sensor M12", cantidad: 2, fila: 5 }),
    parte({ sc: "SC12", posicion: "050", pn: "860512017", descripcion: "Level probe", cantidad: 1, intervalo: "16K", fila: 6 }),
    parte({ sc: "SC35", posicion: null, pn: "888316009", descripcion: "SEAL", cantidad: 2, fila: 7 }),
    parte({ sc: "SC35", posicion: null, pn: "888316009", descripcion: "SEAL", cantidad: 1, fila: 8 }),
    parte({ sc: "SC07", posicion: "060", pn: "860507118", descripcion: "Bottom sealing anvil", cantidad: 2, fila: 9 }),
  ];
  const B = [
    parte({ fila: 2 }),
    parte({ posicion: "120", pn: "860504031", descripcion: "Suction cup holder", cantidad: 24, fila: 3 }), // misma descripción con otro formato
    parte({ sc: "SC05", posicion: "010", pn: "860505112", descripcion: "Feeder belt 25AT10/1400", intervalo: "8K", fila: 4 }),
    parte({ sc: "SC10", posicion: "130", pn: "869117018", descripcion: "Proximity sensor M12", cantidad: 2, fila: 5 }),
    parte({ sc: "SC04", posicion: "170", pn: "860504040", descripcion: "Vacuum filter element", cantidad: 1, fila: 6 }),
    parte({ sc: "SC35", posicion: null, pn: "888316009", descripcion: "SEAL", cantidad: 2, fila: 7 }),
    parte({ sc: "SC35", posicion: null, pn: "888316009", descripcion: "SEAL", cantidad: 1, fila: 8 }),
    parte({ sc: "SC07", posicion: "130", pn: "860507118", descripcion: "Bottom sealing anvil", cantidad: 2, fila: 9 }),
  ];
  const r = compararBoms(A, B);

  it("conteos: 8 vs 8 piezas → 3 coinciden + 6 filas con diferencias (incluye 1 nueva y 1 retirada)", () => {
    // Emparejadas: ventosa, holder, banda, sensor, 2×SC35, yunque = 7; libres: 1 en A (sonda) y 1 en B (filtro).
    // Filas = 7 + 1 + 1 = 9; coinciden = ventosa + 2×SC35 = 3; con diferencias = 9 − 3 = 6.
    expect(r.filas).toHaveLength(9);
    expect(r.conteo).toMatchObject({ coinciden: 3, cantidad: 1, intervalo: 1, pn: 1, posicion: 1, nueva: 1, retirada: 1, descripcion: 0 });
    expect(r.conDiferencias).toBe(6);
  });
  it("la descripción se compara sin mayúsculas ni signos", () => {
    const holder = r.filas.find((f) => f.base?.pn === "860504031")!;
    expect(holder.cambios).toEqual([{ tipo: "cantidad", base: "16", comparar: "24" }]);
  });
  it("mismo SC y posición con otro número de parte = cambio de número de parte, no alta + baja", () => {
    const sensor = r.filas.find((f) => f.base?.pn === "869117016")!;
    expect(sensor.comparar?.pn).toBe("869117018");
    expect(sensor.cambios).toEqual([{ tipo: "pn", base: "869117016", comparar: "869117018" }]);
  });
  it("mismo SC y número de parte en otra posición = cambio de posición", () => {
    expect(r.filas.find((f) => f.base?.pn === "860507118")!.cambios).toEqual([{ tipo: "posicion", base: "060", comparar: "130" }]);
  });
  it("duplicados sin posición (SC35) se emparejan por orden y no se eliminan", () => {
    const sc35 = r.filas.filter((f) => f.sc === "SC35");
    expect(sc35.map((f) => `${f.base?.cantidad}→${f.comparar?.cantidad}`)).toEqual(["2→2", "1→1"]);
    expect(r.repetidas).toEqual([
      { archivo: "base", sc: "SC35", posicion: null, pn: "888316009", veces: 2 },
      { archivo: "comparar", sc: "SC35", posicion: null, pn: "888316009", veces: 2 },
    ]);
  });
  it("altas y bajas con su resumen", () => {
    expect(r.filas.find((f) => !f.base)!.cambios).toEqual([{ tipo: "nueva", base: "—", comparar: "Qty 1 · PC · 4K" }]);
    expect(r.filas.find((f) => !f.comparar)!.cambios).toEqual([{ tipo: "retirada", base: "Qty 1 · PC · 16K", comparar: "—" }]);
  });
  it("grupos por SC en orden natural, solo con diferencias", () => {
    expect(r.grupos.map((g) => `${g.sc}:${g.filas.length}`)).toEqual(["SC04:2", "SC05:1", "SC07:1", "SC10:1", "SC12:1"]);
    expect(filtrarGrupos(r.grupos, "nueva").map((g) => g.sc)).toEqual(["SC04"]);
  });
  it("intercambiar base y comparar invierte altas y bajas", () => {
    const inv = compararBoms(B, A);
    expect(inv.conteo).toMatchObject({ nueva: 1, retirada: 1, coinciden: 3 });
    expect(inv.filas.find((f) => !f.comparar)!.base!.pn).toBe("860504040");
  });
  it("se puede ignorar el intervalo (p. ej. hoja 8K contra 16K)", () => {
    expect(compararBoms(A, B, { ignorar: ["intervalo"] }).conteo.intervalo).toBe(0);
  });
  it("dos BOMs iguales no tienen diferencias", () => {
    const igual = compararBoms(A, A);
    expect(igual.conDiferencias).toBe(0);
    expect(igual.grupos).toEqual([]);
  });
});

describe("exportación", () => {
  const e: Etiquetas = {
    tipos: { cantidad: "Cantidad", intervalo: "Intervalo", descripcion: "Descripción", unidad: "Unidad", pn: "Número de parte", nuevoPn: "Nuevo PN", posicion: "Posición", nueva: "Pieza nueva", retirada: "Pieza retirada" },
    coincide: "Coincide",
    columnas: { sc: "SC", nombreSc: "Nombre SC", posicion: "Pos.", pnBase: "PN base", pnComparar: "PN comparar", pn: "PN", descripcion: "Descripción", diferencia: "Diferencia", valorBase: "Base", valorComparar: "Comparar", filaBase: "Fila base", filaComparar: "Fila comparar", base: "Base", comparar: "Comparar", estado: "Estado", cantidadBase: "Qty base", cantidadComparar: "Qty comparar", unidad: "Unidad", intervalo: "Intervalo", prioridad: "Prioridad", recomendacion: "Recomendación", detalle: "Detalle", ejemplos: "Ejemplos" },
    hojas: { diferencias: "Diferencias", lista: "Lista", resumen: "Resumen", recomendaciones: "Recomendaciones" },
    resumen: { base: "Base", comparar: "Comparar", generado: "Generado", piezasBase: "Piezas base", piezasComparar: "Piezas comparar", coinciden: "Coinciden", conDiferencias: "Con diferencias" },
  };
  const r = compararBoms(
    [parte({ cantidad: 16, fila: 10 }), parte({ sc: "SC12", posicion: "050", pn: "860512017", descripcion: "Level probe", fila: 11 })],
    [parte({ cantidad: 24, intervalo: "8K", fila: 20 })],
  );
  it("una fila por diferencia, con trazabilidad a la fila de origen", () => {
    const f = filasDiferencias(r, e);
    expect(f).toHaveLength(1 + 3); // encabezado + cantidad + intervalo + retirada
    expect(f[1]).toEqual(["SC04", "", "110", "860504028", "860504028", "SUCTION CUP", "Cantidad", "16", "24", "10", "20"]);
    expect(f[3].slice(6)).toEqual(["Pieza retirada", "Qty 24 · PC · 4K", "—", "11", "—"]);
  });
  it("BOM completa: ambas cantidades, unidad, intervalo y estado", () => {
    const l = filasLista(r, e);
    expect(l[0]).toEqual(["SC", "Pos.", "PN", "Descripción", "Qty base", "Qty comparar", "Unidad", "Intervalo", "Estado"]);
    expect(l.slice(1)).toEqual([
      ["SC04", "110", "860504028", "SUCTION CUP", 16, 24, "PC", "8K", "Cantidad, Intervalo"],
      ["SC12", "050", "860512017", "Level probe", 24, "—", "PC", "4K", "Pieza retirada"],
    ]);
  });
  it("CSV con ; y comillas", () => {
    expect(aCsv([["a;b", 'di"jo', "ok"]])).toBe('﻿"a;b";"di""jo";ok');
  });
  it("nombre de archivo", () => {
    expect(nombreArchivo({ archivo: "MATRIZ PREVENTIVOS NESTLÉ 069.xlsx", hoja: "16K" }, { archivo: "CFA_812_35 rev2.csv", hoja: "x" }, "2026-10-29", "xlsx"))
      .toBe("Comparacion_BOM_MATRIZ_PREVENTIVOS_NESTLE_069_vs_CFA_812_35_rev2_2026-10-29.xlsx");
  });
});

describe("parsearCsv", () => {
  it("detecta ; y respeta comillas y saltos de línea", () => {
    expect(parsearCsv('﻿Pos.;Component number;Object description\r\n010;860504011;"Vacuum generator; VG-15"\n020;860504012;"Hose ""8x5"""')).toEqual([
      ["Pos.", "Component number", "Object description"], ["010", "860504011", "Vacuum generator; VG-15"], ["020", "860504012", 'Hose "8x5"'],
    ]);
  });
  it("coma como separador", () => {
    expect(parsearCsv("a,b\n1,2\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
