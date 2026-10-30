import { describe, it, expect } from "vitest";
import { seccionDeRuta, puedeVerRuta, areasSolicitables, type Accesos } from "./areas";

const admin: Accesos = { esAdmin: true, areas: ["cotizaciones", "mantenimiento", "food_safety"] };
const geovanni: Accesos = { esAdmin: false, areas: ["cotizaciones"] };
const julio: Accesos = { esAdmin: false, areas: ["cotizaciones", "mantenimiento"] };

describe("seccionDeRuta", () => {
  it("ubica cada pantalla en su área, con o sin idioma", () => {
    expect(seccionDeRuta("/cotizaciones/nueva")).toBe("cotizaciones");
    expect(seccionDeRuta("/en/cotizaciones-us")).toBe("cotizaciones");
    expect(seccionDeRuta("/clientes")).toBe("cotizaciones");
    expect(seccionDeRuta("/pm/123")).toBe("mantenimiento");
    expect(seccionDeRuta("/en/bom")).toBe("mantenimiento");
    expect(seccionDeRuta("/food-safety-audit/nuevo")).toBe("food_safety");
    expect(seccionDeRuta("/cuenta/solicitudes")).toBe("administracion");
    expect(seccionDeRuta("/configuracion")).toBe("administracion");
  });
  it("no confunde prefijos parecidos ni marca rutas sin área", () => {
    expect(seccionDeRuta("/reportestec/nuevo")).toBeNull();
    expect(seccionDeRuta("/reportes")).toBe("cotizaciones");
    expect(seccionDeRuta("/inicio")).toBeNull();
    expect(seccionDeRuta("/en")).toBeNull();
  });
});

describe("puedeVerRuta", () => {
  it("Geovanni solo entra a Cotizaciones y a su Administración personal", () => {
    expect(puedeVerRuta(geovanni, "/cotizaciones")).toBe(true);
    expect(puedeVerRuta(geovanni, "/pm")).toBe(false);
    expect(puedeVerRuta(geovanni, "/bom")).toBe(false);
    expect(puedeVerRuta(geovanni, "/food-safety-audit")).toBe(false);
    expect(puedeVerRuta(geovanni, "/cuenta/actividad")).toBe(true);
    expect(puedeVerRuta(geovanni, "/usuarios")).toBe(false);
  });
  it("Julio entra a Cotizaciones y Mantenimiento", () => {
    expect(puedeVerRuta(julio, "/pm/nuevo")).toBe(true);
    expect(puedeVerRuta(julio, "/bom")).toBe(true);
    expect(puedeVerRuta(julio, "/en/clientes")).toBe(true);
    expect(puedeVerRuta(julio, "/food-safety-audit")).toBe(false);
  });
  it("un administrador entra a todo, incluido Usuarios", () => {
    expect(puedeVerRuta(admin, "/usuarios")).toBe(true);
    expect(puedeVerRuta(admin, "/food-safety-audit")).toBe(true);
  });
});

describe("areasSolicitables", () => {
  it("ofrece las que no tiene ni tiene pendientes; a un administrador ninguna", () => {
    expect(areasSolicitables(geovanni, [])).toEqual(["mantenimiento", "food_safety"]);
    expect(areasSolicitables(geovanni, ["mantenimiento"])).toEqual(["food_safety"]);
    expect(areasSolicitables(admin, [])).toEqual([]);
  });
});
