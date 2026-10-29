import { describe, it, expect } from "vitest";
import { esEnlaceRecuperacion } from "./recuperacion";

describe("esEnlaceRecuperacion", () => {
  it("detecta el enlace del correo aunque haya caído en el login", () => {
    expect(esEnlaceRecuperacion("#access_token=abc&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery")).toBe(true);
  });
  it("enlace vencido también se reenvía (para pedir otro)", () => {
    expect(esEnlaceRecuperacion("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired")).toBe(true);
  });
  it("otros fragmentos no", () => {
    expect(esEnlaceRecuperacion("")).toBe(false);
    expect(esEnlaceRecuperacion("#access_token=abc&type=signup")).toBe(false);
    expect(esEnlaceRecuperacion("#seccion")).toBe(false);
  });
});
