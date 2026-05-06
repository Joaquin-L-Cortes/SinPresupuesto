"use client";
// lib/auth-context.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";

export interface AvatarDef {
  id: number;
  color: string;
  bg: string;
  emoji: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 1, color: "#e74c3c", bg: "#fdecea", emoji: "🦁" },
  { id: 2, color: "#e67e22", bg: "#fef0e6", emoji: "🐯" },
  { id: 3, color: "#f1c40f", bg: "#fefbe6", emoji: "🐻" },
  { id: 4, color: "#2ecc71", bg: "#e8f8f0", emoji: "🐸" },
  { id: 5, color: "#1abc9c", bg: "#e6f9f5", emoji: "🐢" },
  { id: 6, color: "#3498db", bg: "#e8f4fd", emoji: "🐬" },
  { id: 7, color: "#2980b9", bg: "#e3f0fa", emoji: "🦋" },
  { id: 8, color: "#9b59b6", bg: "#f5eefa", emoji: "🦄" },
  { id: 9, color: "#8e44ad", bg: "#f0e8f8", emoji: "🐙" },
  { id: 10, color: "#e91e63", bg: "#fde8f1", emoji: "🦊" },
  { id: 11, color: "#ff5722", bg: "#feeee8", emoji: "🐺" },
  { id: 12, color: "#009688", bg: "#e6f5f3", emoji: "🦜" },
  { id: 13, color: "#607d8b", bg: "#edf1f3", emoji: "🐧" },
  { id: 14, color: "#795548", bg: "#f0ebe8", emoji: "🦔" },
  { id: 15, color: "#1a3a6b", bg: "#e8edf5", emoji: "🦅" },
  { id: 16, color: "#00897b", bg: "#e0f5f2", emoji: "🦦" },
  { id: 17, color: "#c0392b", bg: "#fce8e6", emoji: "🦩" },
  { id: 18, color: "#6c3483", bg: "#f0e8f8", emoji: "🪲" },
];

export function getAvatar(avatarId: number): AvatarDef {
  return AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];
}

export interface UserProfile {
  nombre: string;
  apellido: string;
  genero: "M" | "F" | "NB" | "NR";
  avatarId: number;
  uid: string;
  role: "admin" | "profesor" | "estudiante";
}

interface AuthCtx {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, profile: null, loading: true,
  logout: async () => { }, refreshProfile: async () => { },
});

export const useAuth = () => useContext(Ctx);

export function getEmoji(p: UserProfile | null) {
  return p ? getAvatar(p.avatarId).emoji : "👤";
}

export const USERS_COLL = "usuarios";

// ─── Leer cookie del browser sincrónicamente ──────────────────────────────────
// El proxy escribe 'user-role' en cada request del servidor.
// Al recargar, la cookie ya está disponible ANTES de cualquier fetch.
function getRoleFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)user-role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function wrapUser(supabaseUser: any) {
  if (!supabaseUser) return null;
  return {
    ...supabaseUser,
    uid: supabaseUser.id,
    email: supabaseUser.email,
    metadata: { creationTime: supabaseUser.created_at },
    providerData: (supabaseUser.identities ?? []).map((i: any) => ({
      providerId:
        i.provider === "email" ? "password" :
          i.provider === "google" ? "google.com" :
            i.provider === "azure" ? "microsoft.com" :
              i.provider,
    })),
  };
}

function rowToProfile(row: any): UserProfile {
  return {
    nombre: row.nombre ?? "",
    apellido: row.apellido ?? "",
    genero: row.genero ?? "NR",
    avatarId: row.avatar_id ?? 1,
    uid: row.id,
    role: row.role ?? "estudiante",
  };
}

export function AuthProvider({
  children,
  initialRole
}: {
  children: ReactNode;
  initialRole?: string | null;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ✅ SOLUCIÓN AL ERROR DE HIDRATACIÓN:
  // Usamos 'initialRole' que viene del Servidor (Layout) para que 
  // coincida con lo que el Navegador lee de la cookie.
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const role = initialRole || getRoleFromCookie();
    if (!role) return null;

    return {
      role: role as UserProfile["role"],
      nombre: "Cargando...",
      apellido: "",
      genero: "NR",
      avatarId: 1,
      uid: "",
    };
  });

  async function loadProfile(uid: string) {
    if (loadingProfile) return;
    setLoadingProfile(true);
    console.log(`🔐 Auth: cargando perfil completo para: ${uid}...`);

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (error) {
        console.error("🔐 Auth: error cargando perfil:", error);
        // No limpiar profile — mantener el rol de la cookie como fallback
        return;
      }

      if (data) {
        console.log("🔐 Auth: perfil completo recibido");
        setProfile(rowToProfile(data));
      }
    } catch (e: any) {
      console.error("🔐 Auth: excepción en loadProfile:", e);
      // No limpiar profile — mantener el rol de la cookie como fallback
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    const supabase = getSupabase();

    // ✅ Si ya tenemos rol en cookie → desbloquear UI inmediatamente.
    // El perfil completo se carga en background cuando llega el evento de auth.
    const roleFromCookie = getRoleFromCookie();
    if (roleFromCookie) {
      console.log("🍪 Auth: rol en cookie detectado, desbloqueando UI...");
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log(`🔐 Auth Event: ${event}`);

        const wrapped = wrapUser(session?.user ?? null);
        setUser(wrapped);

        if (session?.user) {
          // Cargar perfil completo en background
          // (ya tenemos el rol de la cookie para no bloquear el UI)
          loadProfile(session.user.id);
        } else {
          // Sin sesión: limpiar estado y cookie
          setProfile(null);
          if (typeof document !== "undefined") {
            document.cookie = "user-role=;expires=" + new Date(0).toUTCString() + ";path=/";
          }
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    try {
      const supabase = getSupabase();
      supabase.auth.signOut().catch(console.error);

      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      setUser(null);
      setProfile(null);
      window.location.href = "/";
    }
  };

  const refreshProfile = async () => {
    if (!user?.uid) return;
    await loadProfile(user.uid);
  };

  return (
    <Ctx.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}