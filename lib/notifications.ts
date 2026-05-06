// lib/notifications.ts
// Utilidades para el sistema de notificaciones de SinPresupuesto

export interface Notification {
  id: string;
  type: "comment" | "post" | "link" | "general";
  title: string;
  body: string;
  postId?: string;
  createdAt: any; // Firestore Timestamp
  read: boolean;
}

export const NOTIF_COLL = "notifications";
