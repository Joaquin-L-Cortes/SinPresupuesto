"use client";
// components/ClassNotifier.tsx
// Programa notificaciones locales 5 min antes de cada clase del horario.
// Cuando el usuario activa notificaciones, también registra el token FCM
// para recibir push de comunidad (comentarios y posts nuevos).

import { useEffect, useState } from "react";
import cronogramaData from "@/content/cronograma.json";
import { registerFCMToken, listenFCMForeground } from "@/lib/fcm";
import { useAuth } from "@/lib/auth-context";

// JS day: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
// Horario day index: 0=Lun … 5=Sáb  →  add 1
// Intentamos extraer la primera hora que aparezca en el label (ej: "12-2 pm" -> 12)
function getHourFromLabel(label: string): number | null {
  const match = label.match(/(\d+)/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  // Si es pm y no es 12, sumar 12
  if (label.toLowerCase().includes("pm") && h !== 12) h += 12;
  // Si es 12 am, es 0
  if (label.toLowerCase().includes("am") && h === 12) h = 0;
  return h;
}

interface ClassEntry {
  jsDayOfWeek: number; // 1-7
  hour: number;        // hora de inicio
  materia: string;
  franja: string;
}

function parseSchedule(): ClassEntry[] {
  const entries: ClassEntry[] = [];
  const { rows } = cronogramaData as any;
  if (!rows) return [];

  for (const row of rows) {
    const hour = getHourFromLabel(row.label);
    if (hour == null) continue;
    
    row.cells.forEach((celda: any, di: number) => {
      if (!celda.materia) return;
      entries.push({
        jsDayOfWeek: di + 1, // 0=Lun cronograma → 1=Lun JS
        hour,
        materia: celda.materia, // Usar el campo materia directamente
        franja: row.label,
      });
    });
  }
  return entries;
}

/** Calcula los ms hasta la próxima ocurrencia de (jsDayOfWeek, hour, minute) */
function msUntilNext(jsDayOfWeek: number, hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  const nowDay = now.getDay(); // 0=Dom
  let daysAhead = jsDayOfWeek - nowDay;
  if (daysAhead < 0) daysAhead += 7;
  // Si es hoy pero ya pasó, siguiente semana
  if (daysAhead === 0 && target.getTime() <= now.getTime()) daysAhead = 7;
  target.setDate(target.getDate() + daysAhead);

  return target.getTime() - now.getTime();
}

const LS_KEY = "sp-notif-enabled";

export function ClassNotifier() {
  const { user } = useAuth();
  const [enabled, setEnabled]   = useState(false);
  const [banner,  setBanner]    = useState(false); // mostrar el banner de permiso
  const [granted, setGranted]   = useState(false);

  // Al montar, verificar si ya está habilitado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(LS_KEY);
    const perm  = (typeof Notification !== "undefined") ? Notification.permission : "default";

    if (saved === "yes" && perm === "granted") {
      setEnabled(true);
      setGranted(true);
      scheduleSWNotifications();
      // Re-registrar token FCM si el usuario ya está autenticado
      if (user?.uid) {
        registerFCMToken(user.uid).catch(() => {});
        listenFCMForeground().catch(() => {});
      }
    } else if (saved === "yes" && perm !== "denied") {
      // Perm revocada externamente
      localStorage.removeItem(LS_KEY);
    } else if (saved === null && perm !== "denied") {
      // Primera vez: mostrar banner solo en PWA (standalone) y si SW disponible
      const isPWA = window.matchMedia("(display-mode: standalone)").matches
                 || (window.navigator as any).standalone === true;
      if ("serviceWorker" in navigator && isPWA) setBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function requestAndEnable() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setGranted(true);
      setEnabled(true);
      localStorage.setItem(LS_KEY, "yes");
      scheduleSWNotifications();
      // Registrar token FCM para push de comunidad
      if (user?.uid) {
        registerFCMToken(user.uid).catch(() => {});
        listenFCMForeground().catch(() => {});
      }
    }
    setBanner(false);
  }

  function disable() {
    setEnabled(false);
    localStorage.setItem(LS_KEY, "no");
    // Cancelar timers del SW
    navigator.serviceWorker.ready.then(reg => {
      reg.active?.postMessage({ type: "CANCEL_CLASS_NOTIFICATIONS" });
    }).catch(() => {});
  }

  async function scheduleSWNotifications() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const classes = parseSchedule();
      const notifications = classes.map(c => ({
        delayMs:  msUntilNext(c.jsDayOfWeek, c.hour, 55), // 5 min antes (HH:55)
        title:    `📚 Clase en 5 minutos`,
        body:     `${c.materia} (${c.franja})`,
        tag:      `sp-class-${c.jsDayOfWeek}-${c.hour}`,
      }));
      reg.active?.postMessage({ type: "SCHEDULE_CLASS_NOTIFICATIONS", notifications });
    } catch (e) {
      console.warn("[ClassNotifier] error scheduling:", e);
    }
  }

  // No renderizar nada si no hay API de notificaciones
  if (typeof window !== "undefined" && !("Notification" in window)) return null;

  return (
    <>
      {/* Banner de primera vez */}
      {banner && (
        <div style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 8888, width: "min(96vw, 420px)",
          background: "var(--bg2, #fff)", border: "1.5px solid var(--border, #e2e8f0)",
          borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>🔔</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "var(--text, #1a2640)" }}>
                ¿Activar recordatorios de clase?
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                Te avisamos 5 minutos antes de cada clase, incluso con la app cerrada.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => { setBanner(false); localStorage.setItem(LS_KEY, "no"); }}
              style={{
                padding: "5px 14px", borderRadius: 8,
                border: "1px solid var(--border, #e2e8f0)",
                background: "transparent", color: "var(--muted, #64748b)",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              }}
            >Ahora no</button>
            <button
              onClick={requestAndEnable}
              style={{
                padding: "5px 14px", borderRadius: 8, border: "none",
                background: "var(--accent, #1a3a6b)", color: "#fff",
                fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              }}
            >Activar</button>
          </div>
        </div>
      )}
    </>
  );
}

/** Hook para usar en configuración / Nav si se quiere toggle manual */
export function useClassNotifications() {
  const enabled = typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "yes";
  return { enabled };
}
