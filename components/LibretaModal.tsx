"use client";
// components/LibretaModal.tsx — Libreta con sidebar lateral + estilos de previsualizador
// Importar con dynamic({ ssr: false }) desde Nav.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth, getEmoji } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";

/* ── Types ── */
type NoteType   = string;  // permite tipos nativos + custom
type NoteStatus = string;  // permite estados nativos + custom
interface CheckItem { id: string; text: string; done: boolean; }
interface MatRef    { id: string; label: string; url?: string; }
interface Note {
  id: string; title: string; type: NoteType; status: NoteStatus;
  content: string; checklist: CheckItem[]; refs: MatRef[];
  ts: number; updatedTs: number;
}
interface CustomSection { id: string; label: string; color: string; }
interface CustomType    { id: string; label: string; emoji: string; color: string; }
interface Props {
  open: boolean;
  onClose: () => void;
  materials?: { id: string; title: string; alternateLink?: string }[];
  userName?: string;
}

/* ── Metadata nativa ── */
const NATIVE_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
  apunte:  { label: "Apunte",  emoji: "📝", color: "#2e6fc4" },
  tarea:   { label: "Tarea",   emoji: "✅", color: "#e67e22" },
  formula: { label: "Fórmula", emoji: "🔢", color: "#8e44ad" },
  link:    { label: "Link",    emoji: "🔗", color: "#27ae60" },
};
const NATIVE_STATUSES: Record<string, { label: string; color: string }> = {
  "por-revisar": { label: "Por revisar", color: "#2e6fc4" },
  "en-progreso": { label: "En progreso", color: "#e67e22" },
  "listo":       { label: "Listo",       color: "#27ae60" },
};
const CUSTOM_COLORS = ["#e74c3c","#e67e22","#f1c40f","#27ae60","#2e6fc4","#8e44ad","#1abc9c","#c0392b","#16a085","#2980b9"];
const CUSTOM_EMOJIS = ["⭐","🏷️","🎯","💡","📌","🚀","🔖","📊","🧩","🗂️"];

/* ── Helpers ── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function htmlToText(html: string, max: number): string {
  try {
    const d = document.createElement("div");
    d.innerHTML = html;
    const t = (d.textContent || d.innerText || "").trim().slice(0, max);
    return t.length === max ? t + "…" : t;
  } catch {
    return html.replace(/<[^>]+>/g, "").slice(0, max);
  }
}
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}

/* ── Component ── */
export function LibretaModal({ open, onClose, materials = [], userName = "" }: Props) {
  const { user }    = useAuth();
  const overlayRef  = useRef<HTMLDivElement>(null);
  const editorRef   = useRef<HTMLDivElement>(null);

  const [notes,           setNotes]           = useState<Note[]>([]);
  const [isSaving,        setIsSaving]        = useState(false);
  const [wasSaved,        setWasSaved]        = useState(false);
  const [filterType,      setFilterType]      = useState<string>("all");
  const [activeId,        setActiveId]        = useState<string | null>(null);
  const [isNew,           setIsNew]           = useState(false);
  const [showRefs,        setShowRefs]        = useState(false);
  const [showLink,        setShowLink]        = useState(false);
  const [linkHref,        setLinkHref]        = useState("");
  const [draft,           setDraft]           = useState<Note | null>(null);
  const [sidebarSel,      setSidebarSel]      = useState<string>("all");
  const [hoveredSidebar,  setHoveredSidebar]  = useState<string | null>(null);
  const [isMaximized,     setIsMaximized]     = useState(false);
  // Custom secciones y tipos
  const [customSections,  setCustomSections]  = useState<CustomSection[]>([]);
  const [customTypes,     setCustomTypes]     = useState<CustomType[]>([]);
  // Menú 3 puntos
  const [sectionMenu,     setSectionMenu]     = useState<string | null>(null);
  const [typeMenu,        setTypeMenu]        = useState<string | null>(null);
  // Modal agregar sección/tipo
  const [addingSection,   setAddingSection]   = useState(false);
  const [addingSectionLabel, setAddingSectionLabel] = useState("");
  const [addingSectionColor, setAddingSectionColor] = useState(CUSTOM_COLORS[0]);
  const [addingType,      setAddingType]      = useState(false);
  const [addingTypeLabel, setAddingTypeLabel] = useState("");
  const [addingTypeEmoji, setAddingTypeEmoji] = useState(CUSTOM_EMOJIS[0]);
  const [addingTypeColor, setAddingTypeColor] = useState(CUSTOM_COLORS[4]);

  /* Load — dos documentos separados en paralelo */
  useEffect(() => {
    if (!open) return;
    // Caché local como fallback inmediato mientras llega Firestore
    const raw = lsGet("sp-libreta-v2");
    if (raw) { try { setNotes(JSON.parse(raw)); } catch {} }
    const rawSections = lsGet("sp-libreta-sections");
    if (rawSections) { try { setCustomSections(JSON.parse(rawSections)); } catch {} }
    const rawTypes = lsGet("sp-libreta-types");
    if (rawTypes) { try { setCustomTypes(JSON.parse(rawTypes)); } catch {} }
    // Firestore como fuente de verdad — dos docs en paralelo
    if (user) {
      (async () => {
        try {
          const sb = getSupabase();
          const { data: profile } = await sb
            .from("profiles")
            .select("libreta, libreta_meta")
            .eq("id", user.id)
            .single();

          if (profile) {
            if (profile.libreta) {
              const n = profile.libreta as Note[];
              setNotes(n);
              lsSet("sp-libreta-v2", JSON.stringify(n));
            }
            if (profile.libreta_meta) {
              const meta = profile.libreta_meta as any;
              if (Array.isArray(meta.customSections)) {
                setCustomSections(meta.customSections);
                lsSet("sp-libreta-sections", JSON.stringify(meta.customSections));
              }
              if (Array.isArray(meta.customTypes)) {
                setCustomTypes(meta.customTypes);
                lsSet("sp-libreta-types", JSON.stringify(meta.customTypes));
              }
            }
          }
        } catch (e) { console.error("Error loading notes", e); }
      })();
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC para cerrar
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closeEditor(); onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Persist solo notas — doc "libreta" (un write directo, sin leer antes) */
  const persist = useCallback(async (n: Note[]) => {
    setNotes(n);
    lsSet("sp-libreta-v2", JSON.stringify(n));
    if (user) {
      setIsSaving(true);
      try {
        const sb = getSupabase();
        await sb.from("profiles").update({ libreta: n }).eq("id", user.id);
        setWasSaved(true);
        setTimeout(() => setWasSaved(false), 2500);
      } catch {}
      setIsSaving(false);
    }
  }, [user]);

  /* Persist solo metadatos — doc "libreta-meta" (write independiente, no toca notas) */
  const persistMeta = useCallback(async (
    sections: CustomSection[],
    types: CustomType[],
  ) => {
    lsSet("sp-libreta-sections", JSON.stringify(sections));
    lsSet("sp-libreta-types", JSON.stringify(types));
    if (user) {
      try {
        const sb = getSupabase();
        await sb.from("profiles").update({
          libreta_meta: { customSections: sections, customTypes: types }
        }).eq("id", user.id);
      } catch {}
    }
  }, [user]);

  /* persistFull: notas + metadatos en paralelo (para deleteSection/deleteType
     que además mueve notas) */
  const persistFull = useCallback(async (
    n: Note[],
    sections: CustomSection[],
    types: CustomType[],
  ) => {
    setNotes(n);
    lsSet("sp-libreta-v2", JSON.stringify(n));
    lsSet("sp-libreta-sections", JSON.stringify(sections));
    lsSet("sp-libreta-types", JSON.stringify(types));
    if (user) {
      setIsSaving(true);
      try {
        const sb = getSupabase();
        await sb.from("profiles").update({
          libreta: n,
          libreta_meta: { customSections: sections, customTypes: types }
        }).eq("id", user.id);
        setWasSaved(true);
        setTimeout(() => setWasSaved(false), 2500);
      } catch {}
      setIsSaving(false);
    }
  }, [user]);

  /* Set editor content */
  useEffect(() => {
    if (!activeId || !editorRef.current || !draft) return;
    editorRef.current.innerHTML = draft.content ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function openCard(note: Note) {
    setDraft({ ...note, checklist: note.checklist ?? [], refs: note.refs ?? [] });
    setActiveId(note.id);
    setIsNew(false);
    setShowRefs(false);
    setShowLink(false);
  }

  function newCard() {
    const n: Note = {
      id: genId(), ts: Date.now(), updatedTs: Date.now(),
      title: "", type: "apunte", status: "por-revisar",
      content: "", checklist: [], refs: [],
    };
    setDraft(n);
    setActiveId(n.id);
    setIsNew(true);
    setShowRefs(false);
    setShowLink(false);
  }

  function closeEditor() {
    setActiveId(null);
    setDraft(null);
    setIsNew(false);
    setShowRefs(false);
    setShowLink(false);
    setLinkHref("");
  }

  /* ── Custom sections helpers ── */
  function addSection() {
    const label = addingSectionLabel.trim();
    if (!label) return;
    const id = "s-" + genId();
    const next = [...customSections, { id, label, color: addingSectionColor }];
    setCustomSections(next);
    persistMeta(next, customTypes);   // solo escribe libreta-meta, no toca notas
    setAddingSection(false);
    setAddingSectionLabel("");
    setAddingSectionColor(CUSTOM_COLORS[0]);
  }
  function deleteSection(id: string) {
    const updatedNotes = notes.map(n => n.status === id ? { ...n, status: "por-revisar" } : n);
    const next = customSections.filter(s => s.id !== id);
    setCustomSections(next);
    persistFull(updatedNotes, next, customTypes);
    if (sidebarSel === id) setSidebarSel("all");
    setSectionMenu(null);
  }

  /* ── Custom types helpers ── */
  function addType() {
    const label = addingTypeLabel.trim();
    if (!label) return;
    const id = "t-" + genId();
    const next = [...customTypes, { id, label, emoji: addingTypeEmoji, color: addingTypeColor }];
    setCustomTypes(next);
    persistMeta(customSections, next);   // solo escribe libreta-meta, no toca notas
    setAddingType(false);
    setAddingTypeLabel("");
    setAddingTypeEmoji(CUSTOM_EMOJIS[0]);
    setAddingTypeColor(CUSTOM_COLORS[4]);
  }
  function deleteType(id: string) {
    const updatedNotes = notes.map(n => n.type === id ? { ...n, type: "apunte" } : n);
    const next = customTypes.filter(t => t.id !== id);
    setCustomTypes(next);
    persistFull(updatedNotes, customSections, next);
    if (filterType === id) setFilterType("all");
    setTypeMenu(null);
  }

  /* ── Metadata lookup (native + custom) ── */
  function getTypeMeta(id: string) {
    return NATIVE_TYPES[id] ?? customTypes.find(t => t.id === id) ?? { label: id, emoji: "📝", color: "#2e6fc4" };
  }
  function getStatusMeta(id: string) {
    return NATIVE_STATUSES[id] ?? (() => {
      const s = customSections.find(s => s.id === id);
      return s ? { label: s.label, color: s.color } : { label: id, color: "#64748b" };
    })();
  }

  function saveDraft() {
    if (!draft) return;
    const updated: Note = {
      ...draft,
      content: editorRef.current?.innerHTML ?? draft.content,
      updatedTs: Date.now(),
    };
    const next = isNew
      ? [updated, ...notes]
      : notes.map(n => n.id === updated.id ? updated : n);
    persist(next);
    closeEditor();
  }

  function deleteDraft() {
    if (!draft) return;
    persist(notes.filter(n => n.id !== draft.id));
    closeEditor();
  }

  function addCheck() {
    setDraft(p => p ? ({ ...p, checklist: [...p.checklist, { id: genId(), text: "", done: false }] }) : p);
  }
  function toggleCheck(id: string) {
    setDraft(p => p ? ({ ...p, checklist: p.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c) }) : p);
  }
  function updateCheckText(id: string, text: string) {
    setDraft(p => p ? ({ ...p, checklist: p.checklist.map(c => c.id === id ? { ...c, text } : c) }) : p);
  }
  function removeCheck(id: string) {
    setDraft(p => p ? ({ ...p, checklist: p.checklist.filter(c => c.id !== id) }) : p);
  }

  function toggleRef(mat: { id: string; title: string; alternateLink?: string }) {
    setDraft(p => {
      if (!p) return p;
      const exists = p.refs.find(r => r.id === mat.id);
      return {
        ...p,
        refs: exists
          ? p.refs.filter(r => r.id !== mat.id)
          : [...p.refs, { id: mat.id, label: mat.title, url: mat.alternateLink }],
      };
    });
  }
  function removeRef(id: string) {
    setDraft(p => p ? ({ ...p, refs: p.refs.filter(r => r.id !== id) }) : p);
  }

  function execCmd(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
  }
  function insertLink() {
    const href = linkHref.trim();
    if (!href) return;
    execCmd("createLink", href);
    setShowLink(false);
    setLinkHref("");
  }

  /* Filtered notes */
  const filtered = (() => {
    const base = notes.filter(n =>
      (filterType === "all" || n.type === filterType) &&
      (sidebarSel === "all" || n.status === sidebarSel)
    );
    return sidebarSel === "all"
      ? [...base].sort((a, b) => (b.updatedTs || b.ts) - (a.updatedTs || a.ts))
      : base;
  })();

  const countByStatus = (s: string) => notes.filter(n => n.status === s).length;
  const libretaTitle = userName ? `Libreta de ${userName}` : "Libreta de apuntes";

  if (!open) return null;

  /* ── Shared style tokens ── */
  const border = "1px solid var(--border, #e2e8f0)";
  const bg2    = "var(--bg2, #f8fafc)";
  const fg     = "var(--text, #1a2640)";
  const muted  = "var(--muted, #64748b)";
  const accent = "var(--accent, #2e6fc4)";

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) { closeEditor(); onClose(); } }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{
        background: "var(--bg, #fff)", borderRadius: isMaximized ? "0" : "12px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)",
        width: isMaximized ? "100vw" : "min(92vw, 860px)",
        height: isMaximized ? "100vh" : "min(75vh, 600px)",
        maxHeight: isMaximized ? "100vh" : "calc(100dvh - 80px)",
        ...(isMaximized ? { position: "fixed" as const, inset: 0 } : {}),
        display: "flex", flexDirection: "column", overflow: "hidden",
        border,
        transition: "border-radius 0.2s, width 0.2s, height 0.2s",
      }}>

        {/* ── Barra macOS con puntitos ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "10px 14px", background: bg2, borderBottom: border, flexShrink: 0,
        }}>
          {/* Traffic lights */}
          {[
            { color: "#ff5f57", action: () => { closeEditor(); onClose(); }, title: "Cerrar" },
            { color: "#febc2e", action: undefined, title: "Minimizar" },
            { color: "#28c840", action: () => setIsMaximized(p => !p), title: isMaximized ? "Restaurar" : "Maximizar" },
          ].map(dot => (
            <span
              key={dot.color}
              onClick={dot.action}
              title={dot.title}
              style={{
                width: 12, height: 12, borderRadius: "50%", background: dot.color,
                flexShrink: 0, cursor: dot.action ? "pointer" : "default",
                display: "inline-block",
              }}
            />
          ))}

          {/* Título centrado */}
          <span style={{
            flex: 1, textAlign: "center", fontSize: "0.82rem", fontWeight: 600,
            color: muted, letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            📓 {activeId ? (draft?.title || "Nueva nota") : libretaTitle}
          </span>

          {/* Estado de guardado + botón cerrar */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
            {isSaving && (
              <span style={{
                fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                background: "#fef3c7", color: "#92400e",
              }}>Guardando…</span>
            )}
            {wasSaved && !isSaving && (
              <span style={{
                fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                background: "#d1fae5", color: "#065f46",
              }}>✓ Guardado</span>
            )}
            <button
              onClick={() => { closeEditor(); onClose(); }}
              title="Cerrar"
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: "1px solid var(--border, #e2e8f0)",
                background: "transparent",
                cursor: "pointer", fontSize: "0.9rem",
                color: muted, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 16px 10px", borderBottom: border, flexShrink: 0,
        }}>
          {activeId && (
            <button onClick={closeEditor} style={{
              background: "none", border: "none", color: accent,
              cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
              padding: "2px 6px", borderRadius: 6, flexShrink: 0,
            }}>← Volver</button>
          )}
          {activeId && draft ? (
            <input
              placeholder="Título de la nota…"
              value={draft.title}
              onChange={e => setDraft(p => p ? ({ ...p, title: e.target.value }) : p)}
              style={{
                flex: 1, border: "none", background: "transparent", color: fg,
                fontSize: "1.05rem", fontWeight: 700, outline: "none",
                padding: "2px 4px", borderRadius: 4, minWidth: 0,
              }}
            />
          ) : (
            <>
              <h2 style={{
                fontSize: "1.05rem", fontWeight: 700, color: fg, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                flex: 1,
              }}>
                {libretaTitle}
              </h2>
              {/* Maximize + Nueva nota buttons */}
              <button
                onClick={() => setIsMaximized(p => !p)}
                title={isMaximized ? "Restaurar tamaño" : "Maximizar"}
                style={{
                  padding: "5px 13px", borderRadius: 99,
                  border: "1px solid var(--border, #e2e8f0)",
                  background: "transparent", color: muted,
                  fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all .15s", gap: "4px",
                  whiteSpace: "nowrap",
                }}
              >{isMaximized ? "↙ Reducir" : "↗ Expandir"}</button>
              <button
                onClick={newCard}
                style={{
                  padding: "5px 13px", borderRadius: 99, border: "none",
                  background: accent, color: "#fff",
                  fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >+ Nueva nota</button>
            </>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* SIDEBAR */}
          {!activeId && (
            <div
              style={{
                width: 138, minWidth: 138, borderRight: border,
                display: "flex", flexDirection: "column", padding: "8px 5px",
                overflowY: "auto", background: bg2, flexShrink: 0,
                position: "relative",
              }}
              onClick={() => { setSectionMenu(null); setTypeMenu(null); }}
            >
              {/* Todas */}
              <button
                onClick={() => setSidebarSel("all")}
                onMouseEnter={() => setHoveredSidebar("all")}
                onMouseLeave={() => setHoveredSidebar(null)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "6px 8px", borderRadius: "7px",
                  border: "1.5px solid transparent",
                  background: sidebarSel === "all" ? accent : hoveredSidebar === "all" ? accent + "12" : "transparent",
                  color: sidebarSel === "all" ? "#fff" : fg,
                  cursor: "pointer", fontSize: "0.79rem", fontWeight: 600,
                  width: "100%", textAlign: "left", transition: "all .15s",
                }}
              >
                <span>📋</span>
                <span style={{ flex: 1 }}>Todas</span>
                <span style={{ fontSize: "0.68rem", opacity: 0.7 }}>{notes.length}</span>
              </button>

              <div style={{ height: 1, background: "var(--border, #e2e8f0)", margin: "5px 3px" }} />
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: muted, margin: "0 4px 4px", opacity: .7 }}>Estados</p>

              {/* Estados nativos */}
              {Object.entries(NATIVE_STATUSES).map(([s, sm]) => {
                const cnt    = countByStatus(s);
                const active = sidebarSel === s;
                const isMenuOpen = sectionMenu === s;
                return (
                  <div key={s} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => setSidebarSel(s)}
                      onMouseEnter={() => setHoveredSidebar(s)}
                      onMouseLeave={() => setHoveredSidebar(null)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: "5px",
                        padding: "5px 6px", borderRadius: "7px",
                        border: "1.5px solid transparent",
                        borderLeft: active ? `3px solid ${sm.color}` : hoveredSidebar === s ? `3px solid ${sm.color}88` : "3px solid transparent",
                        background: active ? sm.color + "16" : hoveredSidebar === s ? sm.color + "0e" : "transparent",
                        color: active ? sm.color : hoveredSidebar === s ? sm.color : fg,
                        cursor: "pointer", fontSize: "0.78rem", fontWeight: active ? 600 : 400,
                        textAlign: "left", transition: "all .15s", minWidth: 0,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: sm.color, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.76rem" }}>{sm.label}</span>
                      <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>{cnt}</span>
                    </button>
                    {/* Botón ⋮ para nativos también */}
                    <button
                      onClick={e => { e.stopPropagation(); setSectionMenu(isMenuOpen ? null : s); setTypeMenu(null); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: muted, fontSize: "0.85rem", padding: "2px 3px",
                        borderRadius: 4, lineHeight: 1, flexShrink: 0,
                        opacity: isMenuOpen ? 1 : 0.4,
                      }}
                      title="Opciones"
                    >⋮</button>
                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: "absolute", top: "100%", right: 0, zIndex: 200,
                          background: "var(--bg)", border: "1.5px solid var(--border)",
                          borderRadius: 8, boxShadow: "0 4px 16px #0002",
                          minWidth: 150, padding: "0.2rem",
                        }}
                      >
                        <button
                          onClick={() => {
                            const updatedNotes = notes.map(n => n.status === s ? { ...n, status: "por-revisar" } : n);
                            persist(updatedNotes);
                            if (sidebarSel === s) setSidebarSel("all");
                            setSectionMenu(null);
                          }}
                          style={{
                            width: "100%", textAlign: "left", background: "none",
                            border: "none", padding: "0.45rem 0.7rem", borderRadius: 6,
                            cursor: "pointer", color: "#c0392b", fontSize: ".82rem", fontWeight: 600,
                          }}
                        >🗑 Borrar estado</button>
                        <p style={{ fontSize: ".7rem", color: muted, margin: "0 .7rem .4rem", lineHeight: 1.3 }}>
                          Las notas vuelven a "Por revisar"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Estados custom */}
              {customSections.map(sec => {
                const cnt    = countByStatus(sec.id);
                const active = sidebarSel === sec.id;
                const isMenuOpen = sectionMenu === sec.id;
                return (
                  <div key={sec.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => setSidebarSel(sec.id)}
                      onMouseEnter={() => setHoveredSidebar(sec.id)}
                      onMouseLeave={() => setHoveredSidebar(null)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: "5px",
                        padding: "5px 6px", borderRadius: "7px",
                        border: "1.5px solid transparent",
                        borderLeft: active ? `3px solid ${sec.color}` : "3px solid transparent",
                        background: active ? sec.color + "16" : hoveredSidebar === sec.id ? sec.color + "0e" : "transparent",
                        color: active ? sec.color : hoveredSidebar === sec.id ? sec.color : fg,
                        cursor: "pointer", fontSize: "0.78rem", fontWeight: active ? 600 : 400,
                        textAlign: "left", transition: "all .15s", minWidth: 0,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: sec.color, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.76rem" }}>{sec.label}</span>
                      <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>{cnt}</span>
                    </button>
                    {/* Botón ⋮ */}
                    <button
                      onClick={e => { e.stopPropagation(); setSectionMenu(isMenuOpen ? null : sec.id); setTypeMenu(null); }}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: muted, fontSize: "0.85rem", padding: "2px 3px",
                        borderRadius: 4, lineHeight: 1, flexShrink: 0,
                        opacity: isMenuOpen ? 1 : 0.4,
                      }}
                      title="Opciones"
                    >⋮</button>
                    {/* Menú desplegable */}
                    {isMenuOpen && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: "absolute", top: "100%", right: 0, zIndex: 200,
                          background: "var(--bg)", border: "1.5px solid var(--border)",
                          borderRadius: 8, boxShadow: "0 4px 16px #0002",
                          minWidth: 150, padding: "0.2rem",
                        }}
                      >
                        <button
                          onClick={() => deleteSection(sec.id)}
                          style={{
                            width: "100%", textAlign: "left", background: "none",
                            border: "none", padding: "0.45rem 0.7rem", borderRadius: 6,
                            cursor: "pointer", color: "#c0392b", fontSize: ".82rem", fontWeight: 600,
                          }}
                        >🗑 Borrar sección</button>
                        <p style={{ fontSize: ".7rem", color: muted, margin: "0 .7rem .4rem", lineHeight: 1.3 }}>
                          Las notas vuelven a "Por revisar"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Botón agregar sección */}
              {!addingSection ? (
                <button
                  onClick={() => setAddingSection(true)}
                  style={{
                    marginTop: "6px", width: "100%", padding: "5px 6px",
                    border: `1.5px dashed ${accent}66`, borderRadius: 7,
                    background: "transparent", color: accent,
                    cursor: "pointer", fontSize: "0.74rem", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                    transition: "all .15s",
                  }}
                >+ Agregar sección</button>
              ) : (
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px", padding: "0 2px" }}>
                  <input
                    autoFocus
                    placeholder="Nombre…"
                    value={addingSectionLabel}
                    onChange={e => setAddingSectionLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setAddingSection(false); }}
                    style={{
                      padding: "4px 7px", borderRadius: 6, border,
                      background: "var(--bg)", color: fg, fontSize: "0.78rem",
                      width: "100%", boxSizing: "border-box" as const,
                    }}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                    {CUSTOM_COLORS.slice(0,6).map(c => (
                      <span
                        key={c}
                        onClick={() => setAddingSectionColor(c)}
                        style={{
                          width: 16, height: 16, borderRadius: "50%", background: c,
                          cursor: "pointer", border: addingSectionColor === c ? "2px solid #fff" : "2px solid transparent",
                          boxShadow: addingSectionColor === c ? `0 0 0 1.5px ${c}` : "none",
                          display: "inline-block", flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "3px" }}>
                    <button onClick={addSection} style={{
                      flex: 1, padding: "3px 0", borderRadius: 5, border: "none",
                      background: accent, color: "#fff", cursor: "pointer",
                      fontSize: "0.72rem", fontWeight: 700,
                    }}>✓</button>
                    <button onClick={() => { setAddingSection(false); setAddingSectionLabel(""); }} style={{
                      flex: 1, padding: "3px 0", borderRadius: 5, border,
                      background: "transparent", color: muted, cursor: "pointer",
                      fontSize: "0.72rem",
                    }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KANBAN VIEW */}
          {!activeId && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Tabs de tipo */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  padding: "8px 10px 7px", borderBottom: border,
                  flexWrap: "wrap", flexShrink: 0,
                }}
                onClick={() => { setSectionMenu(null); setTypeMenu(null); }}
              >
                {/* Tab Todas */}
                <button
                  onClick={() => setFilterType("all")}
                  style={{
                    padding: "4px 10px", borderRadius: 99,
                    border: filterType === "all" ? `1.5px solid ${accent}` : border,
                    background: filterType === "all" ? accent : "transparent",
                    color: filterType === "all" ? "#fff" : fg,
                    fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                    transition: "all .15s", whiteSpace: "nowrap",
                  }}
                >📚 Todas</button>

                {/* Tipos nativos */}
                {Object.entries(NATIVE_TYPES).map(([t, tm]) => {
                  const active = filterType === t;
                  const isMenuOpen = typeMenu === t;
                  return (
                    <div key={t} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <button onClick={() => setFilterType(t)} style={{
                        padding: "4px 10px", borderRadius: 99,
                        border: active ? `1.5px solid ${tm.color}` : border,
                        background: active ? tm.color + "18" : "transparent",
                        color: active ? tm.color : fg,
                        fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                        transition: "all .15s", whiteSpace: "nowrap",
                      }}>
                        {tm.emoji} {tm.label}s
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setTypeMenu(isMenuOpen ? null : t); setSectionMenu(null); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: muted, fontSize: "0.78rem", padding: "2px 3px",
                          borderRadius: 4, lineHeight: 1, flexShrink: 0,
                          opacity: isMenuOpen ? 1 : 0.45,
                        }}
                        title="Opciones"
                      >⋮</button>
                      {isMenuOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            position: "absolute", top: "100%", left: 0, zIndex: 200,
                            background: "var(--bg)", border: "1.5px solid var(--border)",
                            borderRadius: 8, boxShadow: "0 4px 16px #0002",
                            minWidth: 160, padding: "0.2rem",
                          }}
                        >
                          <button
                            onClick={() => {
                              const updatedNotes = notes.map(n => n.type === t ? { ...n, type: "apunte" } : n);
                              persist(updatedNotes);
                              if (filterType === t) setFilterType("all");
                              setTypeMenu(null);
                            }}
                            style={{
                              width: "100%", textAlign: "left", background: "none",
                              border: "none", padding: "0.45rem 0.7rem", borderRadius: 6,
                              cursor: "pointer", color: "#c0392b", fontSize: ".82rem", fontWeight: 600,
                            }}
                          >🗑 Borrar tipo</button>
                          <p style={{ fontSize: ".7rem", color: muted, margin: "0 .7rem .4rem", lineHeight: 1.3 }}>
                            Las notas vuelven a "Apunte"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tipos custom con ⋮ */}
                {customTypes.map(ct => {
                  const active = filterType === ct.id;
                  const isMenuOpen = typeMenu === ct.id;
                  return (
                    <div key={ct.id} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      <button onClick={() => setFilterType(ct.id)} style={{
                        padding: "4px 8px", borderRadius: 99,
                        border: active ? `1.5px solid ${ct.color}` : border,
                        background: active ? ct.color + "18" : "transparent",
                        color: active ? ct.color : fg,
                        fontSize: "0.76rem", fontWeight: 600, cursor: "pointer",
                        transition: "all .15s", whiteSpace: "nowrap",
                      }}>
                        {ct.emoji} {ct.label}s
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setTypeMenu(isMenuOpen ? null : ct.id); setSectionMenu(null); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: muted, fontSize: "0.78rem", padding: "2px 3px",
                          borderRadius: 4, lineHeight: 1, flexShrink: 0,
                          opacity: isMenuOpen ? 1 : 0.45,
                        }}
                        title="Opciones"
                      >⋮</button>
                      {isMenuOpen && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            position: "absolute", top: "100%", left: 0, zIndex: 200,
                            background: "var(--bg)", border: "1.5px solid var(--border)",
                            borderRadius: 8, boxShadow: "0 4px 16px #0002",
                            minWidth: 160, padding: "0.2rem",
                          }}
                        >
                          <button
                            onClick={() => deleteType(ct.id)}
                            style={{
                              width: "100%", textAlign: "left", background: "none",
                              border: "none", padding: "0.45rem 0.7rem", borderRadius: 6,
                              cursor: "pointer", color: "#c0392b", fontSize: ".82rem", fontWeight: 600,
                            }}
                          >🗑 Borrar tipo</button>
                          <p style={{ fontSize: ".7rem", color: muted, margin: "0 .7rem .4rem", lineHeight: 1.3 }}>
                            Las notas vuelven a "Apunte"
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Agregar tipo */}
                {!addingType ? (
                  <button
                    onClick={() => setAddingType(true)}
                    style={{
                      padding: "4px 9px", borderRadius: 99,
                      border: `1.5px dashed ${accent}66`,
                      background: "transparent", color: accent,
                      cursor: "pointer", fontSize: "0.74rem", fontWeight: 600,
                      whiteSpace: "nowrap", transition: "all .15s",
                    }}
                  >+ Tipo</button>
                ) : (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      background: "var(--bg)", border, borderRadius: 99,
                      padding: "3px 8px",
                    }}
                  >
                    <select
                      value={addingTypeEmoji}
                      onChange={e => setAddingTypeEmoji(e.target.value)}
                      style={{ border: "none", background: "transparent", fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      {CUSTOM_EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input
                      autoFocus
                      placeholder="Nombre…"
                      value={addingTypeLabel}
                      onChange={e => setAddingTypeLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addType(); if (e.key === "Escape") setAddingType(false); }}
                      style={{
                        width: 80, border: "none", background: "transparent",
                        color: fg, fontSize: "0.76rem", outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: "2px" }}>
                      {CUSTOM_COLORS.slice(0,5).map(c => (
                        <span
                          key={c}
                          onClick={() => setAddingTypeColor(c)}
                          style={{
                            width: 12, height: 12, borderRadius: "50%", background: c,
                            cursor: "pointer", display: "inline-block", flexShrink: 0,
                            border: addingTypeColor === c ? "2px solid #fff" : "2px solid transparent",
                            boxShadow: addingTypeColor === c ? `0 0 0 1.5px ${c}` : "none",
                          }}
                        />
                      ))}
                    </div>
                    <button onClick={addType} style={{
                      border: "none", background: accent, color: "#fff",
                      borderRadius: 4, cursor: "pointer", fontSize: "0.72rem",
                      padding: "2px 5px", fontWeight: 700,
                    }}>✓</button>
                    <button onClick={() => { setAddingType(false); setAddingTypeLabel(""); }} style={{
                      border: "none", background: "transparent", color: muted,
                      cursor: "pointer", fontSize: "0.72rem", padding: "2px 3px",
                    }}>✕</button>
                  </div>
                )}
              </div>

              {/* Grid de cards */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "12px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
                gap: "10px", alignContent: "start",
              }}>
                {filtered.length === 0 && (
                  <div style={{
                    gridColumn: "1 / -1", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: "40px 20px", gap: "8px", color: muted,
                    fontSize: "0.85rem", textAlign: "center",
                  }}>
                    <span style={{ fontSize: "2rem" }}>📭</span>
                    <p style={{ margin: 0 }}>Sin notas aquí todavía. ¡Crea una nueva!</p>
                  </div>
                )}
                {filtered.map(note => {
                  const tm = getTypeMeta(note.type);
                  const sm = getStatusMeta(note.status);
                  const checks = note.checklist ?? [];
                  const refs   = note.refs ?? [];
                  return (
                    <div
                      key={note.id}
                      onClick={() => openCard(note)}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                        (e.currentTarget as HTMLDivElement).style.transform  = "translateY(-1px)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                        (e.currentTarget as HTMLDivElement).style.transform  = "none";
                      }}
                      style={{
                        background: bg2, border,
                        borderTop: `3px solid ${tm.color}`,
                        borderRadius: "8px", padding: "10px 12px",
                        cursor: "pointer", transition: "box-shadow .15s, transform .1s",
                        display: "flex", flexDirection: "column", gap: "6px", minHeight: 80,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 600,
                          padding: "2px 7px", borderRadius: 99,
                          background: tm.color + "22", color: tm.color,
                        }}>{tm.emoji} {tm.label}</span>
                        <span style={{
                          width: 9, height: 9, borderRadius: "50%",
                          background: sm.color, display: "inline-block",
                        }} title={sm.label} />
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: fg, lineHeight: 1.3 }}>
                        {note.title || <em style={{ opacity: 0.45, fontStyle: "italic" }}>Sin título</em>}
                      </div>
                      {note.content && (
                        <div style={{ fontSize: "0.75rem", color: muted, lineHeight: 1.4 }}>
                          {htmlToText(note.content, 90)}
                        </div>
                      )}
                      {checks.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {checks.slice(0, 3).map(c => (
                            <span key={c.id} style={{
                              fontSize: "0.72rem",
                              color: c.done ? muted : fg,
                              textDecoration: c.done ? "line-through" : "none",
                            }}>
                              {c.done ? "☑" : "☐"} {c.text.slice(0, 28)}{c.text.length > 28 ? "…" : ""}
                            </span>
                          ))}
                          {checks.length > 3 && (
                            <span style={{ fontSize: "0.7rem", color: muted }}>+{checks.length - 3} más</span>
                          )}
                        </div>
                      )}
                      {refs.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                          {refs.map(r => (
                            <span key={r.id} style={{
                              fontSize: "0.68rem", padding: "1px 5px", borderRadius: 4,
                              background: "var(--bg, #fff)", border, color: muted,
                            }}>
                              📎 {r.label.slice(0, 22)}{r.label.length > 22 ? "…" : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EDITOR VIEW */}
          {activeId && draft && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Meta selects */}
              <div style={{
                display: "flex", gap: "12px", padding: "10px 16px",
                borderBottom: border, flexShrink: 0, flexWrap: "wrap",
                background: bg2,
              }}>
                {[
                  {
                    lbl: "Tipo", val: draft.type,
                    onChange: (v: string) => setDraft(p => p ? ({ ...p, type: v }) : p),
                    opts: [
                      ...Object.entries(NATIVE_TYPES).map(([k,v]) => ({ v: k, l: v.emoji + " " + v.label })),
                      ...customTypes.map(t => ({ v: t.id, l: t.emoji + " " + t.label })),
                    ],
                  },
                  {
                    lbl: "Estado", val: draft.status,
                    onChange: (v: string) => setDraft(p => p ? ({ ...p, status: v }) : p),
                    opts: [
                      ...Object.entries(NATIVE_STATUSES).map(([k,v]) => ({ v: k, l: v.label })),
                      ...customSections.map(s => ({ v: s.id, l: s.label })),
                    ],
                  },
                ].map(({ lbl, val, onChange, opts }) => (
                  <div key={lbl} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label style={{
                      fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: muted,
                    }}>{lbl}</label>
                    <select
                      value={val}
                      onChange={e => onChange(e.target.value)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, border,
                        background: "var(--bg, #fff)", color: fg,
                        fontSize: "0.82rem", fontWeight: 500,
                      }}
                    >
                      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div style={{
                display: "flex", alignItems: "center", gap: "2px",
                padding: "6px 12px", borderBottom: border, flexShrink: 0,
                flexWrap: "wrap", background: bg2,
              }}>
                {[
                  { groups: [
                    { cmd: "bold",          label: <b>B</b> },
                    { cmd: "italic",        label: <i>I</i> },
                    { cmd: "underline",     label: <u>U</u> },
                    { cmd: "strikeThrough", label: <s>S</s> },
                  ]},
                  { groups: [
                    { cmd: "formatBlock", val: "H1", label: "H1" },
                    { cmd: "formatBlock", val: "H2", label: "H2" },
                    { cmd: "formatBlock", val: "H3", label: "H3" },
                    { cmd: "formatBlock", val: "P",  label: "¶"  },
                  ]},
                  { groups: [
                    { cmd: "insertUnorderedList", label: "•—" },
                    { cmd: "insertOrderedList",   label: "1." },
                    { cmd: "formatBlock", val: "BLOCKQUOTE", label: "❝" },
                  ]},
                ].map((section, si) => (
                  <span key={si} style={{ display: "contents" }}>
                    {si > 0 && <span style={{ width: 1, height: 20, background: "var(--border, #e2e8f0)", margin: "0 4px", alignSelf: "center", display: "inline-block" }} />}
                    <span style={{ display: "inline-flex", gap: "1px" }}>
                      {section.groups.map((btn, bi) => (
                        <button
                          key={bi}
                          onMouseDown={e => { e.preventDefault(); execCmd(btn.cmd, (btn as any).val); }}
                          style={{
                            padding: "3px 7px", borderRadius: 5, border,
                            background: "transparent", color: fg, cursor: "pointer",
                            fontSize: "0.78rem", fontWeight: 600, minWidth: 28, textAlign: "center",
                          }}
                        >{btn.label}</button>
                      ))}
                    </span>
                  </span>
                ))}
                <span style={{ width: 1, height: 20, background: "var(--border, #e2e8f0)", margin: "0 4px", alignSelf: "center", display: "inline-block" }} />
                <span style={{ display: "inline-flex", gap: "1px" }}>
                  {[
                    { label: "🔗", active: showLink, action: () => setShowLink(v => !v) },
                    { label: "☐+", active: false,    action: addCheck },
                  ].map((btn, bi) => (
                    <button
                      key={bi}
                      onMouseDown={e => { e.preventDefault(); btn.action(); }}
                      style={{
                        padding: "3px 7px", borderRadius: 5,
                        border: btn.active ? `1.5px solid ${accent}` : border,
                        background: btn.active ? accent + "18" : "transparent",
                        color: btn.active ? accent : fg,
                        cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                        minWidth: 28, textAlign: "center",
                      }}
                    >{btn.label}</button>
                  ))}
                </span>
              </div>

              {/* Link bar */}
              {showLink && (
                <div style={{
                  display: "flex", gap: "6px", padding: "6px 12px",
                  background: bg2, borderBottom: border, flexShrink: 0,
                }}>
                  <input
                    placeholder="https://…" value={linkHref}
                    onChange={e => setLinkHref(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") insertLink(); }}
                    autoFocus
                    style={{
                      flex: 1, padding: "4px 8px", borderRadius: 6, border,
                      background: "var(--bg, #fff)", color: fg, fontSize: "0.82rem",
                    }}
                  />
                  <button onClick={insertLink} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: accent, color: "#fff", cursor: "pointer",
                    fontSize: "0.78rem", fontWeight: 600,
                  }}>Insertar</button>
                  <button onClick={() => { setShowLink(false); setLinkHref(""); }} style={{
                    padding: "4px 8px", borderRadius: 6, border, background: "transparent",
                    cursor: "pointer", fontSize: "0.78rem", color: muted,
                  }}>✕</button>
                </div>
              )}

              {/* Ref picker */}
              {showRefs && (
                <div style={{
                  padding: "8px 12px", borderBottom: border, background: bg2, flexShrink: 0,
                }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 600, color: muted, margin: "0 0 6px" }}>
                    📎 Referenciar materiales del curso:
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: 100, overflowY: "auto" }}>
                    {materials.length === 0
                      ? <p style={{ color: muted, fontSize: "0.78rem", margin: 0 }}>No hay materiales disponibles.</p>
                      : materials.map(mat => {
                          const sel = draft.refs.some(r => r.id === mat.id);
                          return (
                            <button key={mat.id} onClick={() => toggleRef(mat)} style={{
                              display: "flex", alignItems: "center", gap: "4px",
                              padding: "3px 8px", borderRadius: 6,
                              border: sel ? `1.5px solid ${accent}` : border,
                              background: sel ? accent + "14" : "transparent",
                              cursor: "pointer", fontSize: "0.75rem", color: fg,
                            }}>
                              <span>{sel ? "☑" : "☐"}</span><span>{mat.title}</span>
                            </button>
                          );
                        })
                    }
                  </div>
                </div>
              )}

              {/* Active refs */}
              {draft.refs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "6px 12px", borderBottom: border, flexShrink: 0 }}>
                  {draft.refs.map(r => (
                    <span key={r.id} style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "2px 8px", borderRadius: 99,
                      background: "var(--bg3, #f1f5f9)", fontSize: "0.72rem",
                      color: fg, border,
                    }}>
                      📎 {r.label.slice(0, 30)}{r.label.length > 30 ? "…" : ""}
                      <button onClick={() => removeRef(r.id)} style={{
                        border: "none", background: "transparent", cursor: "pointer",
                        color: muted, fontSize: "0.7rem", padding: 0, lineHeight: 1,
                      }}>✕</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Content editor */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Escribe tus apuntes aquí…"
                style={{
                  flex: 1, overflowY: "auto", padding: "12px 16px",
                  color: fg, fontSize: "0.88rem", lineHeight: 1.65, outline: "none",
                }}
              />

              {/* Checklist */}
              {draft.checklist.length > 0 && (
                <div style={{
                  padding: "8px 16px", borderTop: border, flexShrink: 0, background: bg2,
                }}>
                  <p style={{
                    fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em", color: muted, margin: "0 0 6px",
                  }}>✅ Lista de verificación</p>
                  {draft.checklist.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)}
                        style={{ accentColor: accent, cursor: "pointer" }} />
                      <input
                        value={c.text}
                        onChange={e => updateCheckText(c.id, e.target.value)}
                        placeholder="Ítem…"
                        style={{
                          flex: 1, border: "none", background: "transparent",
                          color: c.done ? muted : fg,
                          textDecoration: c.done ? "line-through" : "none",
                          fontSize: "0.82rem", outline: "none",
                        }}
                      />
                      <button onClick={() => removeCheck(c.id)} style={{
                        border: "none", background: "transparent", cursor: "pointer",
                        color: muted, fontSize: "0.75rem", padding: "0 2px",
                      }}>✕</button>
                    </div>
                  ))}
                  <button onClick={addCheck} style={{
                    border: "none", background: "transparent", color: accent,
                    cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, padding: "2px 0",
                  }}>+ Agregar ítem</button>
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderTop: border, flexShrink: 0, background: bg2,
              }}>
                <div>
                  {!isNew && (
                    <button onClick={deleteDraft} style={{
                      padding: "5px 12px", borderRadius: 8,
                      border: "1.5px solid #fca5a5", background: "#fff1f2",
                      color: "#b91c1c", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                    }}>🗑 Eliminar</button>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={closeEditor} style={{
                    padding: "5px 14px", borderRadius: 8, border,
                    background: "var(--bg, #fff)", color: fg,
                    cursor: "pointer", fontSize: "0.82rem", fontWeight: 600,
                  }}>Cancelar</button>
                  <button onClick={saveDraft} style={{
                    padding: "5px 14px", borderRadius: 8, border: "none",
                    background: accent, color: "#fff",
                    cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
                  }}>💾 Guardar</button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
