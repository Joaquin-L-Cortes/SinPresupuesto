// keystatic.config.ts
// Usa GitHub storage en producción (secrets ya configurados en sinpresupuesto-save01):
//   KEYSTATIC_GITHUB_CLIENT_ID
//   KEYSTATIC_GITHUB_CLIENT_SECRET
//   KEYSTATIC_SECRET

import { config, fields, collection, singleton } from "@keystatic/core";

const isProd = process.env.NODE_ENV === "production";

export default config({
  storage: isProd
    ? {
        kind: "github",
        repo: "Joaquin-L-Cortes/SinPresupuesto",
      }
    : { kind: "local" },

  ui: {
    brand: { name: "Sin-Presupuesto · CMS" },
  },

  // ─────────────────────────────────────────────
  //  COLLECTIONS
  // ─────────────────────────────────────────────
  collections: {
    /** Secciones de material (temas del Classroom) */
    secciones: collection({
      label: "Secciones de material",
      slugField: "titulo",
      path: "content/secciones/*",
      schema: {
        titulo:      fields.slug({ name: { label: "Título" } }),
        topicId:     fields.text({ label: "ID de tema (Classroom)" }),
        emoji:       fields.text({ label: "Emoji", defaultValue: "📁" }),
        visible:     fields.checkbox({ label: "Visible", defaultValue: true }),
        descripcion: fields.text({ label: "Descripción breve", multiline: true }),
      },
    }),

    /** Redes sociales mostradas en /redes */
    redes: collection({
      label: "Redes sociales",
      slugField: "nombre",
      path: "content/redes/*",
      schema: {
        nombre:  fields.slug({ name: { label: "Nombre de la red" } }),
        emoji:   fields.text({ label: "Emoji", defaultValue: "🔗" }),
        handle:  fields.text({ label: "Handle / texto secundario" }),
        url:     fields.url({ label: "URL" }),
        bgColor: fields.text({ label: "Color de fondo del ícono (hex)", defaultValue: "#f0f0f0" }),
        orden:   fields.integer({ label: "Orden de aparición", defaultValue: 0 }),
      },
    }),
  },

  // ─────────────────────────────────────────────
  //  SINGLETONS
  // ─────────────────────────────────────────────
  singletons: {
    /** Textos de la sección hero de la página de inicio */
    hero: singleton({
      label: "Hero — página de inicio",
      path: "content/hero",
      schema: {
        eyebrow:     fields.text({ label: "Texto eyebrow (sobre el título)" }),
        titulo:      fields.text({ label: "Título principal", multiline: true }),
        descripcion: fields.text({ label: "Descripción del hero", multiline: true }),
        logoSrc:     fields.text({ label: "Ruta de imagen del logo hero (ej: /logos/filosofia.png)" }),
        logoAlt:     fields.text({ label: "Alt del logo hero" }),
      },
    }),

    /** Metadatos SEO */
    seo: singleton({
      label: "SEO — metadatos del sitio",
      path: "content/seo",
      schema: {
        titleHome:       fields.text({ label: "Title — página de inicio" }),
        descriptionHome: fields.text({ label: "Description — página de inicio", multiline: true }),
      },
    }),

    /** Navegación principal */
    nav: singleton({
      label: "Navegación",
      path: "content/nav",
      schema: {
        logoSrc:       fields.text({ label: "Ruta imagen logo nav (ej: /logos/filosofia.png)" }),
        logoAlt:       fields.text({ label: "Alt del logo nav" }),
        nombreSitio:   fields.text({ label: "Nombre del sitio en el nav" }),
        botonIngresar: fields.text({ label: "Texto botón de ingreso (ej: 👤 Ingresar)" }),
        links: fields.array(
          fields.object({
            href:  fields.text({ label: "URL" }),
            label: fields.text({ label: "Etiqueta" }),
          }),
          { label: "Links adicionales del nav", itemLabel: p => p.fields.label.value },
        ),
      },
    }),

    /** Footer */
    footer: singleton({
      label: "Footer",
      path: "content/footer",
      schema: {
        linea1: fields.text({ label: "Primera línea" }),
        linea2: fields.text({ label: "Segunda línea (subtexto pequeño)" }),
      },
    }),

    /** Configuración general del sitio + links sociales */
    sitio: singleton({
      label: "Configuración del sitio",
      path: "content/sitio",
      schema: {
        nombre:      fields.text({ label: "Nombre del sitio" }),
        descripcion: fields.text({ label: "Descripción", multiline: true }),
        nequi:       fields.text({ label: "Número Nequi/Bancolombia" }),
        whatsapp:    fields.url({ label: "Link de WhatsApp" }),
        youtube:     fields.url({ label: "Link de YouTube" }),
        instagram:   fields.url({ label: "Link de Instagram" }),
        tiktok:      fields.url({ label: "Link de TikTok" }),
        meet:        fields.url({ label: "Link de Google Meet" }),
      },
    }),

    /** Cronograma / horario de clases */
    horario: singleton({
      label: "Horario de clases",
      path: "content/horario",
      schema: {
        titulo:  fields.text({ label: "Título (ej: ⚡ SinPre Relámpago — 2026)" }),
        fechas:  fields.text({ label: "Rango de fechas (ej: 16 mar – 25 abr)" }),
        meetUrl: fields.url({ label: "URL de Google Meet para el botón" }),
        filas: fields.array(
          fields.object({
            franjaLabel: fields.text({ label: "Etiqueta de la franja (ej: 3–5 pm)" }),
            celdas: fields.array(
              fields.object({
                materia:    fields.text({ label: "Materia", defaultValue: "" }),
                subTexto:   fields.text({ label: "Sub-texto (ej: Teoría)", defaultValue: "" }),
                logo:       fields.text({ label: "Ruta del logo (ej: /logos/filosofia.png)", defaultValue: "" }),
                colorClass: fields.text({ label: "Clase CSS (ej: c-filo)", defaultValue: "" }),
              }),
              { label: "Celdas (6 días: Lun → Sáb)", itemLabel: p => p.fields.materia.value || "(vacío)" },
            ),
          }),
          { label: "Filas de horario (franjas)", itemLabel: p => p.fields.franjaLabel.value },
        ),
      },
    }),

    /** Cronograma legacy (rango de fechas en inicio) */
    cronograma: singleton({
      label: "Cronograma (datos extra)",
      path: "content/cronograma",
      schema: {
        titulo: fields.text({ label: "Título del curso" }),
        fechas: fields.text({ label: "Rango de fechas" }),
        nota:   fields.text({ label: "Nota adicional", multiline: true }),
      },
    }),

    /** Donaciones (banner en /redes) */
    donaciones: singleton({
      label: "Donaciones — banner en Redes",
      path: "content/donaciones",
      schema: {
        titulo:        fields.text({ label: "Título del banner" }),
        subtitulo:     fields.text({ label: "Subtítulo / descripción", multiline: true }),
        metodoLabel:   fields.text({ label: "Label del método (ej: Nequi · Llaves)" }),
        numero:        fields.text({ label: "Número para copiar (sin espacios)" }),
        numeroDisplay: fields.text({ label: "Número para mostrar (con espacios)" }),
      },
    }),

    /** Configuración de la página /clases */
    clases: singleton({
      label: "Clases — configuración YouTube",
      path: "content/clases",
      schema: {
        channelId:            fields.text({ label: "YouTube Channel ID (empieza con UC...)" }),
        channelUrl:           fields.url({ label: "URL del canal de YouTube" }),
        coursesUrl:           fields.url({ label: "URL de cursos / playlists" }),
        heroTitulo:           fields.text({ label: "Título del hero" }),
        heroDescripcion:      fields.text({ label: "Descripción del hero" }),
        videoDestacadoId:     fields.text({ label: "ID del video destacado" }),
        videoDestacadoTitulo: fields.text({ label: "Título del video destacado" }),
        videoDestacadoMeta:   fields.text({ label: "Meta-etiqueta del video (ej: 🔥 Video destacado)" }),
        cursosTexto:          fields.text({ label: "Texto del banner de cursos completos", multiline: true }),
      },
    }),
  },
});
