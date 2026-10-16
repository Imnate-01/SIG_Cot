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
