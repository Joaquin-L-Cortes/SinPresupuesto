// lib/fcm.ts
// Registro del token FCM y guardado en Firestore.
// IMPORTANTE: todos los imports de firebase/messaging son DINÁMICOS para que
// el bundler de Cloudflare Workers nunca los incluya en el bundle del servidor.
// firebase/messaging usa eval() internamente, que está prohibido en Workers.

export const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

const FIREBASE_CONFIG = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

/**
 * Registra el token FCM y lo guarda en Firestore bajo usuarios/{uid}/fcm_tokens/{token}.
 * Solo se ejecuta en el browser. Retorna null si no hay soporte o el permiso fue denegado.
 */
export async function registerFCMToken(uid: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    // Imports dinámicos — nunca llegan al bundle del servidor
    const [
      { initializeApp, getApps },
      { getMessaging, getToken, isSupported },
      { getFirestore, doc, setDoc, serverTimestamp },
    ] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
      import("firebase/firestore"),
    ]);

    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    const db = getFirestore(app);

    const sw = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });

    if (!token) return null;

    await setDoc(
      doc(db, "usuarios", uid, "fcm_tokens", token),
      {
        token,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent.slice(0, 200),
      },
      { merge: true }
    );

    console.log("[FCM] Token registrado:", token.slice(0, 20) + "…");
    return token;
  } catch (err) {
    console.warn("[FCM] No se pudo registrar el token:", err);
    return null;
  }
}

/**
 * Escucha mensajes FCM cuando la app está en foreground y muestra la notificación
 * manualmente (FCM no la muestra automáticamente con la app abierta).
 */
export async function listenFCMForeground(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const [
      { initializeApp, getApps },
      { getMessaging, onMessage, isSupported },
    ] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);

    const supported = await isSupported().catch(() => false);
    if (!supported) return;

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      if (!title || Notification.permission !== "granted") return;
      new Notification(title, {
        body: body ?? "",
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: payload.collapseKey ?? "sp-community",
        data: { url: payload.data?.url ?? "/comunidad" },
      });
    });
  } catch (err) {
    console.warn("[FCM] Error en listener foreground:", err);
  }
}
