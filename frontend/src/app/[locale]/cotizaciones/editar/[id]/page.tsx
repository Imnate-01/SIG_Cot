"use client";
import React, { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import {
  precioUnitario as calcularPrecioUnitario,
  precioCatalogo,
  totalLinea,
  recalcularLinea,
  ajustarDesgloseAIngenieros,
  cantidadParaGuardar,
  sumarTotales,
  esCostoVuelo as esTarifaCostoVuelo,
  lineaDesdePartida,
  horasTotalesLinea,
  formatearHoras,
  totalServiciosExternos,
  servicioExternoCapturado,
  partidaDesdeServicioExterno,
  esPartidaServicioExterno,
  servicioExternoDesdePartida,
} from "@/features/cotizaciones/pricing";
import type {
  CotizacionFormData,
  FacturarA,
  ClientePredefinido,
  UsuarioRegistrado,
  Tarifa,
  ServicioTarifado,
  ServicioExternoForm,
} from "@/features/cotizaciones/types";
import { ServiciosExternosEditor } from "@/features/cotizaciones/components/ServiciosExternosEditor";
import { ModalVistaPrevia } from "@/features/cotizaciones/components/ModalVistaPrevia";
import { obtenerClientes, obtenerUsuarios, obtenerServicios, obtenerTarifasCliente } from "@/features/cotizaciones/api";
import { useParams, useRouter } from "next/navigation"; // Added useParams, useRouter
import {
    Eye,
    Save,
    Building2,
    FileText,
    Trash2,
    Sparkles,
    ArrowLeft,
    Edit2,
} from "lucide-react";

import { toast } from "sonner";
import Link from "next/link"; // Added Link

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
    const [itemsServicio, setItemsServicio] = useState<ServicioTarifado[]>([]);
    const [modalVistaPreviaAbierto, setModalVistaPreviaAbierto] = useState<boolean>(false);
    const [serviciosExternos, setServiciosExternos] = useState<ServicioExternoForm[]>([]);

    const [mejorandoTexto, setMejorandoTexto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Client-specific contract rate overrides: { servicio_id: precio_contrato }
    const [tarifasCliente, setTarifasCliente] = useState<Record<string, number>>({});
    const ultimoClienteSolicitado = useRef<string | null>(null);

    // Auto-recalculate items when overrides change
    useEffect(() => {
        setItemsServicio(prev => {
            let changed = false;
            const newItems = prev.map(item => {
                const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
                if (!tarifa) return item;
                
                const expectedTotal = totalLinea(item, tarifa, tarifasCliente);

                if (item.total !== expectedTotal) {
                    changed = true;
                    return { ...item, total: expectedTotal };
                }
                return item;
            });
            return changed ? newItems : prev;
        });
    }, [tarifasCliente, tarifasDisponibles]);

    // FETCH DATA
    useEffect(() => {
        const loadAll = async () => {
            try {
                // 1. Cargar Catálogos
                const [clientes, usuarios] = await Promise.all([obtenerClientes(), obtenerUsuarios()]);
                setClientesDisponibles(clientes);
                setUsuariosRegistrados(usuarios);

                // 2. Cargar Cotización primero para saber la entidad/region
                const { data: cotData } = await api.get(`/cotizaciones/${id}`);
                const cot = cotData.data;
                const cotRegion = cot.condiciones?.entidad || 'MX';

                // 3. Cargar servicios filtrados por region de la cotización
                const listaServicios = await obtenerServicios(cotRegion);
                setTarifasDisponibles(listaServicios);

                if (cot.estado !== 'borrador') {
                    toast.error("Solo se pueden editar cotizaciones en estado borrador");
                    router.push(`/cotizaciones/${id}`);
                    return;
                }

                setFolioGenerado(cot.numero_cotizacion);

                // Parsear datos
                const cliente = cot.clientes || {};
                const todasLasPartidas = cot.cotizacion_items || [];
                // Los servicios externos se editan en su propia tabla
                const items = todasLasPartidas.filter((i: any) => !esPartidaServicioExterno(i));
                setServiciosExternos(
                    todasLasPartidas
                        .filter((i: any) => esPartidaServicioExterno(i))
                        .map((i: any, idx: number) => ({ id: idx + 1, ...servicioExternoDesdePartida(i) }))
                );
                const condiciones = cot.condiciones || {}; // JSONB

                setClienteSeleccionadoId(String(cot.cliente_id));

                // 4. Cargar tarifas especiales de este cliente si tiene
                // (se guardan también en una variable local: el estado de React aún no
                // está actualizado cuando reconstruimos las partidas más abajo)
                let overridesCliente: Record<string, number> = {};
                try {
                    overridesCliente = await obtenerTarifasCliente(cot.cliente_id);
                    setTarifasCliente(overridesCliente);
                } catch (error) {
                    console.warn("No se pudieron cargar tarifas especiales del cliente", error);
                }

                // Populate Form
                if (cot.datos_forma) {
                    setFormData(cot.datos_forma);
                } else {
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
                            observaciones: condiciones.observaciones || "",
                            entidad: condiciones.entidad || "MX"
                        },
                        descripcion: cot.descripcion || "",
                        tipo_servicio: cot.tipo_servicio || "TM"
                    });
                }

                // Populate Items
                // Necesitamos 'descifrar' si es con contrato o no basado en precios, o asumimos contrato
                const loadedItems = items.map((i: any) => {
                    // Buscar tarifa por concepto (aproximado) o precio
                    // Como items guarda texto libre en concepto, tratamos de matchear con tarifaDisponibles
                    // O mejor, si guardamos tarifa_id en items, seria ideal. 
                    // Pero backend actual guarda 'concepto'.
                    // Vamos a intentar buscar por concepto exacto
                    const tarifaEncontrada = listaServicios.find((t: any) => t.concepto === i.concepto);

                    // lineaDesdePartida corrige dos problemas de la versión anterior:
                    //  - En BD `cantidad` = horas × ingenieros; antes se volvía a multiplicar
                    //    por ingenieros al recalcular y el total se duplicaba/triplicaba.
                    //  - Contrato y precio manual se infieren del precio guardado, en lugar de
                    //    asumir siempre "con contrato" (lo que reescribía precios manuales).
                    return {
                        ...lineaDesdePartida(i, tarifaEncontrada, overridesCliente),
                        id: i.id, // ID interno temporal
                        detalles: i.detalles || "",
                        desglose: i.desglose || [], // JSON
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


    // Re-fetch rates filtered by region when entity changes
    const fetchTarifasByRegion = async (region: string) => {
        try {
            setTarifasDisponibles(await obtenerServicios(region));
            // Reset service items since rates changed
            setItemsServicio([{ id: 1, tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: 'init_1', nombre: '', horas: 0 }] }]);
        } catch (error) {
            console.error("Error cargando servicios por región:", error);
        }
    };

    // HANDLERS (Same as Create, but calling update)

    const handleInputChange = <K extends keyof CotizacionFormData>(seccion: K, campo: string, valor: any) => {
        if (!campo) {
            // Campo plano (ej: descripcion, tipo_servicio)
            setFormData((prev) => ({ ...prev, [seccion]: valor }));
        } else {
            // Campo anidado (ej: condiciones.moneda, facturarA.nombre)
            setFormData((prev) => ({ ...prev, [seccion]: { ...(prev[seccion] as Record<string, any> || {}), [campo]: valor } }));
        }
    };

    const handleGuardar = async () => {
        try {
            // Líneas sin tarifa (fila vacía) no se guardan
            const lineasConTarifa = itemsServicio.filter(item => item.tarifaId);
            const externosCapturados = serviciosExternos.filter(servicioExternoCapturado);
            if (lineasConTarifa.length === 0 && externosCapturados.length === 0) {
                toast.error('Error al actualizar', { description: 'Agrega al menos un servicio técnico o un servicio externo.' });
                return;
            }
            setLoading(true)
            const itemsFormateados = lineasConTarifa.map(item => {
                const tarifa = tarifasDisponibles.find(t => String(t.id) === item.tarifaId)
                const precioUnitario = calcularPrecioUnitario(item, tarifa, tarifasCliente);
                const cantidadReal = cantidadParaGuardar(item, tarifa);
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
                itemsServicio: [...itemsFormateados, ...externosCapturados.map(partidaDesdeServicioExterno)],
                total: sumarTotales(lineasConTarifa) + totalServiciosExternos(externosCapturados),
                descripcion: formData.descripcion,
                tipo_servicio: formData.tipo_servicio,
                datos_forma: formData
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

        // Tarifas especiales del cliente (se descarta una respuesta vieja si el
        // usuario ya eligió otro cliente)
        ultimoClienteSolicitado.current = value;
        obtenerTarifasCliente(value)
            .catch(() => ({}))
            .then((tarifas) => {
                if (ultimoClienteSolicitado.current === value) setTarifasCliente(tarifas);
            });
        const cliente = clientesDisponibles.find((c) => String(c.id) === value);
        if (cliente) {
            setFormData(prev => ({ ...prev, facturarA: { ...prev.facturarA, nombre: cliente.nombre, direccion: cliente.direccion, colonia: cliente.colonia, ciudad: cliente.ciudad, cp: cliente.cp } }));
        }
    };

    const handleFacturarFieldChange = (campo: keyof FacturarA, valor: string) => { handleInputChange("facturarA", campo, valor); };
    const agregarLineaServicio = () => { setItemsServicio((prev) => [...prev, { id: Date.now(), tarifaId: "", ingenieros: 1, cantidad: 1, conContrato: true, total: 0, detalles: "", desglose: [{ uid: Date.now().toString(), nombre: '', horas: 0 }] },]); };
    const eliminarLineaServicio = (id: number) => { setItemsServicio((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev); };

    const actualizarLineaServicio = (id: number, campo: keyof Omit<ServicioTarifado, "total">, valor: any) => {
        // Copy paste logic from Create
        setItemsServicio((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const updated: ServicioTarifado = { ...item };
            if (campo === "tarifaId") {
                updated.tarifaId = String(valor);
                const t = tarifasDisponibles.find((x) => String(x.id) === updated.tarifaId);
                if (esTarifaCostoVuelo(t)) {
                    updated.esPrecioManual = true;
                    if (updated.precioManual === undefined) {
                        updated.precioManual = 0;
                    }
                }
            }
            else if (campo === "conContrato") updated.conContrato = Boolean(valor);
            else if (campo === "detalles") updated.detalles = String(valor);
            else if (campo === "esPrecioManual") {
                updated.esPrecioManual = Boolean(valor);
                if (updated.esPrecioManual && updated.precioManual === undefined) {
                    const t = tarifasDisponibles.find((x) => String(x.id) === updated.tarifaId);
                    updated.precioManual = t || (updated.conContrato && tarifasCliente[updated.tarifaId])
            ? precioCatalogo(updated, t, tarifasCliente)
            : undefined;
                }
            }
            else if (campo === "precioManual") updated.precioManual = Number(valor);
            else {
                if (campo === "ingenieros") updated.ingenieros = Number(valor) || 0;
                else if (campo === "cantidad") updated.cantidad = Number(valor) || 0;
                else if (campo === "id") updated.id = Number(valor) || updated.id;
                else (updated as any)[campo] = valor;
            }
            const tarifa = tarifasDisponibles.find((t) => String(t.id) === updated.tarifaId);
            if ((campo === "ingenieros" || campo === "tarifaId") && tarifa?.requiere_desglose) {
              // Una fila de horas por ingeniero (arreglo nuevo: no se muta el estado anterior)
              updated.desglose = ajustarDesgloseAIngenieros(updated.desglose, updated.ingenieros, () => ({ uid: Math.random().toString(), nombre: '', horas: 0 }));
            }
            // Reglas de precio (vuelo, desglose, contrato, manual) en features/cotizaciones/pricing.ts
            return recalcularLinea(updated, tarifa, tarifasCliente);
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
              // cantidad = suma de horas del desglose; total = precio × horas
              return recalcularLinea(updated, tarifa, tarifasCliente);
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
        } catch { toast.error("Error AI"); } finally { setMejorandoTexto(false); }
    };

    const subtotalServicios = sumarTotales(itemsServicio);
    const subtotalExternos = totalServiciosExternos(serviciosExternos);
    const totalServicios = subtotalServicios + subtotalExternos;

    if (initialLoading) return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">Cargando datos de cotización...</p>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href={`/cotizaciones/${id}`} className="flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors mb-4">
                        <ArrowLeft size={20} className="mr-2" /> Volver al detalle
                    </Link>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border-t-4 border-blue-600">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Editar Cotización</h1>
                            <p className="text-gray-500 dark:text-gray-400">Modificando cotización folio: <b>{folioGenerado}</b></p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full font-bold text-sm">
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Entidad Emisora</label>
                            <select value={formData.condiciones.entidad || 'MX'} onChange={(e) => {
                                const val = e.target.value as "MX" | "US";
                                const proveedorUS = { nombre: "SIG Combibloc Inc.", direccion: "2501 Seaport Drive - Suite 100", colonia: "", ciudad: "Chester, PA 19013", cp: "19013", rfc: "" };
                                const proveedorMX = { nombre: "SIG Combibloc México, S.A. de C.V.", direccion: "Av. Emilio Castelar No. 75", colonia: "Polanco IV Sección", ciudad: "Ciudad de México", cp: "11550", rfc: "" };
                                setFormData(prev => ({
                                    ...prev,
                                    condiciones: { ...prev.condiciones, entidad: val, moneda: val === "US" ? "USD" : prev.condiciones.moneda },
                                    proveedor: val === "US" ? proveedorUS : proveedorMX
                                }));
                                // Re-fetch tarifas for the selected region
                                fetchTarifasByRegion(val);
                            }} className="premium-select w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="MX">SIG MX (México)</option>
                                <option value="US">SIG US (Estados Unidos)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Servicio</label>
                            <select
                                value={formData.tipo_servicio}
                                onChange={(e) => handleInputChange("tipo_servicio", "", e.target.value)}
                                className="premium-select w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="TM">Mantenimiento (TM)</option>
                                <option value="Project">Proyecto (Project)</option>
                                <option value="Training">Entrenamiento</option>
                                <option value="Spares">Repuestos</option>
                            </select>
                        </div>

                        {formData.condiciones.entidad !== "US" ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda</label>
                                <select
                                    value={formData.condiciones.moneda}
                                    onChange={(e) => handleInputChange("condiciones", "moneda", e.target.value)}
                                    className="premium-select w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="USD">Dólares (USD)</option>
                                    <option value="MXN">Pesos Mexicanos (MXN)</option>
                                    <option value="EUR">Euros (EUR)</option>
                                </select>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Scope of visit</label>
                                    <input type="text" value={formData.condiciones.scopeOfVisit || ""} onChange={(e) => handleInputChange("condiciones", "scopeOfVisit", e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter scope of visit..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Equipment to be Serviced</label>
                                    <input type="text" value={formData.condiciones.equipmentToService || ""} onChange={(e) => handleInputChange("condiciones", "equipmentToService", e.target.value)} className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter equipment details..." />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* SECCIONES DEL FORMULARIO (Reuse same UI structure) */}

                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl"><Building2 className="text-blue-600 dark:text-blue-400" size={24} /></div>
                        <div><h2 className="text-2xl font-bold text-gray-800 dark:text-white">Proveedor & Cliente</h2></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Cliente</label>
                            <select value={clienteSeleccionadoId} onChange={(e) => handleSelectCliente(e.target.value)} className="premium-select w-full p-3 border border-gray-300 rounded-xl dark:border-zinc-700 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500">
                                <option value="">Seleccionar...</option>
                                {clientesDisponibles
                                    .filter((c) => {
                                        const isUS = formData.condiciones.entidad === "US" || formData.condiciones.entidad === "CA";
                                        if (isUS) return c.pais === "US" || c.pais === "CA";
                                        return c.pais === "MX" || !c.pais;
                                    })
                                    .map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Nombre Cliente (Facturar A)</label>
                            <input type="text" value={formData.facturarA.nombre} onChange={(e) => handleFacturarFieldChange("nombre", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Dirección</label>
                            <input type="text" value={formData.facturarA.direccion} onChange={(e) => handleFacturarFieldChange("direccion", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Ciudad</label>
                            <input type="text" value={formData.facturarA.ciudad} onChange={(e) => handleFacturarFieldChange("ciudad", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                    </div>
                </div>

                {/* SERVICIOS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border border-gray-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Servicios</h2>
                        <button onClick={agregarLineaServicio} className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">+ Agregar</button>
                    </div>

                    <div className="space-y-6">
                        {itemsServicio.map((item) => {
                            const tarifa = tarifasDisponibles.find((t) => String(t.id) === item.tarifaId);
                            const esViaje = tarifa?.requiere_desglose;
                            return (
                                <div key={item.id} className="border border-gray-200 dark:border-zinc-700 p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 relative">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Concepto</label>
                                            <select value={item.tarifaId} onChange={(e) => actualizarLineaServicio(item.id, "tarifaId", e.target.value)} className="premium-select w-full p-2 border border-gray-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white mt-1 focus:ring-2 focus:ring-blue-500">
                                                <option value="">Seleccionar</option>
                                                {tarifasDisponibles.map(t => <option key={t.id} value={t.id}>{t.concepto}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Ingenieros</label>
                                            <input type="number" min="1" value={item.ingenieros} onChange={(e) => actualizarLineaServicio(item.id, "ingenieros", e.target.value)} className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded text-center bg-white dark:bg-zinc-800 text-gray-900 dark:text-white mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">{esViaje ? 'Total horas (suma)' : tarifa?.unidad === 'dia' ? 'Días por ingeniero' : 'Horas por ingeniero'}</label>
                                            <input type="number" value={item.cantidad} onChange={(e) => !esViaje && actualizarLineaServicio(item.id, "cantidad", e.target.value)} readOnly={!!esViaje} className={`w-full p-2 border rounded text-center mt-1 ${esViaje ? 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-zinc-600' : 'border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white'}`} />
                                        </div>
                                    </div>
                                    {/* Desglose de viaje */}
                                    {esViaje && (
                                        <div className="mb-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800/50">
                                            {item.desglose.map((d, idx) => (
                                                <div key={idx} className="flex gap-2 mb-1 items-center">
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-6">#{idx + 1}</span>
                                                    <input placeholder="Nombre" value={d.nombre} onChange={(e) => actualizarDesglose(item.id, idx, 'nombre', e.target.value)} className="flex-1 p-1 border border-gray-300 dark:border-zinc-600 rounded text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
                                                    <input type="number" placeholder="Hrs" value={d.horas} onChange={(e) => actualizarDesglose(item.id, idx, 'horas', e.target.value)} className="w-20 p-1 border border-gray-300 dark:border-zinc-600 rounded text-sm text-center bg-white dark:bg-zinc-800 text-gray-900 dark:text-white" />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-3 border-t border-gray-200 dark:border-zinc-700 mt-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</span>
                                            <label className="inline-flex items-center gap-1 text-sm cursor-pointer text-gray-700 dark:text-gray-300"><input type="radio" className="accent-blue-600" checked={item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", true)} /> Con Contrato</label>
                                            <label className="inline-flex items-center gap-1 text-sm cursor-pointer text-gray-700 dark:text-gray-300"><input type="radio" className="accent-blue-600" checked={!item.conContrato} onChange={() => actualizarLineaServicio(item.id, "conContrato", false)} /> Sin Contrato</label>
                                            
                                            <div className="flex items-center bg-gray-100 dark:bg-zinc-800/50 rounded-lg p-1 ml-2">
                                                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${item.esPrecioManual ? 'bg-white text-blue-600 dark:bg-zinc-700 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-zinc-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-transparent'}`}>
                                                    <input type="checkbox" className="sr-only" checked={!!item.esPrecioManual} onChange={(e) => actualizarLineaServicio(item.id, "esPrecioManual", e.target.checked)} /> 
                                                    {item.esPrecioManual ? <Edit2 size={14} /> : null} Precio Manual
                                                </label>
                                            </div>

                                            {item.esPrecioManual && (
                                                <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg px-3 py-1.5 transition-all shadow-sm">
                                                    <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">$</span>
                                                    <input type="number" min={0} step="0.01" value={item.precioManual !== undefined ? item.precioManual : (tarifa ? precioCatalogo(item, tarifa, tarifasCliente) : undefined)} onChange={(e) => actualizarLineaServicio(item.id, "precioManual", Number(e.target.value))} className="w-24 text-sm font-bold bg-transparent text-blue-900 dark:text-white outline-none placeholder-blue-300 dark:placeholder-blue-700" />
                                                </div>
                                            )}
                      {item.esPrecioManual && !esTarifaCostoVuelo(tarifa) && (<p className="basis-full text-xs text-sig-muted dark:text-gray-400">Precio manual activo: no cambia al elegir Con o Sin contrato. Desmárcalo para usar el precio del catálogo.</p>)}
                                            
                                            {tarifa && !item.esPrecioManual && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                    (${precioCatalogo(item, tarifa, tarifasCliente).toFixed(2)} / {tarifa.unidad})
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                            <div className="flex flex-col items-end"><span className="text-xs text-gray-500 dark:text-gray-400">Total</span><span className="text-xl font-bold text-gray-800 dark:text-white">${item.total.toFixed(2)}</span>{tarifa && !esTarifaCostoVuelo(tarifa) && <span className="text-xs text-gray-500 dark:text-gray-400">= ${calcularPrecioUnitario(item, tarifa, tarifasCliente).toFixed(2)} × {formatearHoras(horasTotalesLinea(item, tarifa))} h totales</span>}</div>
                                            {itemsServicio.length > 1 && <button onClick={() => eliminarLineaServicio(item.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 transition-colors"><Trash2 size={20} /></button>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 flex justify-end">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-xl min-w-[300px]">
                            <div className="flex justify-between gap-6 mb-2 text-gray-700 dark:text-gray-300"><span>{subtotalExternos !== 0 ? "Subtotal servicios técnicos:" : "Subtotal:"}</span><span className="font-bold">${subtotalServicios.toFixed(2)}</span></div>
                            {subtotalExternos !== 0 && <div className="flex justify-between gap-6 mb-2 text-gray-700 dark:text-gray-300"><span>Subtotal servicios externos:</span><span className="font-bold">${subtotalExternos.toFixed(2)}</span></div>}
                            <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700/50 text-xl font-bold text-blue-800 dark:text-blue-300"><span>Total:</span><span>${totalServicios.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>

                <ServiciosExternosEditor
                    filas={serviciosExternos}
                    onChange={setServiciosExternos}
                    titulo={formData.condiciones.tituloServiciosExternos || ""}
                    onTituloChange={(v) => handleInputChange("condiciones", "tituloServiciosExternos", v)}
                    moneda={formData.condiciones.moneda}
                />

                {/* CONDITIONS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8 mb-6 border border-gray-200 dark:border-zinc-800">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Condiciones</h3>
                    <textarea rows={3} value={formData.condiciones.observaciones} onChange={(e) => handleInputChange("condiciones", "observaciones", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm mb-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Observaciones..." />
                    <div className="flex gap-2">
                        <button onClick={mejorarObservaciones} disabled={mejorandoTexto} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Sparkles size={12} /> Mejorar con IA</button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                        <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Máquina / Machine</label>
                        <textarea rows={2} value={formData.condiciones.maquina || ""} onChange={(e) => handleInputChange("condiciones", "maquina", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm mb-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={formData.condiciones.entidad === "US" ? "CFA 406-32\n850451014" : "Máquina y serie"} />
                    </div>

                    {formData.condiciones.entidad === "US" && (
                        <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Terms</label>
                                <input type="text" value={formData.condiciones.paymentTerms || ""} onChange={(e) => handleInputChange("condiciones", "paymentTerms", e.target.value)} className="w-full p-3 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter payment terms..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* ACTIONS */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex justify-end gap-4 border border-gray-200 dark:border-zinc-800">
                    <button onClick={() => router.push(`/cotizaciones/${id}`)} className="px-6 py-3 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
                    <button onClick={() => setModalVistaPreviaAbierto(true)} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-colors"><Eye size={20} /> Vista Previa</button>
                    <button onClick={handleGuardar} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 font-bold shadow-lg disabled:opacity-60 transition-colors">{loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</> : <><Save size={18} /> Guardar Cambios</>}</button>
                </div>

            </div>

            <ModalVistaPrevia
                isOpen={modalVistaPreviaAbierto}
                onClose={() => setModalVistaPreviaAbierto(false)}
                formData={formData}
                itemsServicio={itemsServicio}
                tarifas={tarifasDisponibles}
                folio={folioGenerado}
                usuariosRegistrados={usuariosRegistrados}
                tarifasCliente={tarifasCliente}
                serviciosExternos={serviciosExternos}
            />
        </div>
    );
};

export default EditarCotizacionPage;

