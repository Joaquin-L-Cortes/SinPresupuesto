import { createBrowserClient } from "@supabase/ssr";

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export const getSupabase = () => {
  // Si ya existe una instancia en el navegador, la devolvemos. 
  // Esto evita el error de "Lock stole it".
  if (typeof window !== "undefined" && supabaseInstance) {
    return supabaseInstance;
  }

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (typeof window !== "undefined") {
    supabaseInstance = client;
  }

  return client;
};