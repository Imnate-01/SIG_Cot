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

### PM Tracker (fase 1)
- [ ] Con la migración `20261023_01_modulo_pm.sql` aplicada: /pm abre sin error y el menú muestra "PM Tracker" y "New PM"
- [ ] Nuevo PM con inicio 08/08/2027 → la vista previa muestra 04/04, 11/04, 18/04, 11/07, 25/07, 08/08, 15/08 y 29/08 de 2027
- [ ] Crear el PM → abre su detalle con 31 tareas en 8 etapas, y se abre solo la primera etapa con pendientes
- [ ] Marcar una tarea → avance +1, queda "Completed by <tú>"; desmarcarla → avance −1
- [ ] Completar las 31 tareas → el PM pasa a "Completed"; reabrir una → vuelve a "Active"
- [ ] Notas de una tarea y "Open notes" se guardan al salir del campo y siguen ahí al recargar
- [ ] Agregar y quitar un colaborador → aparece junto a "Completed by"; "View history" lo registra
- [ ] Editar detalles → cambiar la fecha de inicio avisa cuántas tareas pendientes se recalculan; las completadas conservan su fecha
- [ ] Cancelar un PM → sale de "Active", y "Reactivate PM" lo regresa
- [ ] Una tarea vencida muestra "Due <fecha>" en rojo; el PM con tareas vencidas aparece como "Overdue" en la lista
- [ ] Tareas con evidencia muestran "Evidence required/optional" (los adjuntos llegan en la fase 2)

### PM Tracker (fase 2: evidencias) — requiere la migración `20261023_02_pm_evidencias.sql`
- [ ] Marcar PM-01 (obligatoria) sin evidencia → aviso "This task requires evidence…" y se abre el panel; no se completa
- [ ] Subir un PDF → aparece en la lista con tamaño, quién lo subió y fecha; el botón de abrir lo muestra en otra pestaña
- [ ] Subir una foto de celular (varios MB) → se sube reducida (más ligera) y se ve bien al abrirla
- [ ] Foto con la cámara en el celular ("Take photo") y foto HEIC de iPhone → se suben
- [ ] Arrastrar 2 archivos juntos al recuadro → se suben los dos
- [ ] Archivo .exe o de más de 20 MB → mensaje de error claro, no se sube
- [ ] Con evidencia ya cargada, PM-01 sí se completa
- [ ] PM-31: "Link quotation" → elegir una cotización → queda ligada (enlace abre la cotización) y cuenta como evidencia; ligar la misma dos veces → aviso
- [ ] Borrar la única evidencia de una tarea completada obligatoria → rechazado ("Reopen the task first"); reabrir y borrar sí funciona
- [ ] El enlace de un archivo expira a los 5 minutos y no se puede adivinar la ruta (bucket privado)
- [ ] "View history" registra "Evidence added/removed"

### PM Tracker (fase 3: alertas en la app) — no requiere migración
- [ ] Menú: "Alerts" muestra un contador rojo si tienes tareas vencidas (azul si solo por vencer); en el celular aparece un punto en el botón del menú
- [ ] /pm/alertas "Mine": salen solo tus tareas — eres responsable, colaborador, o creaste el PM y la tarea no tiene responsable
- [ ] "All PMs": salen las de todos los PM activos (incluye tareas asignadas a otras personas)
- [ ] Una tarea que vence hoy dice "Due today"; mañana "Due tomorrow"; hace 3 días "3 days overdue"; en 8 días ya no aparece
- [ ] Clic en una alerta → abre el PM con la etapa desplegada y la tarea abierta
- [ ] Asignar la tarea a otra persona → desaparece de tus alertas y el contador baja sin recargar
- [ ] Completar la tarea → desaparece de las alertas
- [ ] PM cancelado o completado → sus tareas no generan alertas
- [ ] Revisar en la tarde (después de las 6 pm en México) que "hoy" sea la fecha local, no la del día siguiente

