"use client";
// components/AvanceModal.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth, getAvatar } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import classroomData from "@/content/classroom_data.json";

interface Props { open: boolean; onClose: () => void; }

// Secciones con sus totales de archivos
const SECTIONS = (() => {
  const topics = (classroomData as any).topics  as { id: string; name: string }[];
  const mats   = (classroomData as any).materials as any[];
  const count: Record<string, number> = {};
  for (const m of mats) {
    const files = (m.materials || []).length || 1;
    count[m.topicId] = (count[m.topicId] || 0) + files;
  }
  return topics.map(t => ({ id: t.id, name: t.name, total: count[t.id] || 0 }));
})();

const TOTAL_FILES = SECTIONS.reduce((s, sec) => s + sec.total, 0);

// ─── Mini anillo de progreso con color del avatar ──────────
function Ring({ pct, color, size = 38 }: { pct: number; color: string; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ/4}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 0.4s" }} />
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="9"
        fill={color} fontWeight="700">{pct}%</text>
    </svg>
  );
}

export function AvanceModal({ open, onClose }: Props) {
  const { user, profile }               = useAuth();
  const [seenMap, setSeenMap]           = useState<Record<string, string[]>>({});
  const [firestoreLoaded, setFLoaded]   = useState(false);
  const overlayRef                      = useRef<HTMLDivElement>(null);

  // Color del avatar
  const av         = profile ? getAvatar(profile.avatarId || 1) : null;
  const avColor    = av ? av.color : "var(--accent2)";

  useEffect(() => {
    // Publicar total de archivos para que Nav lo use en el porcentaje
    if (TOTAL_FILES > 0) {
      localStorage.setItem("sp-total-files", String(TOTAL_FILES));
      window.dispatchEvent(new Event("sp-progress-update"));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("sp-seen");
      if (raw) setSeenMap(JSON.parse(raw));
    } catch {}
    if (user && !firestoreLoaded) syncFirestore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function syncFirestore() {
    if (!user) return;
    try {
      const sb = getSupabase();
      const { data: profile } = await sb
        .from("profiles")
        .select("progress")
        .eq("id", user.id)
        .single();

      if (profile?.progress) {
        setSeenMap(prev => {
          const merged = { ...prev };
          const remote = profile.progress as Record<string, string[]>;
          Object.entries(remote).forEach(([topicId, seen]) => {
            const local = prev[topicId] || [];
            merged[topicId] = Array.from(new Set([...local, ...seen]));
          });
          return merged;
        });
      }
      setFLoaded(true);
      window.dispatchEvent(new Event("sp-progress-update"));
    } catch {}
  }

  function countSeen(topicId: string) {
    return (seenMap[topicId] || []).length;
  }

  const totalSeen  = SECTIONS.reduce((s, sec) => s + countSeen(sec.id), 0);
  const overallPct = TOTAL_FILES ? Math.round((totalSeen / TOTAL_FILES) * 100) : 0;

  if (!open) return null;

  return (
    <div className="modal-overlay open" ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <h2 style={{ color: avColor }}>📊 Mi avance</h2>
        <p className="modal-sub">
          {totalSeen} de {TOTAL_FILES} archivos vistos ·{" "}
          <strong style={{ color: avColor }}>{overallPct}% total</strong>
        </p>

        {/* Barra global */}
        <div style={{
          height: 8, borderRadius: 6, background: "var(--border)",
          margin: "0.5rem 0 1rem", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.max(overallPct, overallPct > 0 ? 2 : 0)}%`,
            background: overallPct === 100 ? "var(--green,#4ade80)" : avColor,
            borderRadius: 6, transition: "width .5s ease",
          }} />
        </div>

        <div className="avance-list">
          {SECTIONS.map(sec => {
            const seen  = countSeen(sec.id);
            const pct   = sec.total ? Math.round((seen / sec.total) * 100) : 0;
            const color = pct === 100 ? "var(--green,#4ade80)" : avColor;
            const fillW = Math.max(pct, seen > 0 ? 3 : 0);
            return (
              <div key={sec.id} className="avance-item">
                <Ring pct={pct} color={color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: ".85rem", fontWeight: 600,
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap" }}>
                    {sec.name}
                  </div>
                  {/* mini barra por sección */}
                  <div style={{
                    height: 4, borderRadius: 4, background: "var(--border)",
                    marginTop: 4, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", width: `${fillW}%`,
                      background: color, borderRadius: 4,
                      transition: "width .4s ease",
                    }} />
                  </div>
                </div>
                <span className="avance-pct" style={{ color, fontWeight: 700 }}>
                  {seen}/{sec.total}
                </span>
              </div>
            );
          })}
        </div>

        <button
          className="btn-submit"
          style={{
            marginTop: "1rem",
            background:  avColor + "18",
            color:       avColor,
            border:      `1.5px solid ${avColor}`,
          }}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
