"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useClassroomSections, Section, Categoria, Recurso } from "@/app/admin/hooks/useClassroomSections";
import ConfirmDialog from "./components/ConfirmDialog";

const DEFAULT_EMOJIS: Record<string, string> = {
  "I.": "⚡", "II.": "📋", "III.": "📑", "IV.": "🌟", "V.": "📝",
  "VI.": "📐", "VII.": "⚛️", "VIII.": "🧪", "IX.": "🔬", "X.": "🌍",
  "XI.": "🖼️", "XII.": "📚", "XIII.": "📊", "XIV.": "🎬", "XV.": "🎯"
};

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  drive: { icon: "📄", label: "Drive", color: "#4285f4" },
  youtube: { icon: "▶", label: "Video", color: "#ff4444" },
  link: { icon: "🔗", label: "Enlace", color: "#10b981" },
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { sections, loading, saveAll } = useClassroomSections();

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [editingSec, setEditingSec] = useState<Section | null>(null);
  const [confirmDelSec, setConfirmDelSec] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<{ secId: string; cat?: Categoria } | null>(null);
  const [confirmDelCat, setConfirmDelCat] = useState<{ secId: string; catId: string } | null>(null);
  const [editingRes, setEditingRes] = useState<{ secId: string; catId: string; res?: Recurso; index?: number } | null>(null);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: "0.75rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease infinite" }} />
      <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em", fontFamily: "var(--font-ui)" }}>CARGANDO BASE DE DATOS</span>
    </div>
  );

  const getSectionEmoji = (sec: Section) => {
    if (sec.emoji) return sec.emoji;
    const num = sec.name.split(" ")[0];
    return DEFAULT_EMOJIS[num] || "📁";
  };

  /* ─── CRUD ─────────────────────────────────────────────── */
  const saveSection = async (id: string, name: string, emoji: string) => {
    const next = id
      ? sections.map(s => s.id === id ? { ...s, name, emoji } : s)
      : [...sections, { id: String(Date.now()), name, emoji, materials: [] }];
    await saveAll(next);
    setEditingSec(null);
  };

  const moveSection = async (id: string, dir: number) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx + dir < 0 || idx + dir >= sections.length) return;
    const next = [...sections];
    [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
    await saveAll(next);
  };

  const moveCategory = async (secId: string, catId: string, dir: number) => {
    const next = [...sections];
    const sec = next.find(s => s.id === secId);
    if (!sec) return;
    const idx = sec.materials.findIndex(c => c.id === catId);
    if (idx + dir < 0 || idx + dir >= sec.materials.length) return;
    [sec.materials[idx], sec.materials[idx + dir]] = [sec.materials[idx + dir], sec.materials[idx]];
    await saveAll(next);
  };

  const saveCategory = async (oldSecId: string, targetSecId: string, title: string, description: string) => {
    let next = [...sections];
    if (editingCat?.cat) {
      const oldSec = next.find(s => s.id === oldSecId);
      if (oldSec) {
        const catObj = oldSec.materials.find(c => c.id === editingCat.cat!.id);
        if (catObj) {
          oldSec.materials = oldSec.materials.filter(c => c.id !== editingCat.cat!.id);
          const target = next.find(s => s.id === targetSecId);
          if (target) target.materials.push({ ...catObj, title, description, topicId: targetSecId });
        }
      }
    } else {
      const target = next.find(s => s.id === targetSecId);
      if (target) {
        target.materials.push({
          id: String(Date.now()), title, description, materials: [],
          topic: target.name, topicId: target.id,
          state: "PUBLISHED", creationTime: new Date().toISOString(), alternateLink: ""
        });
      }
    }
    await saveAll(next);
    setEditingCat(null);
  };

  const moveResource = async (secId: string, catId: string, resIdx: number, dir: number) => {
    const next = [...sections];
    const cat = next.find(s => s.id === secId)?.materials.find(c => c.id === catId);
    if (!cat) return;
    if (resIdx + dir < 0 || resIdx + dir >= cat.materials.length) return;
    [cat.materials[resIdx], cat.materials[resIdx + dir]] = [cat.materials[resIdx + dir], cat.materials[resIdx]];
    await saveAll(next);
  };

  const saveResource = async (secId: string, catId: string, type: string, title: string, url: string) => {
    const next = [...sections];
    const cat = next.find(s => s.id === secId)?.materials.find(c => c.id === catId);
    if (!cat) return;
    const newRes: Recurso = { type, title, url };
    if (editingRes?.index !== undefined) cat.materials[editingRes.index] = newRes;
    else cat.materials.push(newRes);
    await saveAll(next);
    setEditingRes(null);
  };

  /* ─── RENDER ────────────────────────────────────────────── */
  return (
    <div className="adm-root">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        :root {
          --font-display: 'Syne', sans-serif;
          --font-ui: 'DM Sans', sans-serif;
        }

        /* ── layout ── */
        .adm-root { max-width: 960px; margin: 0 auto; padding: 0 1rem 6rem; font-family: var(--font-ui); }

        /* ── topbar ── */
        .adm-topbar {
          display: flex; align-items: flex-end; justify-content: space-between;
          padding: 2.5rem 0 2rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 2rem;
        }
        .adm-title { margin: 0; }
        .adm-title-sub {
          display: block; font-family: var(--font-ui); font-size: 0.7rem; font-weight: 500;
          letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; margin-bottom: 0.3rem;
        }
        .adm-title-main {
          display: block; font-family: Fraunces, serif; font-size: 2rem; font-weight: 700;
          color: var(--fg); line-height: 1;
        }
        .adm-stats {
          display: flex; gap: 1.5rem; align-items: center;
        }
        .adm-stat-pill {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 999px; padding: 0.35rem 0.85rem;
          font-size: 0.75rem; font-weight: 500; color: var(--muted);
          display: flex; align-items: center; gap: 0.35rem;
        }
        .adm-stat-pill strong { color: var(--fg); font-weight: 600; }

        /* ── section card ── */
        .sec-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          overflow: hidden;
        }
        .sec-card:hover { border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
        .sec-card.is-open {
          border-color: color-mix(in srgb, var(--accent) 30%, transparent);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 6%, transparent);
        }

        /* ── section header ── */
        .sec-hdr {
          display: grid;
          grid-template-columns: 28px 44px 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1.25rem;
          cursor: pointer;
          user-select: none;
        }
        .sec-reorder { display: flex; flex-direction: column; gap: 1px; }
        .sec-emoji-wrap {
          width: 40px; height: 40px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          display: grid; place-items: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .sec-name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1rem;
          color: var(--fg);
        }
        .sec-meta { font-size: 0.72rem; color: var(--muted); margin-top: 1px; }
        .sec-actions { display: flex; align-items: center; gap: 0.4rem; }
        .sec-chevron {
          width: 22px; height: 22px; border-radius: 6px;
          display: grid; place-items: center;
          font-size: 0.7rem; color: var(--muted);
          transition: transform 0.25s, background 0.2s;
          background: var(--bg);
          border: 1px solid var(--border);
        }
        .sec-card.is-open .sec-chevron { transform: rotate(180deg); background: color-mix(in srgb, var(--accent) 12%, transparent); }

        /* ── section body ── */
        .sec-body {
          border-top: 1px solid var(--border);
          padding: 1.25rem;
          background: color-mix(in srgb, var(--bg) 60%, transparent);
        }
        .sec-body-toprow {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.25rem;
        }
        .sec-body-label {
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.14em;
          color: var(--muted); text-transform: uppercase;
        }

        /* ── category card ── */
        .cat-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1rem 1.1rem;
          margin-bottom: 0.75rem;
          display: grid;
          grid-template-columns: 20px 1fr auto;
          gap: 0.75rem;
          align-items: start;
          transition: border-color 0.15s;
        }
        .cat-card:hover { border-color: color-mix(in srgb, var(--accent) 25%, transparent); }
        .cat-reorder { display: flex; flex-direction: column; gap: 1px; padding-top: 2px; }
        .cat-title { font-weight: 600; font-size: 0.9rem; color: var(--fg); margin: 0 0 3px; }
        .cat-desc { font-size: 0.78rem; color: var(--muted); margin-bottom: 0.75rem; line-height: 1.4; }
        .cat-resources { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
        .cat-actions { display: flex; gap: 4px; }

        /* ── resource tag ── */
        .res-chip {
          display: inline-flex; align-items: center; gap: 0.3rem;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; padding: 0.2rem 0.5rem;
          font-size: 0.7rem; color: var(--fg);
          transition: border-color 0.15s;
          max-width: 200px;
        }
        .res-chip:hover { border-color: var(--accent); }
        .res-chip-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .res-chip-name {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          flex: 1; max-width: 130px;
        }
        .res-chip-actions { display: flex; gap: 2px; }
        .res-order-btns { display: flex; gap: 0.1rem; margin-right: 0.2rem; padding-right: 0.2rem; border-right: 1px solid var(--border); }

        /* ── buttons ── */
        .btn-icon {
          background: none; border: none; cursor: pointer;
          padding: 0.2rem; font-size: 0.75rem; color: var(--muted);
          opacity: 0.7; transition: opacity 0.15s, transform 0.15s; border-radius: 4px;
          line-height: 1;
        }
        .btn-icon:hover:not(:disabled) { opacity: 1; transform: scale(1.15); }
        .btn-icon:disabled { opacity: 0.25; cursor: default; }
        .btn-icon.danger:hover { color: #f87171; opacity: 1; }

        .btn-xs {
          font-family: var(--font-ui); font-size: 0.7rem; font-weight: 500;
          padding: 0.25rem 0.65rem; border-radius: 8px; cursor: pointer;
          border: 1px solid var(--border); background: var(--bg); color: var(--muted);
          transition: all 0.15s;
        }
        .btn-xs:hover { border-color: var(--accent); color: var(--accent); }

        .btn-sm-primary {
          font-family: var(--font-ui); font-size: 0.78rem; font-weight: 600;
          padding: 0.45rem 1rem; border-radius: 10px; cursor: pointer;
          border: none; background: var(--accent); color: #fff;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: 0.02em;
        }
        .btn-sm-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-sm-primary:active { transform: translateY(0); }

        .btn-sm-secondary {
          font-family: var(--font-ui); font-size: 0.78rem; font-weight: 500;
          padding: 0.45rem 1rem; border-radius: 10px; cursor: pointer;
          border: 1px solid var(--border); background: var(--bg2); color: var(--fg);
          transition: all 0.15s;
        }
        .btn-sm-secondary:hover { border-color: var(--accent); }

        .btn-icon-edit, .btn-icon-del {
          width: 30px; height: 30px; border-radius: 8px;
          display: grid; place-items: center;
          font-size: 0.8rem; cursor: pointer;
          border: 1px solid var(--border); transition: all 0.15s;
          background: var(--bg);
        }
        .btn-icon-edit:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
        .btn-icon-del:hover  { border-color: #f87171;       background: color-mix(in srgb, #f87171 10%, transparent); }

        /* ── modal ── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: color-mix(in srgb, var(--bg) 70%, transparent);
          backdrop-filter: blur(8px);
          display: grid; place-items: center; padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .modal-panel {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2rem;
          width: 100%; max-width: 480px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          animation: slideUp 0.2s cubic-bezier(.16,1,.3,1);
        }
        .modal-title {
          font-family: var(--font-display); font-size: 1.3rem; font-weight: 700;
          color: var(--fg); margin: 0 0 1.5rem;
          padding-bottom: 1rem; border-bottom: 1px solid var(--border);
        }
        .field { margin-bottom: 1rem; }
        .field label {
          display: block; font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
          margin-bottom: 0.4rem;
        }
        .field input, .field select, .field textarea {
          width: 100%; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 10px; padding: 0.6rem 0.85rem;
          font-family: var(--font-ui); font-size: 0.875rem; color: var(--fg);
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
        }
        .field textarea { resize: vertical; min-height: 80px; }
        .field-row { display: grid; grid-template-columns: 80px 1fr; gap: 0.75rem; }
        .field-emoji input { font-size: 1.4rem; text-align: center; padding: 0.5rem; }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 0.6rem;
          margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);
        }

        /* ── type badge ── */
        .type-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
          padding: 0.15rem 0.5rem; border-radius: 6px;
        }

        /* ── empty state ── */
        .cat-empty {
          text-align: center; padding: 2rem 1rem;
          color: var(--muted); font-size: 0.8rem;
          border: 1px dashed var(--border); border-radius: 10px;
        }

        /* ── animations ── */
        @keyframes fadeIn  { from { opacity: 0; }                    to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse   { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {/* ─── TOPBAR ─────────────────────────────────────── */}
      <div className="adm-topbar">
        <h1 className="adm-title">
          <span className="adm-title-sub">Panel de administración</span>
          <span className="adm-title-main">Gestión de Materiales</span>
        </h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
          <div className="adm-stats">
            <span className="adm-stat-pill">
              <strong>{sections.length}</strong> secciones
            </span>
            <span className="adm-stat-pill">
              <strong>{sections.reduce((a, s) => a + s.materials.length, 0)}</strong> temas
            </span>
          </div>
          <button
            className="btn-sm-primary"
            onClick={() => setEditingSec({ id: "", name: "", materials: [] })}
          >
            + Nueva Sección
          </button>
        </div>
      </div>

      {/* ─── SECTION LIST ────────────────────────────────── */}
      <div>
        {sections.map((sec, sIdx) => {
          const isOpen = expandedSection === sec.id;
          const totalRes = sec.materials.reduce((a, c) => a + c.materials.length, 0);
          return (
            <div key={sec.id} className={`sec-card${isOpen ? " is-open" : ""}`}>

              {/* Header */}
              <div className="sec-hdr" onClick={() => setExpandedSection(isOpen ? null : sec.id)}>

                {/* Reorder */}
                <div className="sec-reorder" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" onClick={() => moveSection(sec.id, -1)} disabled={sIdx === 0} title="Subir">▲</button>
                  <button className="btn-icon" onClick={() => moveSection(sec.id, 1)} disabled={sIdx === sections.length - 1} title="Bajar">▼</button>
                </div>

                {/* Emoji */}
                <div className="sec-emoji-wrap">{getSectionEmoji(sec)}</div>

                {/* Info */}
                <div>
                  <div className="sec-name">{sec.name}</div>
                  <div className="sec-meta">
                    {sec.materials.length} tema{sec.materials.length !== 1 ? "s" : ""}
                    {totalRes > 0 && <> · {totalRes} recurso{totalRes !== 1 ? "s" : ""}</>}
                  </div>
                </div>

                {/* Actions */}
                <div className="sec-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon-edit" onClick={() => setEditingSec(sec)} title="Editar">✏️</button>
                  <button className="btn-icon-del" onClick={() => setConfirmDelSec(sec.id)} title="Eliminar">🗑️</button>
                  <div className="sec-chevron">▾</div>
                </div>
              </div>

              {/* Body */}
              {isOpen && (
                <div className="sec-body">
                  <div className="sec-body-toprow">
                    <span className="sec-body-label">Temas de la sección</span>
                    <button className="btn-sm-primary" style={{ fontSize: "0.72rem", padding: "0.35rem 0.8rem" }}
                      onClick={() => setEditingCat({ secId: sec.id })}>
                      + Añadir Tema
                    </button>
                  </div>

                  {sec.materials.length === 0 && (
                    <div className="cat-empty">
                      Sin temas aún — <button onClick={() => setEditingCat({ secId: sec.id })} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: "0.8rem" }}>añade el primero</button>
                    </div>
                  )}

                  {sec.materials.map((cat, cIdx) => (
                    <div key={cat.id} className="cat-card">

                      {/* Reorder */}
                      <div className="cat-reorder">
                        <button className="btn-icon" style={{ fontSize: "0.65rem" }} onClick={() => moveCategory(sec.id, cat.id, -1)} disabled={cIdx === 0}>▲</button>
                        <button className="btn-icon" style={{ fontSize: "0.65rem" }} onClick={() => moveCategory(sec.id, cat.id, 1)} disabled={cIdx === sec.materials.length - 1}>▼</button>
                      </div>

                      {/* Content */}
                      <div>
                        <p className="cat-title">{cat.title}</p>
                        {cat.description && <p className="cat-desc">{cat.description}</p>}
                        <div className="cat-resources">
                          {cat.materials.map((res, rIdx) => {
                            const meta = TYPE_META[res.type] || TYPE_META.link;
                            return (
                              <div key={rIdx} className="res-chip">
                                <span className="res-chip-dot" style={{ background: meta.color }} />
                                <span className="res-chip-name">{res.title}</span>
                                <div className="res-chip-actions">
                                  <div className="res-order-btns">
                                    <button className="btn-icon" style={{ fontSize: "0.55rem" }} onClick={() => moveResource(sec.id, cat.id, rIdx, -1)} disabled={rIdx === 0}>▲</button>
                                    <button className="btn-icon" style={{ fontSize: "0.55rem" }} onClick={() => moveResource(sec.id, cat.id, rIdx, 1)} disabled={rIdx === cat.materials.length - 1}>▼</button>
                                  </div>
                                  <button className="btn-icon" style={{ fontSize: "0.65rem" }}
                                    onClick={() => setEditingRes({ secId: sec.id, catId: cat.id, res, index: rIdx })}>✏️</button>
                                  <button className="btn-icon danger" style={{ fontSize: "0.65rem" }}
                                    onClick={() => {
                                      const next = [...sections];
                                      next.find(s => s.id === sec.id)?.materials.find(c => c.id === cat.id)?.materials.splice(rIdx, 1);
                                      saveAll(next);
                                    }}>✕</button>
                                </div>
                              </div>
                            );
                          })}
                          <button className="btn-xs" onClick={() => setEditingRes({ secId: sec.id, catId: cat.id })}>
                            + Recurso
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="cat-actions">
                        <button className="btn-icon-edit" onClick={() => setEditingCat({ secId: sec.id, cat })}>✏️</button>
                        <button className="btn-icon-del" onClick={() => setConfirmDelCat({ secId: sec.id, catId: cat.id })}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── MODAL: SECCIÓN ──────────────────────────────── */}
      {editingSec && (
        <div className="modal-overlay" onClick={() => setEditingSec(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingSec.id ? "Editar Sección" : "Nueva Sección"}</h2>
            <div className="field-row">
              <div className="field field-emoji">
                <label>Emoji</label>
                <input id="sec-emoji" defaultValue={getSectionEmoji(editingSec)} />
              </div>
              <div className="field">
                <label>Título de la Sección</label>
                <input id="sec-name" defaultValue={editingSec.name} placeholder="Ej: XVI. Nuevo Tema" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-sm-secondary" onClick={() => setEditingSec(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={() => {
                const name = (document.getElementById("sec-name") as HTMLInputElement).value;
                const emoji = (document.getElementById("sec-emoji") as HTMLInputElement).value;
                saveSection(editingSec.id, name, emoji);
              }}>Guardar Sección</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CATEGORÍA ────────────────────────────── */}
      {editingCat && (
        <div className="modal-overlay" onClick={() => setEditingCat(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingCat.cat ? "Editar Tema" : "Nuevo Tema"}</h2>
            <div className="field">
              <label>Sección destino</label>
              <select id="cat-sec-target" defaultValue={editingCat.secId}>
                {sections.map(s => <option key={s.id} value={s.id}>{getSectionEmoji(s)} {s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Título del Tema</label>
              <input id="cat-title" defaultValue={editingCat.cat?.title || ""} placeholder="Nombre del tema" />
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea id="cat-desc" defaultValue={editingCat.cat?.description || ""} placeholder="Descripción breve del tema…" />
            </div>
            <div className="modal-footer">
              <button className="btn-sm-secondary" onClick={() => setEditingCat(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={() => {
                const title = (document.getElementById("cat-title") as HTMLInputElement).value;
                const desc = (document.getElementById("cat-desc") as HTMLTextAreaElement).value;
                const target = (document.getElementById("cat-sec-target") as HTMLSelectElement).value;
                saveCategory(editingCat.secId, target, title, desc);
              }}>Guardar Tema</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RECURSO ──────────────────────────────── */}
      {editingRes && (
        <div className="modal-overlay" onClick={() => setEditingRes(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingRes.res ? "Editar Recurso" : "Nuevo Recurso"}</h2>
            <div className="field">
              <label>Tipo de recurso</label>
              <select id="res-type" defaultValue={editingRes.res?.type || "drive"}>
                <option value="drive">📄 Archivo (Drive / PDF)</option>
                <option value="youtube">▶ Video (YouTube)</option>
                <option value="link">🔗 Enlace web</option>
              </select>
            </div>
            <div className="field">
              <label>Título</label>
              <input id="res-title" defaultValue={editingRes.res?.title || ""} placeholder="Nombre del recurso" />
            </div>
            <div className="field">
              <label>URL</label>
              <input id="res-url" defaultValue={editingRes.res?.url || ""} placeholder="https://…" />
            </div>
            <div className="modal-footer">
              <button className="btn-sm-secondary" onClick={() => setEditingRes(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={() => {
                const type = (document.getElementById("res-type") as HTMLSelectElement).value;
                const title = (document.getElementById("res-title") as HTMLInputElement).value;
                const url = (document.getElementById("res-url") as HTMLInputElement).value;
                saveResource(editingRes.secId, editingRes.catId, type, title, url);
              }}>Guardar Recurso</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM DIALOGS ─────────────────────────────── */}
      {confirmDelSec && (
        <ConfirmDialog
          message="¿Eliminar esta sección y todo su contenido? Esta acción no se puede deshacer."
          onCancel={() => setConfirmDelSec(null)}
          onConfirm={async () => { await saveAll(sections.filter(s => s.id !== confirmDelSec)); setConfirmDelSec(null); }}
        />
      )}
      {confirmDelCat && (
        <ConfirmDialog
          message="¿Eliminar este tema y todos sus recursos?"
          onCancel={() => setConfirmDelCat(null)}
          onConfirm={() => {
            const next = [...sections];
            const sec = next.find(s => s.id === confirmDelCat.secId);
            if (sec) sec.materials = sec.materials.filter(c => c.id !== confirmDelCat.catId);
            saveAll(next);
            setConfirmDelCat(null);
          }}
        />
      )}
    </div>
  );
}