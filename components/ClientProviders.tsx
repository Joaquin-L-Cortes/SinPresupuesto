"use client";
// components/ClientProviders.tsx
import { AuthProvider } from "@/lib/auth-context";
import { SinPesito } from "@/components/SinPesito";
import { ClassNotifier } from "@/components/ClassNotifier";
import { useEffect } from "react";

export function ClientProviders({ 
  children, 
  initialRole 
}: { 
  children: React.ReactNode;
  initialRole: string | null;
}) {
  useEffect(() => {
    // 🛡️ Kill Switch: Eliminar cualquier Service Worker activo para evitar problemas de caché en desarrollo
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log("🛡️ [SW] Eliminado automáticamente desde el código.");
        }
      });
    }
  }, []);

  return (
    <AuthProvider initialRole={initialRole}>
      {children}
      <SinPesito />
      <ClassNotifier />
    </AuthProvider>
  );
}
