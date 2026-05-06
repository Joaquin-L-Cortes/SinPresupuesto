// app/api/keystatic/[...params]/route.ts
// Keystatic está siendo reemplazado por el panel /admin.
// Esta ruta se mantiene para compatibilidad en local (dev).
// En producción, las env vars de GitHub no están disponibles → retorna 404 gracefully.

import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const hasKeystatic = !!(
  process.env.KEYSTATIC_GITHUB_CLIENT_ID &&
  process.env.KEYSTATIC_GITHUB_CLIENT_SECRET &&
  process.env.KEYSTATIC_SECRET
);

let handler: { GET: any; POST: any } | null = null;

async function getHandler() {
  if (handler) return handler;
  if (isProd && !hasKeystatic) return null;
  try {
    const [{ makeRouteHandler }, { default: config }] = await Promise.all([
      import("@keystatic/next/route-handler"),
      import("@/keystatic.config"),
    ]);
    handler = makeRouteHandler({ config });
    return handler;
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: any) {
  const h = await getHandler();
  if (!h) return NextResponse.json({ error: "Keystatic no disponible" }, { status: 404 });
  return h.GET(request, context);
}

export async function POST(request: Request, context: any) {
  const h = await getHandler();
  if (!h) return NextResponse.json({ error: "Keystatic no disponible" }, { status: 404 });
  return h.POST(request, context);
}
