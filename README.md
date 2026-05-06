# Sin-Presupuesto · Relámpago 2026

PreUniversitario gratuito — Next.js 14 + Firebase + Cloudflare Workers

## Arquitectura general 1

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Auth | Firebase Authentication |
| Base de datos | Firestore |
| Deploy | Cloudflare Workers (opennextjs-cloudflare) |
| CMS | Keystatic (GitHub storage) |

## Firebase

Proyecto: **Configurar en `.env.local`**  
Colecciones Firestore:
- `/usuarios/{uid}` — perfil del estudiante
- `/usuarios/{uid}/progress/{topicId}` — archivos vistos por sección
- `/usuarios/{uid}/moderation/libreta` — notas de la libreta
- `/forum_posts/{postId}` — posts de la comunidad
- `/forum_posts/{postId}/comments/{commentId}` — comentarios

## Variables de entorno requeridas

Crea un archivo `.env.local` en la raíz con las siguientes variables (el propietario del proyecto te entregará los valores):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_AI_URL=          # URL del Worker de IA (te la entrego por privado)

KEYSTATIC_GITHUB_CLIENT_ID=  # Secret de Cloudflare — te lo entrego por privado
KEYSTATIC_GITHUB_CLIENT_SECRET=
KEYSTATIC_SECRET=
```

## Correr localmente

```bash
npm install
npm run dev
# → http://localhost:3000
# CMS → http://localhost:3000/keystatic
```

## Deploy en Cloudflare (opennextjs-cloudflare)

```bash
npm run cf:build    # opennextjs-cloudflare build
npm run cf:deploy   # opennextjs-cloudflare deploy
```

## Actualizar reglas Firestore

```bash
firebase deploy --only firestore:rules
```

## Logos requeridos en /public/logos/

- `logo-sp.svg` (o .png)
- `biologia.png`, `matematicas.png`, `quimica.png`
- `fisica.png`, `sociales.png`, `textual.png`
- `ingles.png`, `filosofia.png`, `imagen.png`

## Estructura de archivos

```
app/
  page.tsx               → Inicio (hero + cronograma + 15 secciones)
  materiales/            → 80 archivos con acordeón, drag & drop, anillo de progreso
  comunidad/             → Foro Firebase (apuntes, preguntas, quizzes)
  clases/                → YouTube (último video + cursos)
  donativos/             → Nequi / WhatsApp
  redes/                 → Redes sociales
  keystatic/             → CMS (GitHub storage en producción)
components/
  Nav.tsx                → Navbar (Material, Clases, Comunidad, Redes, Donativos)
  AuthModal.tsx          → Login / Registro con Google + avatar emoji
  LibretaModal.tsx       → Notas → /usuarios/{uid}/moderation/libreta
  AvanceModal.tsx        → Anillos de progreso → /usuarios/{uid}/progress/{topicId}
  ProgressRing.tsx       → Anillo flotante arrastrable
  Schedule.tsx           → Cronograma del Relámpago 2026
  SectionsGrid.tsx       → Grid de 15 secciones (página de inicio)
lib/
  firebase.ts            → Config Firebase (usa variables de entorno)
  auth-context.tsx       → useAuth + USERS_COLL = "usuarios"
cloudflare-worker.js    → Worker del chatbot IA
firestore.rules         → Reglas de seguridad Firestore
```
