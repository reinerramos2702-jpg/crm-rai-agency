# Decisión pendiente: almacenamiento de archivos subidos (Contenido multimedia)

Estado a 16 oct 2026. Decide Reiner. La biblioteca `/contenido-multimedia` ya agrega lo que existe (imágenes del Generador, salidas de campañas, medios de publicaciones programadas, documento de marca) y NO simula subidas.

## Por qué hoy no hay subida libre
- Existe almacenamiento en R2 (`src/lib/r2.ts`: `uploadAsset`, `ingestUrl`, URL firmadas), pero solo lo usan los agentes de IA.
- Cada archivo guardado queda atado a una fila padre: `ContentGridAsset` exige `gridId` y `Asset` exige `taskId`. No hay un modelo de archivo suelto por espacio de trabajo.
- Ningún modelo guarda el tamaño del archivo, por lo que no se puede calcular el espacio usado ni aplicar cuotas por plan.
- Crear la tabla implica una migración (`prisma/schema.prisma`), fuera del alcance de esta ola.

## Opciones
1. **Modelo `MediaAsset` + R2 (recomendada).** Campos: `workspaceId`, `kind`, `name`, `mime`, `sizeBytes`, `r2Key`, `publicUrl`, `tags String[]`, `createdByUserId`, `createdAt`. Ruta `POST /api/media/upload` con URL firmada (PUT directo a R2, sin pasar el archivo por la función). Reutiliza `r2.ts`. Habilita indicador de espacio, cuotas por plan y etiquetas en servidor.
2. **Supabase Storage.** La base ya es Supabase; evita configurar R2 por entorno, pero duplica el patrón de almacenamiento existente y exige políticas por bucket.
3. **Seguir solo con referencias por enlace (estado actual).** Sin migración; los enlaces viven en el navegador de cada persona y no se comparten con el equipo.

## Antes de construir (opción 1)
- Confirmar variables de R2 y dominio público en el entorno de producción.
- Fijar tipos permitidos y tope por archivo (propuesta: imágenes 10 MB, video 200 MB, documentos 25 MB).
- Fijar cuota por plan (planes 34/49/67 USD) y qué pasa al superarla.
- Mover etiquetas y vistas guardadas del navegador al servidor.
