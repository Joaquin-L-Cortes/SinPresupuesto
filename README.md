# Sin-Presupuesto — Eleventy

Sitio migrado de HTML estático a Eleventy (11ty) para tener control total desde Decap CMS.

## Cómo subir a GitHub

1. Abre GitHub Desktop (o la web de GitHub)
2. Crea un repositorio nuevo llamado `SinPresupuesto`
3. Sube todos estos archivos al repositorio
4. Ve a Cloudflare Pages y conecta el repositorio
5. Configura el build:
   - **Build command:** `npm install && npm run build`
   - **Output directory:** `_site`

## Estructura

```
_data/          → JSONs de contenido y navegación
_includes/      → Templates Nunjucks
  modulo.njk    → Template de las 15 páginas de módulos
pages/          → Archivos .njk de cada página (3 líneas cada uno)
admin/          → Decap CMS
  config.yml    → Configuración del CMS (ya actualizada)
```

## Control desde el CMS

Desde Decap CMS ahora puedes controlar:
- **Navegación** → menú principal y secciones del sidebar
- **Páginas de módulos** → agregar, quitar, renombrar secciones
- **Secciones del inicio** → tarjetas de la página principal
- **Horario semanal** → cronograma
- **Contenido de módulos** → archivos, URLs, etc.

## Desarrollo local

```bash
npm install
npm start   # servidor local en http://localhost:8080
```
