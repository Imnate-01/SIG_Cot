import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validarEnlace,
  MAX_BYTES_EVIDENCIA, carpetaEvidencia, formatearTamano, nombreSeguro, rutaEvidencia, validarArchivo,
} from "./evidencias";

describe("validarArchivo", () => {
  const MB = 1024 * 1024;
  it("acepta PDF, Office, fotos y CSV", () => {
    expect(validarArchivo({ nombre: "PO.pdf", mime: "application/pdf", tamano: 1000 })).toEqual({ ok: true, mime: "application/pdf" });
    expect(validarArchivo({ nombre: "ajustes.XLSX", mime: "", tamano: 10 })).toEqual({ ok: true, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    expect(validarArchivo({ nombre: "foto.jpeg", mime: "image/jpeg", tamano: 5 * MB })).toMatchObject({ ok: true });
    expect(validarArchivo({ nombre: "lista.csv", mime: "text/csv", tamano: 1 })).toMatchObject({ ok: true });
  });
  it("HEIC de Windows/iPhone llega sin tipo: se resuelve por la extensión", () => {
    expect(validarArchivo({ nombre: "IMG_0001.HEIC", mime: "application/octet-stream", tamano: 3 * MB })).toEqual({ ok: true, mime: "image/heic" });
    expect(validarArchivo({ nombre: "IMG_0001.heic", mime: undefined, tamano: 3 * MB })).toEqual({ ok: true, mime: "image/heic" });
  });
  it("límite: 20 MB exactos sí, 20 MB + 1 byte no", () => {
    expect(validarArchivo({ nombre: "a.pdf", tamano: MAX_BYTES_EVIDENCIA })).toMatchObject({ ok: true });
    expect(validarArchivo({ nombre: "a.pdf", tamano: MAX_BYTES_EVIDENCIA + 1 })).toEqual({ ok: false, motivo: "muy_grande" });
  });
  it("rechaza vacíos, ejecutables y tipos que no cuadran", () => {
    expect(validarArchivo({ nombre: "a.pdf", tamano: 0 })).toEqual({ ok: false, motivo: "vacio" });
    expect(validarArchivo({ nombre: "virus.exe", mime: "application/pdf", tamano: 10 })).toEqual({ ok: false, motivo: "tipo_no_permitido" });
    expect(validarArchivo({ nombre: "sin_extension", tamano: 10 })).toEqual({ ok: false, motivo: "tipo_no_permitido" });
    expect(validarArchivo({ nombre: "a.pdf", mime: "application/x-msdownload", tamano: 10 })).toEqual({ ok: false, motivo: "tipo_no_permitido" });
    expect(validarArchivo({ nombre: "a.svg", mime: "image/svg+xml", tamano: 10 })).toEqual({ ok: false, motivo: "tipo_no_permitido" });
  });
});

describe("nombres y rutas", () => {
  it("limpia acentos, espacios y carpetas", () => {
    expect(nombreSeguro("Hoja de ajustes (final) Línea 3.xlsx")).toBe("Hoja_de_ajustes_final_Linea_3.xlsx");
    expect(nombreSeguro("C:\\Users\\yo\\..\\PO 48213.PDF")).toBe("PO_48213.pdf");
    expect(nombreSeguro("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(nombreSeguro("???.pdf")).toBe("archivo.pdf");
  });
  it("la ruta queda dentro de la carpeta de la tarea", () => {
    const r = rutaEvidencia("exp1", "tar1", "u1", "../PO final.pdf");
    expect(r).toBe("pm/exp1/tar1/u1-PO_final.pdf");
    expect(r.startsWith(carpetaEvidencia("exp1", "tar1"))).toBe(true);
    expect(r.includes("..")).toBe(false);
  });
});

describe("formatearTamano", () => {
  it("B, KB y MB", () => {
    expect(formatearTamano(500)).toBe("500 B");
    expect(formatearTamano(2048)).toBe("2 KB");
    expect(formatearTamano(5.5 * 1024 * 1024)).toBe("5.5 MB");
    expect(formatearTamano(null)).toBe("");
  });
});

describe.skipIf(!existsSync(resolve(__dirname, "../../../../backend/src/domain/pmEvidencias.ts")))("copias sincronizadas", () => {
  it("frontend y backend tienen el mismo archivo", () => {
    const n = (s: string) => s.replace(/\r\n/g, "\n");
    expect(n(readFileSync(resolve(__dirname, "../../../../backend/src/domain/pmEvidencias.ts"), "utf8")))
      .toBe(n(readFileSync(resolve(__dirname, "evidencias.ts"), "utf8")));
  });
});

describe("validarEnlace", () => {
  it("acepta enlaces http(s) y completa https:// si falta", () => {
    expect(validarEnlace("https://sig.sharepoint.com/sites/PM/Shared%20Documents/foto.jpg")).toEqual({ ok: true, url: "https://sig.sharepoint.com/sites/PM/Shared%20Documents/foto.jpg", nombre: "sig.sharepoint.com" });
    expect(validarEnlace("  drive.google.com/file/d/abc/view  ", "Fotos del PM")).toEqual({ ok: true, url: "https://drive.google.com/file/d/abc/view", nombre: "Fotos del PM" });
    expect(validarEnlace("www.finlays.net/portal")).toMatchObject({ ok: true, nombre: "finlays.net" });
    expect(validarEnlace("http://intranet.sig.biz:8080/doc")).toMatchObject({ ok: true, url: "http://intranet.sig.biz:8080/doc" });
  });
  it("rechaza vacíos, otros protocolos y texto que no es un enlace", () => {
    expect(validarEnlace("   ")).toEqual({ ok: false, motivo: "vacio" });
    expect(validarEnlace("javascript:alert(1)")).toEqual({ ok: false, motivo: "protocolo" });
    expect(validarEnlace("file:///C:/fotos/pm.jpg")).toEqual({ ok: false, motivo: "protocolo" });
    expect(validarEnlace("mailto:geo@sig.biz")).toEqual({ ok: false, motivo: "protocolo" });
    expect(validarEnlace("fotos del pm")).toEqual({ ok: false, motivo: "invalido" });
    expect(validarEnlace("solotexto")).toEqual({ ok: false, motivo: "invalido" });
    expect(validarEnlace("https://a.com/" + "x".repeat(2100))).toEqual({ ok: false, motivo: "muy_largo" });
  });
});
