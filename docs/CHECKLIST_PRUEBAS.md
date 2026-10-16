# Checklist de pruebas manuales (smoke test)

Correr después de cada fase del refactor, con backend y frontend levantados en local.
Marca cada punto; si algo falla, el commit de esa fase se puede revertir con `git revert`.

## Sesión
- [ ] Login con usuario @sig.biz → redirige a /cotizaciones (o /food-safety-audit si es aséptico)
- [ ] Recargar la página tras 1 h (token expirado) → se renueva solo, sin volver al login
- [ ] Logout / sesión expirada → redirige a /es/login?expired=1

## Cotizaciones MX
- [ ] Nueva cotización: elegir cliente existente → se llenan Sold To, Ship To y contacto
- [ ] Cliente con tarifas de contrato → el precio unitario usa la tarifa del cliente
- [ ] Agregar 3 partidas (una con desglose de ingenieros, una con precio manual) → totales correctos
- [ ] Vista previa PDF: precios, firma y puesto correctos
- [ ] Guardar → aparece folio SIG-MX-{id}
- [ ] IA: "Mejorar texto", "Extraer cliente" y "Generar correo" responden
- [ ] Descargar PDF con reporte técnico adjunto (merge)
- [ ] Editar el borrador → cambios guardados, partidas intactas
- [ ] Kanban: mover a "aceptada" con OC → estado persiste al recargar
- [ ] Detalle /cotizaciones/{id} → PDF igual al de la creación

## Cotizaciones US
- [ ] Nueva cotización US Standard → guarda y genera quote_number YYYYMMDD_N
- [ ] PDF Standard Rates correcto

## Catálogos
- [ ] Servicios: crear, editar precio, desactivar
- [ ] Clientes: crear con 2 direcciones, editar (agregar/quitar dirección), eliminar

## Reportes
- [ ] Dashboard /reportes carga KPIs y gráficas
- [ ] Predicción con IA responde

## Reporte técnico (TSR)
- [ ] Nuevo reporte: autosave de borrador funciona, firmas se dibujan
- [ ] Finalizar → aparece en el listado

## Food Safety Audit
- [ ] Crear reporte (folio FSA-AAAA-NNNN)
- [ ] Subir foto JPG y HEIC, editar caption, reemplazar y borrar
- [ ] Autosave del wizard en cada paso
- [ ] Generar PDF: portada, hallazgos COP con fotos, secciones 2-6 y firmas
- [ ] Texto con caracteres especiales (`<`, `>`, `&`, comillas) se ve literal en el PDF

## Agregado tras el refactor (fases 2–6)
- [ ] Abrir una cotización con 2+ ingenieros en "Editar" → el total NO cambia al cargar
- [ ] Editar una cotización con precio manual o "sin contrato" → se conserva al abrirla
- [ ] Cambiar rápido entre dos clientes con tarifas especiales → se aplican las del último elegido
- [ ] Mover una tarjeta en el Kanban con el backend apagado → la tarjeta regresa a su columna
- [ ] Log del backend: no aparecen avisos `[precios]` en cotizaciones normales
- [ ] Log del backend: no aparece `[migración pendiente]` (si ya aplicaste la migración)
- [ ] Con `ROLES_GESTION_CATALOGO` definido, un usuario sin ese rol recibe 403 al editar un servicio
- [ ] Sin sesión, /es/food-safety-audit redirige al login

## Comentarios de usuarios (octubre 2026)
### Horas duplicadas y claridad de horas
- [ ] Cotización con 2 ingenieros × 40 h → guardar → Editar → sigue en 40 h y mismo total → guardar sin cambios → mismo total
- [ ] PDF: columnas `Ing. | Hrs/Ing. | Hrs. totales | P. Unit. | Total`; en cada línea Total = Hrs. totales × P. Unit.
- [ ] Horas de viaje con desglose 5 + 5: Hrs/Ing. = 5, Hrs. totales = 10
- [ ] En el formulario, bajo cada "Total línea" aparece "= $precio × N h totales"

### Servicios externos / entrenamientos
- [ ] Agregar 2 filas (detalle, cantidad, P. Unit.) → el total de la cotización las suma
- [ ] Cotización SOLO con servicios externos (sin tarifa seleccionada) se guarda
- [ ] PDF de vista previa y PDF guardado muestran la tabla con el título capturado y "Subtotal servicios técnicos / adicionales"
- [ ] Editar una cotización con servicios externos → aparecen en su tabla, no como líneas de servicio
- [ ] Sin servicios y sin filas externas → mensaje "Agrega al menos un servicio…"

### Usuarios y contraseñas
- [ ] Backend con `ROLES_ADMIN_USUARIOS` vacío → el menú no muestra "Usuarios" y /usuarios dice "Sin acceso"
- [ ] Con un rol configurado: crear usuario → aparece la contraseña temporal → ese usuario inicia sesión sin confirmar correo
- [ ] Restablecer contraseña de un usuario → la anterior deja de funcionar y la temporal sí
- [ ] Desactivar un usuario → no puede iniciar sesión; activarlo → vuelve a entrar
- [ ] "¿Olvidaste tu contraseña?" → /recuperar → llega el correo (requiere SMTP propio en Supabase) → enlace abre /restablecer → nueva contraseña funciona
- [ ] Enlace de recuperación viejo o ya usado → "El enlace no es válido o expiró"
- [ ] Con Supabase inaccesible, registro/login muestran el mensaje de conexión (no "fetch failed")
