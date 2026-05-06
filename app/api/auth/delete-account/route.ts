// app/api/auth/delete-account/route.ts
export const runtime = 'edge';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST() {
  try {
    // Cliente de usuario para obtener la sesión
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value
      ?? cookieStore.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`)?.value;

    if (!accessToken) {
      // Intentamos leer todas las cookies para encontrar el token
      const allCookies = cookieStore.getAll();
      const authCookie = allCookies.find(c => c.name.includes("auth-token"));
      if (!authCookie) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    // Admin client con service role para eliminar usuario
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Obtener el usuario desde el token de sesión
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const allCookies = cookieStore.getAll();
    const tokenCookie = allCookies.find(c => c.name.includes("auth-token"));
    if (!tokenCookie) {
      return NextResponse.json({ error: "Sin sesión activa" }, { status: 401 });
    }

    let token: string;
    try {
      const parsed = JSON.parse(tokenCookie.value);
      token = Array.isArray(parsed) ? parsed[0]?.access_token : parsed?.access_token;
    } catch {
      token = tokenCookie.value;
    }

    const { data: { user } } = await userClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Eliminar el usuario (cascade elimina profiles por FK)
    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
