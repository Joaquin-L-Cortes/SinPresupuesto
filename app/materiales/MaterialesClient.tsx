"use client";
// app/materiales/MaterialesClient.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";
import { ProgressRing } from "@/components/ProgressRing";
import { AuthModal } from "@/components/AuthModal";
import classroomData from "@/content/classroom_data.json";
import { trackRecentFile } from "@/components/RecentMaterials";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FileMat { type: string; title: string; url: string; }
interface Material {
  id: string; title: string; description: string;
  topic: string; topicId: string; state: string;
  creationTime: string; alternateLink: string;
  materials: FileMat[];
}
interface Topic { id: string; name: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileIcon(f: FileMat) {
  if (f.type === "youtube") return "▶️";
  if (f.type === "form")    return "📋";
  if (f.type !== "drive")   return "🔗";
  const u = f.url || ""; const t = (f.title || "").toLowerCase();
  if (u.includes("folder") || u.includes("drive/folders")) return "📁";
  if (t.endsWith(".xlsx") || t.endsWith(".xls") || t.includes("spreadsheet")) return "📊";
  if (t.endsWith(".pptx") || t.endsWith(".ppt")  || t.includes("presentation")) return "📑";
  return "📄";
}

function drivePreviewUrl(url: string): string | null {
  const fm = url.match(/\/file\/d\/([\w-]+)/);
  if (fm) return `https://drive.google.com/file/d/${fm[1]}/preview`;
  const fm2 = url.match(/id=([\w-]+)/);
  if (fm2) return `https://drive.google.com/file/d/${fm2[1]}/preview`;
  const doc = url.match(/\/document\/d\/([\w-]+)/);
  if (doc) return `https://docs.google.com/document/d/${doc[1]}/preview`;
  const sh = url.match(/\/spreadsheets\/d\/([\w-]+)/);
  if (sh) return `https://docs.google.com/spreadsheets/d/${sh[1]}/preview`;
  const sl = url.match(/\/presentation\/d\/([\w-]+)/);
  if (sl) return `https://docs.google.com/presentation/d/${sl[1]}/preview`;
  return null;
}

function isPreviewable(f: FileMat) {
  if (f.type === "youtube") return true;
  if (f.type === "form")    return true;
  if (f.type === "drive" || f.type === "link") return !!drivePreviewUrl(f.url);
  return false;
}

function getPreviewUrl(f: FileMat): string {
  if (f.type === "youtube") {
    const m = f.url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    return f.url;
  }
  if (f.type === "form") return f.url;
  return drivePreviewUrl(f.url) || f.url;
}

// ── Seen helpers ──────────────────────────────────────────────────────────────
function readSeen(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem("sp-seen") || "{}"); }
  catch { return {}; }
}
function writeSeen(data: Record<string, string[]>) {
  localStorage.setItem("sp-seen", JSON.stringify(data));
  // sp-seen-change: listened by ProgressRing and MaterialesClient
  window.dispatchEvent(new Event("sp-seen-change"));
  // sp-progress-update: listened by Nav to refresh the battery button (#1 fix)
  window.dispatchEvent(new Event("sp-progress-update"));
}
async function persistTopicProgress(uid: string, topicId: string, seen: string[]) {
  try {
    const sb = getSupabase();
    // Leemos el progreso actual para no sobreescribir otros temas
    const { data: profile } = await sb.from("profiles").select("progress").eq("id", uid).single();
    const currentProgress = (profile?.progress as Record<string, string[]>) || {};
    await sb.from("profiles").update({
      progress: { ...currentProgress, [topicId]: seen }
    }).eq("id", uid);
  } catch (e) { console.error("Error persisting progress", e); }
}

async function persistSectionOrder(uid: string, topicId: string, order: string[]) {
  try {
    const sb = getSupabase();
    const { data: profile } = await sb.from("profiles").select("layout").eq("id", uid).single();
    const currentLayout = (profile?.layout as any) || {};
    await sb.from("profiles").update({
      layout: { ...currentLayout, [`order_${topicId}`]: order }
    }).eq("id", uid);
  } catch {}
}

async function loadSectionOrder(uid: string, topicId: string): Promise<string[] | null> {
  try {
    const sb = getSupabase();
    const { data: profile } = await sb.from("profiles").select("layout").eq("id", uid).single();
    return (profile?.layout as any)?.[`order_${topicId}`] || null;
  } catch { return null; }
}

async function persistHeroMode(uid: string, mode: "bar" | "ring") {
  try {
    const sb = getSupabase();
    const { data: profile } = await sb.from("profiles").select("layout").eq("id", uid).single();
    const currentLayout = (profile?.layout as any) || {};
    await sb.from("profiles").update({
      layout: { ...currentLayout, heroMode: mode }
    }).eq("id", uid);
  } catch {}
}

async function loadHeroMode(uid: string): Promise<"bar" | "ring" | null> {
  try {
    const sb = getSupabase();
    const { data: profile } = await sb.from("profiles").select("layout").eq("id", uid).single();
    return (profile?.layout as any)?.heroMode || null;
  } catch { return null; }
}


// ── Topic icons & images ──────────────────────────────────────────────────────
const TOPIC_ICONS: Record<string,string> = {
  "I.":"⚡","II.":"📋","III.":"📑","IV.":"🌟","V.":"📝",
  "VI.":"📐","VII.":"⚛️","VIII.":"🧪","IX.":"🔬","X.":"🌍",
  "XI.":"🖼️","XII.":"📚","XIII.":"📊","XIV.":"🎬","XV.":"🎯",
};
function numeral(name: string) { return name.split(".")[0]+"."; }
function topicIcon(name: string, sections: any[] = []) { 
  // 1. Intentamos buscar el emoji guardado en la sección
  const section = sections.find(s => s.name === name);
  if (section?.emoji) return section.emoji;

  // 2. Fallback al mapeo por numeral
  return TOPIC_ICONS[numeral(name)] || "📁"; 
}

const SUBJ_IMAGES: {key: string; img: string}[] = [
  {key:"relámpago",img:"sociales"},{key:"relampago",img:"sociales"},
  {key:"simulacros calificados",img:"fisica"},{key:"simulacros",img:"fisica"},
  {key:"admisión",img:"ingles"},{key:"admision",img:"ingles"},
  {key:"módulos teóricos",img:"filosofia"},{key:"módulos especiales",img:"filosofia"},
  {key:"modulos",img:"filosofia"},{key:"temarios",img:"quimica"},
  {key:"diapositivas",img:"filosofia"},{key:"apuntes",img:"filosofia"},
  {key:"textos",img:"textual"},{key:"clases",img:"sociales"},
  {key:"recursos udea",img:"biologia"},{key:"ejercicios",img:"matematicas"},
  {key:"app",img:"matematicas"},{key:"exclusivos",img:"matematicas"},
];
function topicImg(name: string): string {
  const lower = name.toLowerCase();
  for (const {key, img} of SUBJ_IMAGES) {
    if (lower.includes(key)) return `/logos/${img}.png`;
  }
  return "/logos/sociales.png";
}

// ── Content Previewer Modal ───────────────────────────────────────────────────
interface PreviewState {
  url: string; title: string; meta: string;
  icon: string; openUrl: string;
  topicId: string; fileUrl: string;
}

function ContentPreviewerModal({
  preview, onClose, onToggleSeen, seenMap
}: {
  preview: PreviewState | null;
  onClose: () => void;
  onToggleSeen: (topicId: string, url: string) => void;
  seenMap: Record<string, string[]>;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading]           = useState(true);
  const backdropRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preview) { setLoading(true); setIsFullscreen(false); document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [preview]);

  // Solo gira si el sistema realmente rotó la pantalla (auto-rotate habilitado).
  // Usamos una ref para guardar el eje previo al cambio y detectar si realmente
  // hubo un cambio de eje (portrait ↔ landscape). Esto evita falsos positivos
  // cuando el teléfono NO tiene la rotación automática habilitada pero igual
  // dispara el evento (p.ej. al abrir el teclado virtual o cambiar de app).
  const prevAxisRef = useRef<"landscape" | "portrait" | null>(null);
  useEffect(() => {
    const so = (screen as any).orientation;
    if (!so || typeof so.addEventListener !== "function") return;
    function onOrientationChange() {
      const newAxis: "landscape" | "portrait" = so.type?.startsWith("landscape") ? "landscape" : "portrait";
      const prev = prevAxisRef.current;
      prevAxisRef.current = newAxis;
      // Si el eje no cambió, fue un evento cosmético — ignorar
      if (prev === null || prev === newAxis) return;
      if (newAxis === "landscape" && preview) setIsFullscreen(true);
      else if (newAxis === "portrait") setIsFullscreen(false);
    }
    // Inicializar el eje de referencia
    prevAxisRef.current = so.type?.startsWith("landscape") ? "landscape" : "portrait";
    so.addEventListener("change", onOrientationChange);
    return () => {
      so.removeEventListener("change", onOrientationChange);
      prevAxisRef.current = null;
    };
  }, [preview]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!preview) return null;
  const isSeen = (seenMap[preview.topicId] || []).includes(preview.fileUrl);

  return (
    <div
      className={`modal-backdrop${preview ? " open" : ""}`}
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className={`modal-window${isFullscreen ? " is-fullscreen" : ""}`}>
        <div className="modal-chrome">
          <div className="modal-dots">
            <div className="modal-dot" style={{background:"#ff5f57",cursor:"pointer"}} onClick={onClose} />
            <div className="modal-dot" style={{background:"#febc2e"}} />
            <div className="modal-dot" style={{background:"#28c840"}} />
          </div>
          <div className="modal-url">{preview.url.replace("https://","")}</div>
          <button className="btn-close-modal" onClick={onClose} title="Cerrar">✕</button>
        </div>
        <div className="modal-info">
          <div className="mi-icon">{preview.icon}</div>
          <div className="mi-body">
            <div className="mi-name">{preview.title}</div>
            <div className="mi-meta">{preview.meta}</div>
          </div>
          <button
            className="btn-expand-preview"
            onClick={() => setIsFullscreen(p => !p)}
            title={isFullscreen ? "Reducir tamaño" : "Expandir"}
          >
            {isFullscreen ? "↙ Reducir" : "↗ Expandir"}
          </button>
          <button
            className={`btn-seen${isSeen ? " done" : ""}`}
            onClick={() => onToggleSeen(preview.topicId, preview.fileUrl)}
          >
            {isSeen ? "✅ Visto" : "Marcar visto"}
          </button>
          <a href={preview.openUrl} target="_blank" rel="noopener noreferrer" className="btn-drive">↗ Abrir</a>
        </div>
        <div className="modal-iframe-wrap">
          <div className={`modal-iframe-loading${loading ? "" : " hidden"}`}>
            <span style={{fontSize:"1.5rem"}}>⏳</span> Cargando…
          </div>
          <iframe src={preview.url} title={preview.title} allowFullScreen onLoad={() => setLoading(false)} />
        </div>
      </div>
    </div>
  );
}

// ── Sidebar section button (tab) ──────────────────────────────────────────────
function SectionButton({
  topic, mats, seenMap, isActive, onSelect, dbSecciones = []
}: {
  topic: Topic;
  mats: Material[];
  seenMap: Record<string, string[]>;
  isActive: boolean;
  onSelect: () => void;
  dbSecciones?: any[];
}) {
  const total = mats.reduce((s, m) => s + (m.materials?.length || 0), 0);
  const seen  = (seenMap[topic.id] || []).length;
  const pct   = total > 0 ? Math.round(seen / total * 100) : 0;
  const num   = numeral(topic.name);

  return (
    <button
      className={`section-btn${isActive ? " active" : ""}`}
      onClick={onSelect}
      aria-pressed={isActive}
      style={{
        display:"flex", alignItems:"center", gap:"0.5rem",
        width:"100%", textAlign:"left",
        padding:"0.55rem 0.75rem",
        background: isActive ? "var(--accent2)" : "transparent",
        color: isActive ? "#fff" : "var(--fg)",
        border: "none", borderRadius: 8,
        cursor: "pointer", fontSize: "0.82rem", fontWeight: isActive ? 700 : 500,
        transition: "background 0.18s, color 0.18s",
      }}
    >
      <span style={{fontSize:"1rem",flexShrink:0}}>{topicIcon(topic.name, dbSecciones)}</span>
      <span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        <span style={{opacity:0.65,marginRight:"0.25rem"}}>{num}</span>
        {topic.name.replace(num, "").trim()}
      </span>
      <span style={{display:"flex",alignItems:"center",gap:"0.3rem",flexShrink:0}}>
        {total > 0 && (
          <span style={{
            fontSize:"0.68rem", fontWeight:700,
            background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg3)",
            color: isActive ? "#fff" : "var(--muted)",
            borderRadius:20, padding:"0.05rem 0.4rem",
          }}>{total}</span>
        )}
        {pct > 0 && (
          <span style={{
            fontSize:"0.68rem", fontWeight:700,
            color: pct === 100 ? "#4ade80" : (isActive ? "#fff" : "var(--accent2)"),
          }}>{pct}%</span>
        )}
      </span>
    </button>
  );
}

// ── Drag & drop ghost element ─────────────────────────────────────────────────
let _ghost: HTMLDivElement | null = null;
function createGhost(card: HTMLElement) {
  _ghost = document.createElement("div");
  const r = card.getBoundingClientRect();
  (_ghost as any)._w = r.width;
  _ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:50px;border-radius:16px;background:var(--bg2);border:2px solid var(--accent2);opacity:.88;pointer-events:none;z-index:9999;box-shadow:0 16px 48px rgba(0,0,0,.35);transform:rotate(-1.5deg) scale(1.04);`;
  document.body.appendChild(_ghost);
}
function moveGhost(x: number, y: number) {
  if (!_ghost) return;
  _ghost.style.left = `${x - (_ghost as any)._w / 2}px`;
  _ghost.style.top  = `${y - 25}px`;
}
function removeGhost() { if (_ghost) { _ghost.remove(); _ghost = null; } }

// ── ModulesGrid — handles card-level drag & drop order ───────────────────────
function ModulesGrid({
  mats, topic, seenMap, openPreview, uid, onResetState,
}: {
  mats: Material[];
  topic: Topic;
  seenMap: Record<string, string[]>;
  openPreview: (f: FileMat, mat: Material, topic: Topic) => void;
  uid: string | null;
  onResetState?: (isCustom: boolean, resetFn: () => void) => void;
}) {
  const defaultOrder = mats.map(m => m.id);
  const [order, setOrder]     = useState<string[]>(defaultOrder);
  const [openId, setOpenId]   = useState<string | null>(null);
  const [dragClasses, setDragClasses] = useState<Record<string, string>>({});
  const [orderLoaded, setOrderLoaded] = useState(false);

  // Reset local state when topic changes
  useEffect(() => {
    setOrder(mats.map(m => m.id));
    setOpenId(null);
    setDragClasses({});
    setOrderLoaded(false);
  }, [topic.id]);

  // #2: load persisted order from Firestore on mount / when uid or topic changes
  useEffect(() => {
    if (!uid) { setOrderLoaded(true); return; }
    loadSectionOrder(uid, topic.id).then(saved => {
      if (saved && saved.length > 0) {
        // Keep only ids that still exist, append any new ones at the end
        const existingIds = new Set(mats.map(m => m.id));
        const filtered = saved.filter(id => existingIds.has(id));
        const missing  = mats.map(m => m.id).filter(id => !filtered.includes(id));
        setOrder([...filtered, ...missing]);
      }
      setOrderLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, topic.id]);

  const sorted = order.map(id => mats.find(m => m.id === id)).filter(Boolean) as Material[];

  // Compute total seen for the reset-button label
  const totalSeen = sorted.reduce((s, m) => {
    const files = m.materials?.length > 0 ? m.materials : [];
    return s + files.filter(f => (seenMap[topic.id] || []).includes(f.url)).length;
  }, 0);

  // Check if order differs from default
  const isCustomOrder = order.join(",") !== defaultOrder.join(",");

  function toggleOpen(id: string) {
    setOpenId(p => p === id ? null : id);
  }

  function handleCardDrag(dragId: string, targetId: string | null, phase: "move" | "end") {
    if (phase === "move") {
      if (!targetId || targetId === dragId) {
        setDragClasses(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => { if (next[k] === "drop-target" || next[k] === "shift-up" || next[k] === "shift-down") delete next[k]; });
          return next;
        });
        return;
      }
      const si = order.indexOf(dragId);
      const di = order.indexOf(targetId);
      const next: Record<string, string> = { [targetId]: "drop-target" };
      order.forEach((id, ci) => {
        if (id === dragId || id === targetId) return;
        if (si < di && ci > si && ci <= di) next[id] = "shift-up";
        if (si > di && ci < si && ci >= di) next[id] = "shift-down";
      });
      setDragClasses(next);
    } else {
      setDragClasses({});
      if (!targetId || targetId === dragId) return;
      // #2 fix: compute new order outside setState so we can persist it immediately
      const next = [...order];
      const si = next.indexOf(dragId);
      const di = next.indexOf(targetId);
      if (si !== di) {
        next.splice(si, 1);
        next.splice(di, 0, dragId);
        setOrder(next);
        if (uid) persistSectionOrder(uid, topic.id, next);
      }
    }
  }

  // #3: reset to original order and save to Firestore
  function resetOrder() {
    setOrder(defaultOrder);
    if (uid) persistSectionOrder(uid, topic.id, defaultOrder);
  }

  // Notify parent whenever custom-order state changes so it can render the button in the header
  useEffect(() => {
    onResetState?.(isCustomOrder, resetOrder);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomOrder]);

  if (!orderLoaded) return null; // wait for Firestore before rendering

  return (
    <div className={`modules-grid${openId ? " has-open" : ""}`}>
      {sorted.map(mat => (
        <MaterialCard
          key={mat.id}
          mat={mat}
          topic={topic}
          seenMap={seenMap}
          isOpen={openId === mat.id}
          dragClass={dragClasses[mat.id] || ""}
          onToggle={() => toggleOpen(mat.id)}
          onOpenPreview={openPreview}
          onDrag={handleCardDrag}
          allIds={order}
          uid={uid}
        />
      ))}
    </div>
  );
}

// ── MaterialCard — single module-card with hold-to-drag ───────────────────────
const HOLD_MS = 300;

function MaterialCard({
  mat, topic, seenMap, isOpen, dragClass,
  onToggle, onOpenPreview, onDrag, allIds, uid,
}: {
  mat: Material;
  topic: Topic;
  seenMap: Record<string, string[]>;
  isOpen: boolean;
  dragClass: string;
  onToggle: () => void;
  onOpenPreview: (f: FileMat, mat: Material, topic: Topic) => void;
  onDrag: (dragId: string, targetId: string | null, phase: "move" | "end") => void;
  allIds: string[];
  uid: string | null;
}) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const [cardDragState, setCardDragState] = useState<"" | "hold-ready" | "is-dragging">("");
  const [fileOrder, setFileOrder] = useState<number[]>([]);
  const [heroMode, setHeroMode]   = useState<"bar" | "ring">("bar");

  useEffect(() => {
    // #4: default is always "bar" (localStorage fallback, no Firestore call here — that's done globally in ProgressRing)
    function readMode() {
      try { setHeroMode((localStorage.getItem("sp_global_hero") as "bar"|"ring") || "bar"); }
      catch { setHeroMode("bar"); }
    }
    readMode();
    function onStorage(e: StorageEvent) { if (e.key === "sp_global_hero") readMode(); }
    window.addEventListener("storage", onStorage);
    function onModeChange() { readMode(); }
    window.addEventListener("sp-hero-mode-change", onModeChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sp-hero-mode-change", onModeChange);
    };
  }, []);

  // Extract links from description when no materials are attached
  // (used by Evaluaciones posts that embed Quizizz/Forms URLs in the description)
  function extractDescriptionLinks(desc: string): FileMat[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = Array.from(new Set(desc.match(urlRegex) || [])); // deduplicate
    return urls.map((url, i) => {
      let type = "link";
      let title = `Enlace ${i + 1}`;
      if (url.includes("quizizz.com")) {
        type = "form"; title = `🎯 Quizizz ${i + 1}`;
      } else if (url.includes("forms.gle") || url.includes("docs.google.com/forms")) {
        type = "form"; title = `📋 Formulario ${i + 1}`;
      } else if (url.includes("docs.google.com")) {
        type = "drive"; title = `📄 Documento ${i + 1}`;
      }
      return { type, title, url };
    });
  }

  const files = mat.materials && mat.materials.length > 0
    ? mat.materials
    : mat.description
      ? extractDescriptionLinks(mat.description)
      : mat.alternateLink
        ? [{ type: "link", title: mat.title, url: mat.alternateLink }]
        : [];

  const seenCount = files.filter(f => (seenMap[topic.id] || []).includes(f.url)).length;
  const total     = files.length;
  const pct       = total > 0 ? Math.round(seenCount / total * 100) : 0;
  const allDone   = seenCount === total && total > 0;

  if (files.length === 0) return null;

  // ── Card drag (hold-to-drag on mc-head) ───────────────────────────────────
  function handleHeadPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // If already open, a tap just closes — no drag while open
    if (isOpen) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).addEventListener("pointerup", () => onToggle(), { once: true });
      return;
    }
    e.preventDefault();
    let dragActive = false, ghostCreated = false;
    let overTargetId: string | null = null;

    const holdTimer = setTimeout(() => {
      dragActive = true;
      setCardDragState("hold-ready");
      setTimeout(() => {
        if (!dragActive) return;
        ghostCreated = true;
        setCardDragState("is-dragging");
        if (cardRef.current) createGhost(cardRef.current);

        function onMove(ev: PointerEvent) {
          ev.preventDefault();
          moveGhost(ev.clientX, ev.clientY);
          const el = document.elementFromPoint(ev.clientX, ev.clientY);
          const tc = el?.closest(".module-card") as HTMLElement | null;
          const tid = tc?.dataset.mid || null;
          overTargetId = (tid && tid !== mat.id) ? tid : null;
          onDrag(mat.id, overTargetId, "move");
        }
        function onUp() {
          cleanup(true);
        }
        document.addEventListener("pointermove", onMove, { passive: false });
        document.addEventListener("pointerup", onUp, { once: true });

        function cleanup(commit: boolean) {
          document.removeEventListener("pointermove", onMove);
          removeGhost();
          const landing = overTargetId;
          dragActive = false; ghostCreated = false; overTargetId = null;
          setCardDragState("");
          onDrag(mat.id, commit ? landing : null, "end");
        }
      }, 50);
    }, HOLD_MS);

    function onEarlyUp() {
      clearTimeout(holdTimer);
      if (!dragActive) { setCardDragState(""); onToggle(); }
    }
    (e.currentTarget as HTMLElement).addEventListener("pointerup", onEarlyUp, { once: true });
    (e.currentTarget as HTMLElement).addEventListener("pointercancel", () => {
      clearTimeout(holdTimer); setCardDragState("");
    }, { once: true });
  }

  // ── File drag (hold-to-drag inside mc-files) ──────────────────────────────
  function handleFilePointerDown(e: React.PointerEvent<HTMLDivElement>, srcFiIdx: number) {
    e.stopPropagation();
    e.preventDefault();
    let dragActive = false;
    let overFiIdx: number | null = null;

    const holdTimer = setTimeout(() => {
      dragActive = true;
      const el = e.currentTarget as HTMLElement;
      el.classList.add("fc-hold-ready");
      setTimeout(() => {
        if (!dragActive) return;
        el.classList.remove("fc-hold-ready");
        el.classList.add("fc-dragging");

        function onMove(ev: PointerEvent) {
          ev.preventDefault();
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const tfc = under?.closest(".file-card") as HTMLElement | null;
          document.querySelectorAll(".file-card").forEach(c => c.classList.remove("fc-drop-target"));
          if (tfc && tfc !== el) {
            tfc.classList.add("fc-drop-target");
            overFiIdx = parseInt(tfc.dataset.fiIdx || "-1");
          } else { overFiIdx = null; }
        }
        function onUp() {
          document.removeEventListener("pointermove", onMove);
          el.classList.remove("fc-dragging");
          document.querySelectorAll(".file-card").forEach(c => c.classList.remove("fc-drop-target"));
          if (dragActive && overFiIdx != null && overFiIdx !== srcFiIdx) {
            setFileOrder(prev => {
              const base = prev.length === files.length ? prev : files.map((_, i) => i);
              const next = [...base];
              const si = next.indexOf(srcFiIdx);
              const di = next.indexOf(overFiIdx!);
              if (si !== -1 && di !== -1) { next.splice(si, 1); next.splice(di, 0, srcFiIdx); }
              return next;
            });
          }
          dragActive = false; overFiIdx = null;
        }
        document.addEventListener("pointermove", onMove, { passive: false });
        document.addEventListener("pointerup", onUp, { once: true });
      }, 50);
    }, HOLD_MS);

    e.currentTarget.addEventListener("pointerup", () => {
      clearTimeout(holdTimer);
    }, { once: true });
    e.currentTarget.addEventListener("pointercancel", () => {
      clearTimeout(holdTimer);
      (e.currentTarget as HTMLElement).classList.remove("fc-hold-ready", "fc-dragging");
    }, { once: true });
  }

  // If fileOrder hasn't been seeded yet (e.g. files come from description, not mat.materials),
  // fall back to the natural files order.
  const orderedFiles = fileOrder.length === files.length && files.length > 0
    ? fileOrder.map(i => files[i]).filter(Boolean)
    : files;

  const extraClasses = [
    isOpen ? "open" : "",
    allDone ? "complete" : "",
    dragClass,
    cardDragState,
  ].filter(Boolean).join(" ");

  return (
    <div
      className={`module-card${extraClasses ? " " + extraClasses : ""}`}
      ref={cardRef}
      data-mid={mat.id}
    >
      {/* Card header — hold to drag, tap to toggle */}
      <div className="mc-head" onPointerDown={handleHeadPointerDown}>
        <div className="mc-emoji" style={{background:"var(--bg3)"}}>📄</div>
        <div className="mc-title-wrap">
          <div className="mc-title">{mat.title}</div>
          <div className="mc-desc">{seenCount}/{total} archivos vistos</div>
        </div>
        {heroMode === "bar" ? (
          <div className="mc-bar-mini">
            <div className="mc-bar-mini-track">
              <div className={`mc-bar-mini-fill${allDone ? " full" : ""}`} style={{width:`${pct}%`}} />
            </div>
            <div className="mc-bar-mini-label">{pct}%</div>
          </div>
        ) : (
          <div className="mc-ring-mini" title={`${pct}% completado`}>
            <svg width="34" height="34" viewBox="0 0 34 34" style={{transform:"rotate(-90deg)"}}>
              <circle cx="17" cy="17" r="13" fill="none" stroke="var(--border)" strokeWidth="3.5"/>
              <circle cx="17" cy="17" r="13" fill="none"
                stroke={allDone ? "#4ade80" : "var(--accent2)"}
                strokeWidth="3.5"
                strokeDasharray={`${(2*Math.PI*13*pct/100).toFixed(1)} ${(2*Math.PI*13*(1-pct/100)).toFixed(1)}`}
                strokeLinecap="round"
                style={{transition:"stroke-dasharray 0.4s"}}
              />
            </svg>
            <span className="mc-ring-mini-label">{pct}%</span>
          </div>
        )}
        <span className="mc-chevron">▶</span>
      </div>

      {/* Progress line */}
      <div className="mc-prog">
        <div className={`mc-prog-fill${allDone ? " full" : ""}`} style={{width:`${pct}%`}} />
      </div>

      {/* Files grid */}
      <div className="mc-files">
        {orderedFiles.map((f, displayIdx) => {
          const origIdx = fileOrder[displayIdx] ?? displayIdx;
          const s = (seenMap[topic.id] || []).includes(f.url);
          return (
            <div
              key={origIdx ?? displayIdx}
              className={`file-card${s ? " done" : ""}`}
              data-mid={mat.id}
              data-fi-idx={String(origIdx)}
              onPointerDown={e => handleFilePointerDown(e, origIdx)}
              onPointerUp={e => {
                e.stopPropagation();
                // Only fire preview if not dragging (class check)
                const el = e.currentTarget as HTMLElement;
                if (!el.classList.contains("fc-dragging")) {
                  onOpenPreview(f, mat, topic);
                }
              }}
            >
              <div className="fc-icon">{fileIcon(f)}</div>
              <div className="fc-body">
                <div className="fc-name">{f.title || mat.title}</div>
                <div className="fc-meta">
                  <span className="fc-tag">{f.type?.toUpperCase() || "PDF"}</span>
                </div>
                <span className="fc-open">Ver documento →</span>
              </div>
              <div className={`fc-seen${s ? " done" : ""}`}>{s ? "✓" : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Alias for backward compat with render below
function MaterialAccordion(props: Parameters<typeof MaterialCard>[0]) {
  return <MaterialCard {...props} />;
}

// ── OLD AccordionSection (kept for reference, replaced by SectionButton) ──────
function AccordionSection({
  topic, mats, seenMap, isActive, onToggle, onOpenPreview, dbSecciones = []
}: {
  topic: Topic;
  mats: Material[];
  seenMap: Record<string, string[]>;
  isActive: boolean;
  onToggle: () => void;
  onOpenPreview: (f: FileMat, mat: Material, topic: Topic) => void;
  dbSecciones?: any[];
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isActive ? contentRef.current.scrollHeight : 0);
    }
  }, [isActive, mats]);

  const total = mats.reduce((s, m) => s + (m.materials?.length || 0), 0);
  const seen  = (seenMap[topic.id] || []).length;
  const pct   = total > 0 ? Math.round(seen / total * 100) : 0;
  const num   = numeral(topic.name);

  return (
    <div className={`accord-item${isActive ? " active" : ""}`}>
      <button className="accord-trigger" onClick={onToggle} aria-expanded={isActive}>
        <span className="accord-icon">{topicIcon(topic.name, dbSecciones)}</span>
        <span className="accord-label">
          <span className="accord-num">{num}</span>
          <span className="accord-name">{topic.name.replace(num, "").trim()}</span>
        </span>
        <span className="accord-meta">
          {total > 0 && <span className="accord-count">{total}</span>}
          {pct > 0 && (
            <span className="accord-pct" style={{color: pct === 100 ? "#4ade80" : "var(--accent2)"}}>
              {pct}%
            </span>
          )}
        </span>
        <span className={`accord-chevron${isActive ? " open" : ""}`}>›</span>
      </button>

      {total > 0 && (
        <div style={{height:2,background:"var(--bg3)",overflow:"hidden"}}>
          <div style={{
            width:`${pct}%`,height:"100%",
            background: pct===100 ? "#4ade80" : "var(--accent2)",
            transition:"width 0.5s"
          }} />
        </div>
      )}

      <div className="accord-body" style={{maxHeight: height, overflow:"hidden", transition:"max-height 0.3s ease"}}>
        <div ref={contentRef} className="accord-content">
          {mats.length === 0 && (
            <p style={{color:"var(--muted)",fontSize:"0.78rem",padding:"0.4rem 0.5rem"}}>Sin material aún.</p>
          )}
          {mats.map(mat => (
            <div key={mat.id} className="accord-mat">
              {mat.title && <div className="accord-mat-title">{mat.title}</div>}
              {mat.materials && mat.materials.length > 0 ? (
                <div className="accord-files">
                  {mat.materials.map((f, fi) => {
                    const s = (seenMap[topic.id] || []).includes(f.url);
                    return (
                      <button
                        key={fi}
                        className={`accord-file${s ? " seen" : ""}`}
                        onClick={() => onOpenPreview(f, mat, topic)}
                      >
                        <span className="accord-file-icon">{fileIcon(f)}</span>
                        <span className="accord-file-name">{f.title || mat.title}</span>
                        {s && <span style={{marginLeft:"auto",fontSize:"0.62rem",flexShrink:0}}>✅</span>}
                      </button>
                    );
                  })}
                </div>
              ) : mat.alternateLink ? (
                <div className="accord-files">
                  <button
                    className={`accord-file${(seenMap[topic.id]||[]).includes(mat.alternateLink) ? " seen" : ""}`}
                    onClick={() => onOpenPreview({type:"link",title:mat.title,url:mat.alternateLink}, mat, topic)}
                  >
                    <span className="accord-file-icon">🔗</span>
                    <span className="accord-file-name">{mat.title}</span>
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MaterialesClient({ dbSecciones = [] }: { dbSecciones?: any[] }) {
  const { user }  = useAuth();
  
  // Si tenemos datos del JSON local (dbSecciones), los transformamos al formato que espera el componente
  const topics: Topic[] = dbSecciones.length > 0 
    ? dbSecciones.map(s => ({ id: s.id, name: s.name, emoji: s.emoji }))
    : ((classroomData as any).topics || []) as Topic[];

  const allMats: Material[] = dbSecciones.length > 0
    ? dbSecciones.flatMap(s => s.materials || [])
    : ((classroomData as any).materials || []) as Material[];

  const byTopic: Record<string, Material[]> = {};
  for (const m of allMats) {
    byTopic[m.topicId] = byTopic[m.topicId] || [];
    byTopic[m.topicId].push(m);
  }

  const [activeTid, setActiveTid] = useState<string>("");
  const [seenMap, setSeenMap]     = useState<Record<string, string[]>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [preview, setPreview]     = useState<PreviewState | null>(null);
  const [authOpen, setAuthOpen]   = useState(false);
  const [gridIsCustomOrder, setGridIsCustomOrder] = useState(false);
  const [gridResetFn, setGridResetFn]             = useState<(() => void) | null>(null);

  function handleResetState(isCustom: boolean, resetFn: () => void) {
    setGridIsCustomOrder(isCustom);
    setGridResetFn(() => resetFn);
  }

  // Read hash on mount AND on hashchange (dropdown navigation while already on page)
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash;
      if (hash.startsWith("#sec-")) {
        const tid = hash.replace("#sec-", "");
        if (topics.find(t => t.id === tid)) setActiveTid(tid);
      }
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSeenMap(readSeen());
    const handler = () => setSeenMap(readSeen());
    window.addEventListener("sp-seen-change", handler);
    return () => window.removeEventListener("sp-seen-change", handler);
  }, []);

  // Sync Firestore → localStorage when user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sb = getSupabase();
        const { data: profile } = await sb.from("profiles").select("progress").eq("id", user.id).single();
        const remoteProgress = (profile?.progress as Record<string, string[]>) || {};
        
        const local = readSeen();
        let changed = false;
        Object.entries(remoteProgress).forEach(([tid, seen]) => {
          const local_arr = local[tid] || [];
          const merged = Array.from(new Set([...local_arr, ...seen]));
          if (merged.length !== local_arr.length) {
            local[tid] = merged;
            changed = true;
          }
        });
        if (changed) writeSeen(local);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  function toggleSeen(topicId: string, fileUrl: string) {
    setSeenMap(prev => {
      const next = { ...prev };
      const arr  = [...(next[topicId] || [])];
      const idx  = arr.indexOf(fileUrl);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(fileUrl);
      next[topicId] = arr;
      writeSeen(next);
      if (user) persistTopicProgress(user.uid, topicId, arr);
      return next;
    });
  }

  function openPreview(f: FileMat, mat: Material, topic: Topic) {
    if (!user) { setAuthOpen(true); return; }
    const fileUrl = f.url || mat.alternateLink;
    if (!isPreviewable(f)) { window.open(fileUrl, "_blank", "noopener"); return; }
    trackRecentFile(user?.uid ?? null, fileUrl, f.title || mat.title, f.type, topic.name, mat.title);
    setPreview({
      url: getPreviewUrl(f),
      title: f.title || mat.title,
      meta: topic.name,
      icon: fileIcon(f),
      openUrl: fileUrl,
      topicId: topic.id,
      fileUrl,
    });
  }


  const activeTopic = topics.find(t => t.id === activeTid);
  const totalFiles  = allMats.reduce((s, m) => s + (m.materials?.length || 0), 0);
  const totalSeen   = Object.values(seenMap).reduce((s, a) => s + a.length, 0);
  const activeMats  = activeTid
    ? (byTopic[activeTid] || [])
    : [];
  // Count files including description-extracted links
  function countFiles(m: Material): number {
    if (m.materials && m.materials.length > 0) return m.materials.length;
    if (m.description) {
      const urls = Array.from(new Set(m.description.match(/https?:\/\/[^\s]+/g) || []));
      if (urls.length > 0) return urls.length;
    }
    return m.alternateLink ? 1 : 0;
  }
  const activeTotal = activeMats.reduce((s, m) => s + countFiles(m), 0);

  return (
    <>
      {/* AuthModal — shown when unauthenticated user tries to open a file */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Hero — only on picker screen, hidden once inside a section */}
      {!activeTid && <div className="yt-hero">
        <div className="yt-hero-inner">
          <div className="yt-hero-icon" style={{background:"#4f46e5"}}>
            <span style={{fontSize:"1.5rem", lineHeight:1}}>📚</span>
          </div>
          <div className="yt-hero-texts">
            <h1>📚 Material de estudio</h1>
            <p>
              {topics.length} secciones · {totalFiles} archivos ·{" "}
              <strong style={{color:"rgba(255,255,255,0.95)"}}>{totalSeen}</strong> vistos
              {!user && <span style={{opacity:0.75}}> · inicia sesión para sincronizar</span>}
            </p>
          </div>
        </div>
      </div>}

      {/* ── Progress bar / ring (below yt-hero) ── */}
      {activeTopic && activeTotal > 0 && (
        <ProgressRing
          topicId={activeTid}
          topicName={activeTopic.name}
          total={activeTotal}
        />
      )}

      {/* ── Two-column layout — sidebar hidden on picker screen ── */}
      <div className={`mat-layout${!activeTid ? " mat-layout--picker" : ""}`}>

        {/* LEFT SIDEBAR — hidden when no section selected */}
        <aside className={`mat-sidebar${!activeTid ? " mat-sidebar--hidden" : ""}`}>
          <button
            className="mat-sidebar-label mat-sidebar-toggle"
            onClick={() => setMobileSidebarOpen(p => !p)}
            aria-expanded={mobileSidebarOpen}
          >
            <span>📂 Secciones</span>
            <span className="mat-sidebar-chevron">{mobileSidebarOpen ? "▲" : "▼"}</span>
          </button>
          <div className={`accord-list mat-sidebar-list${mobileSidebarOpen ? " open" : ""}`} style={{display:"flex",flexDirection:"column",gap:"0.2rem"}}>
            {topics.map(t => (
              <SectionButton
                key={t.id}
                topic={t}
                mats={byTopic[t.id] || []}
                seenMap={seenMap}
                isActive={activeTid === t.id}
                onSelect={() => { setActiveTid(t.id); setMobileSidebarOpen(false); }}
                dbSecciones={dbSecciones}
              />
            ))}
          </div>
        </aside>

        {/* RIGHT MAIN — detail of active section */}
        <main className="mat-main">
          {activeTopic ? (
            <>
              <div className="mat-main-header">
                <span style={{fontSize:"2rem",flexShrink:0,lineHeight:1}}>{topicIcon(activeTopic.name, dbSecciones)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="mat-main-title">{activeTopic.name}</div>
                  <div className="mat-main-sub" style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                    <span>
                      {activeTotal} archivos ·{" "}
                      <strong style={{color:"var(--accent2)"}}>{(seenMap[activeTid]||[]).length}</strong> vistos
                    </span>
                    {gridIsCustomOrder && (
                      <button
                        onClick={() => gridResetFn?.()}
                        title="Restaurar el orden original"
                        style={{
                          background: "none",
                          border: "1.5px solid var(--border)",
                          borderRadius: 6,
                          padding: ".1rem .45rem",
                          fontSize: ".72rem",
                          color: "var(--muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: ".25rem",
                          lineHeight: 1.4,
                          transition: "border-color .18s, color .18s",
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent2)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--accent2)";
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                        }}
                      >↺ Orden original</button>
                    )}
                  </div>
                </div>
              </div>

              {activeMats.length === 0 && (
                <p style={{color:"var(--muted)",fontSize:"0.88rem",marginTop:"1rem"}}>Sin material en esta sección aún.</p>
              )}

              <ModulesGrid
                mats={activeMats}
                topic={activeTopic}
                seenMap={seenMap}
                openPreview={openPreview}
                uid={user?.uid ?? null}
                onResetState={handleResetState}
              />
            </>
          ) : (
            /* ── Section picker — shown when no section is selected (direct /materiales visit) ── */
            <div className="mat-picker">
              <p className="mat-picker-label">📂 Elige una sección para comenzar</p>
              <div className="mat-picker-grid">
                {topics.map(t => {
                  const num   = t.name.split(".")[0] + ".";
                  const icon  = topicIcon(t.name, dbSecciones);
                  const label = t.name.replace(/^[IVX]+\.\s*/, "").replace(/\s*\(Curso Activo\)\s*/g, "").trim();
                  const active = t.name.includes("Curso Activo");
                  const count  = (byTopic[t.id] || []).reduce((s: number, m: Material) => s + countFiles(m), 0);
                  return (
                    <button
                      key={t.id}
                      className={"mat-picker-card" + (active ? " mat-picker-card--active" : "")}
                      onClick={() => setActiveTid(t.id)}
                    >
                      {active && <span className="mat-picker-badge">Activo</span>}
                      <span className="mat-picker-icon">{icon}</span>
                      <div className="mat-picker-body">
                        <div className="mat-picker-num">{num}</div>
                        <div className="mat-picker-name">{label}</div>
                        {count > 0 && <div className="mat-picker-count">{count} archivos</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <ContentPreviewerModal
        preview={preview}
        onClose={() => setPreview(null)}
        onToggleSeen={toggleSeen}
        seenMap={seenMap}
      />
    </>
  );
}
