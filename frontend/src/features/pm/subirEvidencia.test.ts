import { describe, it, expect, vi } from "vitest";
import { cabecerasSubida, subirAUrlFirmada } from "./subirEvidencia";

const archivo = new Blob(["hola"], { type: "" }); // tipo vacío, como manda Windows a veces

describe("subirAUrlFirmada (comentario 5)", () => {
  it("PUT crudo con el tipo MIME validado por el servidor (no el del navegador)", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    await subirAUrlFirmada({ signedUrl: "https://x.supabase.co/storage/v1/object/upload/sign/pm-evidencias/a.heic?token=t", apikey: "anon", mime: "image/heic" }, archivo, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/object/upload/sign/");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(archivo);
    expect(init.headers).toMatchObject({ "content-type": "image/heic", "x-upsert": "false", apikey: "anon" });
  });
  it("sin apikey no manda la cabecera", () => {
    expect(cabecerasSubida({ mime: "application/pdf" })).not.toHaveProperty("apikey");
  });
  it("errores de Storage con mensaje claro", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ message: "mime type application/octet-stream is not supported" }), { status: 415 }));
    await expect(subirAUrlFirmada({ signedUrl: "https://x", mime: "image/png" }, archivo, f as unknown as typeof fetch)).rejects.toThrow("File type not allowed by storage.");
    const g = vi.fn(async () => new Response("", { status: 413 }));
    await expect(subirAUrlFirmada({ signedUrl: "https://x", mime: "image/png" }, archivo, g as unknown as typeof fetch)).rejects.toThrow("too large");
    const h = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    await expect(subirAUrlFirmada({ signedUrl: "https://x", mime: "image/png" }, archivo, h as unknown as typeof fetch)).rejects.toThrow("Could not reach file storage");
  });
  it("backend viejo sin signedUrl → aviso", async () => {
    await expect(subirAUrlFirmada({ mime: "image/png" }, archivo)).rejects.toThrow("upload link");
  });
});
