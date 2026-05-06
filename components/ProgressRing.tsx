"use client";
// components/ProgressRing.tsx
import { useEffect, useState } from "react";
import { useAuth, USERS_COLL } from "@/lib/auth-context";

const TOPIC_ICONS: Record<string,string> = {
  "I.":"⚡","II.":"📋","III.":"📑","IV.":"🌟","V.":"📝",
  "VI.":"📐","VII.":"⚛️","VIII.":"🧪","IX.":"🔬","X.":"🌍",
  "XI.":"🖼️","XII.":"📚","XIII.":"📊","XIV.":"🎬","XV.":"🎯",
};
function topicIcon(name: string) {
  const num = name.split(".")[0] + ".";
  return TOPIC_ICONS[num] || "📁";
}

interface Props {
  topicId:   string;
  topicName: string;
  total:     number;
}

function readLocalSeen(topicId: string): number {
  try {
    const raw = localStorage.getItem("sp-seen");
    if (!raw) return 0;
    const data = JSON.parse(raw) as Record<string, string[]>;
    return (data[topicId] || []).length;
  } catch { return 0; }
}

function getSavedMode(): "bar" | "ring" {
  try { return (localStorage.getItem("sp_global_hero") as "bar" | "ring") || "bar"; }
  catch { return "bar"; }
}

// #4: save hero mode to Firestore
async function persistHeroModeFS(uid: string, mode: "bar" | "ring") {
  try {
    const [{ db }, { doc, setDoc }] = await Promise.all([
      import("@/lib/firebase"),
      import("firebase/firestore"),
    ]);
    await setDoc(
      doc(db, USERS_COLL, uid, "prefs", "heroMode"),
      { mode, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch {}
}

export function ProgressRing({ topicId, topicName, total }: Props) {
  const { user } = useAuth();
  const [seen, setSeen] = useState(0);
  const [mode, setMode] = useState<"bar" | "ring">("bar");

  useEffect(() => {
    setSeen(readLocalSeen(topicId));
    setMode(getSavedMode());
  }, [topicId]);

  useEffect(() => {
    const handler = () => setSeen(readLocalSeen(topicId));
    window.addEventListener("sp-seen-change", handler);
    return () => window.removeEventListener("sp-seen-change", handler);
  }, [topicId]);

  // Sync progress from Firestore when user is known
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ db }, { doc, getDoc }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/firestore"),
        ]);
        const snap = await getDoc(doc(db, USERS_COLL, user.uid, "progress", topicId));
        if (!snap.exists()) return;
        const remote: string[] = snap.data().seen || [];
        const raw   = localStorage.getItem("sp-seen");
        const local: Record<string, string[]> = raw ? JSON.parse(raw) : {};
        const merged = Array.from(new Set([...(local[topicId] || []), ...remote]));
        local[topicId] = merged;
        localStorage.setItem("sp-seen", JSON.stringify(local));
        setSeen(merged.length);
        window.dispatchEvent(new Event("sp-seen-change"));
        window.dispatchEvent(new Event("sp-progress-update"));
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, topicId]);

  // #4: load hero mode from Firestore on login — Firestore wins over localStorage
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ db }, { doc, getDoc }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/firestore"),
        ]);
        const snap = await getDoc(doc(db, USERS_COLL, user.uid, "prefs", "heroMode"));
        if (!snap.exists()) return;
        const saved = snap.data().mode as "bar" | "ring";
        if (saved !== getSavedMode()) {
          localStorage.setItem("sp_global_hero", saved);
          setMode(saved);
          window.dispatchEvent(new Event("sp-hero-mode-change"));
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  function toggleMode() {
    const next = mode === "bar" ? "ring" : "bar";
    setMode(next);
    try {
      localStorage.setItem("sp_global_hero", next);
      window.dispatchEvent(new Event("sp-hero-mode-change"));
    } catch {}
    // #4: persist to Firestore if logged in
    if (user) persistHeroModeFS(user.uid, next);
  }

  const pct   = total ? Math.round((seen / total) * 100) : 0;
  const label = topicName.replace(/^[IVX]+\.\s*/, "");
  const isBar = mode === "bar";

  const R    = 19;
  const circ = parseFloat((2 * Math.PI * R).toFixed(1));
  const dash = parseFloat(((circ * pct) / 100).toFixed(1));
  const gap  = parseFloat((circ - dash).toFixed(1));

  return (
    <>
      <div className={"progress-hero" + (isBar ? "" : " collapsed")}>
        <div className="ph-inner">
          <div style={{ flex: 1 }}>
            <div className="ph-h1-row">
              <div className="ph-texts"><h1><span style={{marginRight:"0.4rem"}}>{topicIcon(topicName)}</span>{topicName}</h1></div>
              <button className={"hero-ring-btn" + (isBar ? "" : " ring-active")} onClick={toggleMode}>
                {isBar ? "◯ Cambiar al Anillo" : "▬ Cambiar a la Barra"}
              </button>
            </div>
            <p className="ph-texts-sub">{label} · {total} archivos</p>
          </div>
          <div className="ph-stats">
            <div className="pstat"><div className="pstat-num">{seen}</div><div className="pstat-label">Vistos</div></div>
            <div className="pstat"><div className="pstat-num">{total}</div><div className="pstat-label">Total</div></div>
            <div className="pstat"><div className="pstat-num">{pct}%</div><div className="pstat-label">Avance</div></div>
          </div>
        </div>
        <div className="ph-bar-area">
          <div className="global-track">
            <div className="global-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="global-lbl">{seen} de {total} archivos completados</div>
        </div>
      </div>

      <div className={"ring-widget" + (isBar ? "" : " visible")}>
        <div className="rw-ring-row">
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
            <circle cx="24" cy="24" r={R} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle cx="24" cy="24" r={R} fill="none"
              stroke="var(--green)" strokeWidth="4"
              strokeDasharray={dash + " " + gap}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.4s" }}
            />
          </svg>
          <div>
            <div className="rw-pct">{pct}%</div>
            <div className="rw-sub">{topicIcon(topicName)} {seen}/{total}</div>
          </div>
        </div>
        <button className="rw-back" onClick={toggleMode}>▬ Cambiar a la Barra</button>
      </div>
    </>
  );
}
