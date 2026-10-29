/**
 * Autollenado del encabezado de un PM a partir del cliente elegido (comentario 1):
 *   Planta     ← direcciones del cliente (cliente_direcciones)
 *   Máquina    ← máquinas del cliente (cliente_maquinas), filtradas por planta
 *   Contacto   ← contacto de la planta; si no tiene, el del cliente
 *   SAM / FSE  ← el último PM de ese cliente; se sugieren también los usuarios
 *
 * Todo sigue siendo editable. Un valor que el usuario escribió a mano nunca se
 * sobrescribe: solo se reemplazan campos vacíos o que se llenaron solos antes.
 */

export interface DireccionCliente {
  id: number;
  tipo?: string | null;
  empresa_planta_nombre?: string | null;
  ciudad?: string | null;
  contacto_nombre?: string | null;
  contacto_correo?: string | null;
  contacto_telefono?: string | null;
  activo?: boolean | null;
}

export interface MaquinaCliente {
  id: number;
  modelo_maquina?: string | null;
  serie?: string | null;
  machine_id?: string | null;
  direccion_id?: number | null;
  activo?: boolean | null;
}

export interface ClienteAutollenado {
  id: number;
  nombre: string;
  empresa?: string | null;
  contacto_nombre?: string | null;
  correo?: string | null;
  telefono?: string | null;
  cliente_direcciones?: DireccionCliente[] | null;
  cliente_maquinas?: MaquinaCliente[] | null;
}

export interface PmPrevio {
  fecha_inicio: string;
  sam?: string | null;
  fse_filler?: string | null;
  fse_downline?: string | null;
  planta?: string | null;
  linea?: string | null;
}

export interface Opcion {
  valor: string;
  detalle?: string;
}

const limpio = (s: string | null | undefined) => (s || "").trim();
const igual = (a: string | null | undefined, b: string | null | undefined) => limpio(a).toLowerCase() === limpio(b).toLowerCase();
const activa = (x: { activo?: boolean | null }) => x.activo !== false;

/** Plantas del cliente (sin repetir nombre). Se prefieren las de entrega (ship_to). */
export function plantasDe(c: ClienteAutollenado | undefined): Array<DireccionCliente & { nombre: string }> {
  const dirs = (c?.cliente_direcciones || []).filter(activa).filter((d) => limpio(d.empresa_planta_nombre));
  const orden = [...dirs].sort((a, b) => Number(b.tipo === "ship_to") - Number(a.tipo === "ship_to"));
  const vistas = new Set<string>();
  const res: Array<DireccionCliente & { nombre: string }> = [];
  for (const d of orden) {
    const nombre = limpio(d.empresa_planta_nombre);
    if (vistas.has(nombre.toLowerCase())) continue;
    vistas.add(nombre.toLowerCase());
    res.push({ ...d, nombre });
  }
  return res;
}

export function opcionesPlanta(c: ClienteAutollenado | undefined): Opcion[] {
  return plantasDe(c).map((p) => ({ valor: p.nombre, detalle: limpio(p.ciudad) || undefined }));
}

/** Texto que identifica a una máquina en el campo "Machine / Line". */
export function nombreMaquina(m: MaquinaCliente): string {
  return limpio(m.machine_id) || [limpio(m.modelo_maquina), limpio(m.serie)].filter(Boolean).join(" ");
}

/**
 * Máquinas del cliente. Si se eligió una planta conocida, primero las de esa
 * planta y después las que no tienen planta asignada; las de otras plantas no.
 */
export function opcionesMaquina(c: ClienteAutollenado | undefined, planta: string): Opcion[] {
  const maquinas = (c?.cliente_maquinas || []).filter(activa).filter((m) => nombreMaquina(m));
  const ids = new Set(plantasDe(c).filter((p) => igual(p.nombre, planta)).map((p) => p.id));
  // Todas las direcciones con ese nombre (puede haber bill_to y ship_to con el mismo)
  for (const d of c?.cliente_direcciones || []) if (igual(d.empresa_planta_nombre, planta)) ids.add(d.id);
  const filtradas = ids.size === 0
    ? maquinas
    : [...maquinas.filter((m) => m.direccion_id != null && ids.has(m.direccion_id)), ...maquinas.filter((m) => m.direccion_id == null)];
  const vistas = new Set<string>();
  return filtradas.flatMap((m) => {
    const valor = nombreMaquina(m);
    if (vistas.has(valor)) return [];
    vistas.add(valor);
    const detalle = limpio(m.serie) ? `S/N ${limpio(m.serie)}` : undefined;
    return [{ valor, detalle }];
  });
}

export interface Contacto { nombre: string; correo: string; telefono: string }

/** Contactos del cliente: los de sus plantas (la elegida primero) y el general. */
export function contactosDe(c: ClienteAutollenado | undefined, planta = ""): Contacto[] {
  if (!c) return [];
  const dirs = (c.cliente_direcciones || []).filter(activa);
  const ordenadas = [...dirs].sort((a, b) => Number(igual(b.empresa_planta_nombre, planta)) - Number(igual(a.empresa_planta_nombre, planta)));
  const lista: Contacto[] = [
    ...ordenadas.map((d) => ({ nombre: limpio(d.contacto_nombre), correo: limpio(d.contacto_correo), telefono: limpio(d.contacto_telefono) })),
    { nombre: limpio(c.contacto_nombre), correo: limpio(c.correo), telefono: limpio(c.telefono) },
  ];
  const vistos = new Set<string>();
  return lista.filter((x) => {
    if (!x.nombre) return false;
    const k = x.nombre.toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Contacto sugerido para una planta: el de la planta; si no tiene, el del cliente. */
export function contactoSugerido(c: ClienteAutollenado | undefined, planta: string): Contacto {
  const p = plantasDe(c).find((x) => igual(x.nombre, planta) && limpio(x.contacto_nombre));
  if (p) return { nombre: limpio(p.contacto_nombre), correo: limpio(p.contacto_correo), telefono: limpio(p.contacto_telefono) };
  return { nombre: limpio(c?.contacto_nombre), correo: limpio(c?.correo), telefono: limpio(c?.telefono) };
}

/** Equipo del último PM del cliente (el de fecha de inicio más reciente). */
export function equipoAnterior(previos: PmPrevio[]): { sam: string; fse_filler: string; fse_downline: string } {
  const ultimo = [...previos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
  return { sam: limpio(ultimo?.sam), fse_filler: limpio(ultimo?.fse_filler), fse_downline: limpio(ultimo?.fse_downline) };
}

/** Sugerencias para SAM/FSE: lo usado antes con este cliente y luego los usuarios. */
export function opcionesPersona(previos: PmPrevio[], campo: "sam" | "fse_filler" | "fse_downline", usuarios: Array<{ nombre?: string | null; departamento?: string | null }>): Opcion[] {
  const vistas = new Set<string>();
  const res: Opcion[] = [];
  const agregar = (valor: string, detalle?: string) => {
    const v = limpio(valor);
    if (!v || vistas.has(v.toLowerCase())) return;
    vistas.add(v.toLowerCase());
    res.push({ valor: v, detalle });
  };
  [...previos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio)).forEach((p) => agregar(p[campo] || "", "Previous PM"));
  usuarios.forEach((u) => agregar(u.nombre || "", limpio(u.departamento) || undefined));
  return res;
}

/**
 * Aplica valores sugeridos sin pisar lo que el usuario escribió: un campo se
 * reemplaza si está vacío o si su valor actual es el que se llenó solo la vez anterior.
 * Devuelve el formulario nuevo y el registro de lo autollenado.
 */
export function aplicarSugerencias<T extends Record<string, string>>(
  form: T, auto: Partial<Record<keyof T, string>>, sugeridos: Partial<Record<keyof T, string>>,
): { form: T; auto: Partial<Record<keyof T, string>> } {
  const nuevoForm = { ...form };
  const nuevoAuto = { ...auto };
  for (const k of Object.keys(sugeridos) as Array<keyof T>) {
    const valor = sugeridos[k] ?? "";
    const actual = form[k] ?? "";
    const tocable = actual === "" || actual === (auto[k] ?? "");
    if (!tocable) continue;
    nuevoForm[k] = valor as T[keyof T];
    nuevoAuto[k] = valor;
  }
  return { form: nuevoForm, auto: nuevoAuto };
}
