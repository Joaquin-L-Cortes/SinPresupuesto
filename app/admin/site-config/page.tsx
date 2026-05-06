"use client";

import { useState } from "react";
import { useSiteConfig } from "../hooks/useSiteConfig";
import ConfirmDialog from "../components/ConfirmDialog";

type Tab = "hero" | "seo" | "footer" | "redes" | "donaciones";

const TABS: { id: Tab; emoji: string; label: string; desc: string }[] = [
  { id: "hero", emoji: "✨", label: "Hero", desc: "Portada y textos principales" },
  { id: "seo", emoji: "🔍", label: "SEO", desc: "Metadatos y visibilidad" },
  { id: "footer", emoji: "📝", label: "Pie de Página", desc: "Textos y enlaces del footer" },
  { id: "redes", emoji: "📱", label: "Redes Sociales", desc: "Perfiles y canales" },
  { id: "donaciones", emoji: "❤️", label: "Donaciones", desc: "Texto del bloque de apoyo" },
];

export default function ConfigPage() {
  const { footer, donaciones, seo, redes, hero, loading, saveFile, deleteRed } = useSiteConfig();
  const [activeTab, setActiveTab] = useState<Tab>("seo");
  const [editingRed, setEditingRed] = useState<any>(null);
  const [deletingRed, setDeletingRed] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const flash = (key: string) => { setSaved(key); setTimeout(() => setSaved(null), 2200); };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: "0.75rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease infinite" }} />
      <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif" }}>CARGANDO CONFIGURACIÓN</span>
    </div>
  );

  const active = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="cfg-root">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

        /* ── base ── */
        .cfg-root { max-width: 940px; margin: 0 auto; padding: 0 1rem 6rem; font-family: 'DM Sans', sans-serif; }

        /* ── header ── */
        .cfg-hdr { padding: 2.5rem 0 2rem; border-bottom: 1px solid var(--border); margin-bottom: 0; }
        .cfg-hdr-inner { display: flex; align-items: flex-end; justify-content: space-between; }
        .cfg-eyebrow { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.3rem; }
        .cfg-title { font-family: Fraunces, serif; font-size: 2rem; font-weight: 700; color: var(--fg); margin: 0; line-height: 1; }
        .cfg-breadcrumb { font-size: 0.78rem; color: var(--muted); }

        /* ── sidebar layout ── */
        .cfg-body { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; margin-top: 2rem; align-items: start; }
        @media (max-width: 680px) { .cfg-body { grid-template-columns: 1fr; } }

        /* ── sidebar nav ── */
        .cfg-nav { display: flex; flex-direction: column; gap: 3px; position: sticky; top: 1.5rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 0.5rem; }
        .cfg-nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 0.9rem; border-radius: 11px;
          border: none; outline: none;
          cursor: pointer; transition: all 0.18s;
          text-align: left; background: transparent;
          font-family: 'DM Sans', sans-serif;
          -webkit-appearance: none; appearance: none;
          width: 100%;
        }
        .cfg-nav-item:hover { background: color-mix(in srgb, var(--accent) 7%, transparent); }
        .cfg-nav-item.active {
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }
        .cfg-nav-emoji { 
          font-size: 1rem; flex-shrink: 0; width: 30px; height: 30px;
          display: grid; place-items: center;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 8px; line-height: 1;
        }
        .cfg-nav-item.active .cfg-nav-emoji {
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          border-color: color-mix(in srgb, var(--accent) 35%, transparent);
        }
        .cfg-nav-label { font-size: 0.84rem; font-weight: 600; color: var(--fg); display: block; line-height: 1.2; }
        .cfg-nav-item.active .cfg-nav-label { color: var(--accent); }
        .cfg-nav-desc  { font-size: 0.67rem; color: var(--muted); display: block; margin-top: 1px; }

        /* ── content panel ── */
        .cfg-panel {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 20px;
          overflow: hidden; animation: panelIn 0.22s cubic-bezier(.16,1,.3,1);
        }
        .cfg-panel-hdr {
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
          background: color-mix(in srgb, var(--bg) 50%, transparent);
        }
        .cfg-panel-title { font-family: Fraunces, serif; font-size: 1.1rem; font-weight: 700; color: var(--fg); margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .cfg-panel-body  { padding: 1.75rem; }

        /* ── form elements ── */
        .field { margin-bottom: 1.25rem; }
        .field:last-of-type { margin-bottom: 0; }
        .field label {
          display: block; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 0.45rem;
        }
        .field-hint { font-size: 0.72rem; color: var(--muted); margin-top: 0.3rem; }
        .field input, .field textarea, .field select {
          width: 100%; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 12px; padding: 0.65rem 0.9rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; color: var(--fg);
          transition: border-color 0.15s, box-shadow 0.15s; outline: none;
        }
        .field input:focus, .field textarea:focus, .field select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
        }
        .field textarea { resize: vertical; min-height: 90px; line-height: 1.55; }
        .field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field-grid-emoji { display: grid; grid-template-columns: 72px 1fr; gap: 0.75rem; }
        .field-emoji input { font-size: 1.4rem; text-align: center; padding: 0.5rem; }

        /* ── section divider ── */
        .section-divider {
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--muted); padding: 0.5rem 0; margin: 1.5rem 0 1rem;
          border-top: 1px solid var(--border);
        }

        /* ── save bar ── */
        .save-bar { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--border); }
        .save-feedback { font-size: 0.78rem; color: #10b981; font-weight: 600; animation: fadeIn 0.2s ease; display: flex; align-items: center; gap: 0.3rem; }
        .btn-save {
          background: var(--accent); color: #fff; border: none;
          padding: 0.65rem 1.4rem; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s; letter-spacing: 0.02em;
        }
        .btn-save:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 28%, transparent); }
        .btn-save:active { transform: none; }

        /* ── redes grid ── */
        .red-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.85rem; }
        .red-card {
          background: var(--bg); border: 1px solid var(--border); border-radius: 14px;
          padding: 1rem; display: flex; align-items: center; gap: 0.85rem; transition: all 0.18s;
        }
        .red-card:hover { border-color: color-mix(in srgb, var(--accent) 35%, transparent); transform: translateY(-2px); }
        .red-card-emoji { font-size: 1.5rem; width: 42px; height: 42px; display: grid; place-items: center; background: var(--bg2); border-radius: 10px; border: 1px solid var(--border); flex-shrink: 0; }
        .red-card-info { flex: 1; min-width: 0; }
        .red-card-name { font-weight: 700; font-size: 0.85rem; color: var(--fg); }
        .red-card-handle { font-size: 0.72rem; color: var(--muted); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .red-card-actions { display: flex; gap: 3px; flex-shrink: 0; }

        .red-empty {
          grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem;
          color: var(--muted); font-size: 0.82rem;
          border: 1px dashed var(--border); border-radius: 12px;
        }

        /* ── icon buttons ── */
        .btn-icon-sm {
          width: 28px; height: 28px; border-radius: 8px;
          display: grid; place-items: center; font-size: 0.75rem;
          border: 1px solid var(--border); background: var(--bg2);
          cursor: pointer; transition: all 0.15s;
        }
        .btn-icon-sm.edit:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
        .btn-icon-sm.del:hover  { border-color: #f87171;       background: color-mix(in srgb, #f87171 10%, transparent); }

        /* ── og preview ── */
        .og-preview {
          margin-top: 0.75rem; border-radius: 12px; overflow: hidden;
          border: 1px solid var(--border); display: none;
        }
        .og-preview.visible { display: block; animation: fadeIn 0.2s; }
        .og-preview img { width: 100%; height: 140px; object-fit: cover; display: block; }
        .og-preview-bar { padding: 0.5rem 0.75rem; font-size: 0.72rem; color: var(--muted); background: var(--bg); }

        /* ── rich textarea ── */
        .rich-helper { font-size: 0.72rem; color: var(--muted); margin-bottom: 0.4rem; line-height: 1.5; }
        .rich-helper code { background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 0 4px; font-size: 0.68rem; }

        /* ── modal ── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: color-mix(in srgb, var(--bg) 75%, transparent);
          backdrop-filter: blur(8px);
          display: grid; place-items: center; padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .modal-panel {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 20px; padding: 2rem;
          width: 100%; max-width: 440px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.3);
          animation: slideUp 0.2s cubic-bezier(.16,1,.3,1);
        }
        .modal-title {
          font-family: 'Syne', sans-serif; font-size: 1.2rem; font-weight: 700;
          color: var(--fg); margin: 0 0 1.5rem;
          padding-bottom: 1rem; border-bottom: 1px solid var(--border);
        }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 0.6rem;
          margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border);
        }
        .btn-sm-primary {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
          padding: 0.55rem 1.1rem; border-radius: 11px;
          border: none; background: var(--accent); color: #fff;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-sm-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-sm-secondary {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500;
          padding: 0.55rem 1.1rem; border-radius: 11px;
          border: 1px solid var(--border); background: var(--bg2); color: var(--fg);
          cursor: pointer; transition: all 0.15s;
        }
        .btn-sm-secondary:hover { border-color: var(--accent); }
        .btn-ghost-sm {
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 500;
          padding: 0.4rem 0.85rem; border-radius: 10px;
          border: 1px solid var(--border); background: none; color: var(--muted);
          cursor: pointer; transition: all 0.15s;
        }
        .btn-ghost-sm:hover { border-color: var(--accent); color: var(--accent); }

        /* ── char counter ── */
        .char-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; }
        .char-count { font-size: 0.68rem; color: var(--muted); }
        .char-count.warn { color: #f59e0b; }
        .char-count.over { color: #f87171; }

        /* ── animations ── */
        @keyframes fadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes panelIn { from { transform: translateX(6px); opacity: 0; }  to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse   { 0%,100% { opacity: 0.4; }                         50% { opacity: 1; } }
      `}</style>

      {/* ─── HEADER ─────────────────────────────────────── */}
      <div className="cfg-hdr">
        <div className="cfg-hdr-inner">
          <div>
            <div className="cfg-eyebrow">Panel de administración</div>
            <h1 className="cfg-title">Configuración del Sitio</h1>
          </div>
          <span className="cfg-breadcrumb">Admin → {active.label}</span>
        </div>
      </div>

      {/* ─── BODY (sidebar + panel) ──────────────────────── */}
      <div className="cfg-body">

        {/* Sidebar nav */}
        <nav className="cfg-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`cfg-nav-item${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="cfg-nav-emoji">{tab.emoji}</span>
              <span>
                <span className="cfg-nav-label">{tab.label}</span>
                <span className="cfg-nav-desc">{tab.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* ── HERO ── */}
        {activeTab === "hero" && (
          <div className="cfg-panel">
            <div className="cfg-panel-hdr">
              <h2 className="cfg-panel-title">✨ Portada (Hero)</h2>
            </div>
            <div className="cfg-panel-body">
              <div className="field">
                <label>Eslogan / Eyebrow</label>
                <input id="hero-eye" defaultValue={hero?.eyebrow || ""} placeholder="SIN PRESUPUESTO" />
                <p className="field-hint">Texto pequeño arriba del título principal.</p>
              </div>

              <div className="field">
                <label>Título Principal</label>
                <textarea id="hero-tit" defaultValue={hero?.titulo || ""} rows={3} placeholder="Aprende sin\nlímites" />
                <p className="field-hint">Usa <code>\n</code> para forzar un salto de línea. La última línea aparecerá en cursiva estilizada.</p>
              </div>

              <div className="field">
                <label>Descripción</label>
                <textarea id="hero-desc" defaultValue={hero?.descripcion || ""} rows={4} placeholder="Una plataforma para estudiantes..." />
              </div>

              <div className="section-divider">Imagen y Marca</div>
              <div className="field">
                <label>Ruta del Logo</label>
                <input id="hero-logo" defaultValue={hero?.logoSrc || ""} placeholder="/logos/logo-sp.svg" />
              </div>
              <div className="field">
                <label>Texto Alternativo Logo</label>
                <input id="hero-alt" defaultValue={hero?.logoAlt || ""} placeholder="SinPresupuesto Logo" />
              </div>

              <div className="save-bar">
                {saved === "hero" && <span className="save-feedback">✓ Cambios guardados</span>}
                <button className="btn-save" onClick={() => {
                  const eyebrow = (document.getElementById("hero-eye") as HTMLInputElement).value;
                  const titulo = (document.getElementById("hero-tit") as HTMLTextAreaElement).value;
                  const descripcion = (document.getElementById("hero-desc") as HTMLTextAreaElement).value;
                  const logoSrc = (document.getElementById("hero-logo") as HTMLInputElement).value;
                  const logoAlt = (document.getElementById("hero-alt") as HTMLInputElement).value;
                  saveFile("hero.json", { eyebrow, titulo, descripcion, logoSrc, logoAlt });
                  flash("hero");
                }}>Guardar Hero</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SEO ── */}
        {activeTab === "seo" && (
          <div className="cfg-panel">
            <div className="cfg-panel-hdr">
              <h2 className="cfg-panel-title">🔍 SEO y Metadatos</h2>
            </div>
            <div className="cfg-panel-body">
              <div className="field">
                <label>Título de la página (title tag)</label>
                <input id="seo-title" defaultValue={seo?.titleHome || ""} placeholder="Mi Sitio — Aprende con nosotros" />
                <p className="field-hint">Aparece en pestañas del navegador y resultados de búsqueda. Máx. 60 caracteres recomendados.</p>
              </div>

              <div className="field">
                <div className="char-row">
                  <label style={{ margin: 0 }}>Meta descripción</label>
                </div>
                <textarea
                  id="seo-desc"
                  defaultValue={seo?.descriptionHome || ""}
                  rows={3}
                  placeholder="Describe en 1-2 oraciones de qué trata tu sitio…"
                  onChange={e => {
                    const n = e.target.value.length;
                    const el = document.getElementById("seo-chars");
                    if (el) { el.textContent = `${n}/160`; el.className = `char-count${n > 160 ? " over" : n > 140 ? " warn" : ""}`; }
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span id="seo-chars" className="char-count">{(seo?.descriptionHome || "").length}/160</span>
                </div>
              </div>

              <div className="field">
                <label>Imagen Open Graph (URL)</label>
                <input
                  id="seo-og"
                  defaultValue={seo?.ogImage || ""}
                  placeholder="https://tusitio.com/og-image.jpg"
                  onChange={e => {
                    const prev = document.getElementById("og-preview");
                    const img = document.getElementById("og-img") as HTMLImageElement | null;
                    const bar = document.getElementById("og-bar");
                    if (!prev || !img || !bar) return;
                    const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
                    if (e.target.value) { img.src = e.target.value; prev.classList.add("visible"); bar.textContent = e.target.value; }
                    else { img.src = pixel; prev.classList.remove("visible"); }
                  }}
                />
                <p className="field-hint">Se muestra al compartir el sitio en redes sociales. Tamaño ideal: 1200×630 px.</p>
                <div id="og-preview" className={`og-preview${seo?.ogImage ? " visible" : ""}`}>
                  <img 
                    id="og-img" 
                    src={seo?.ogImage || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"} 
                    alt="Open Graph preview" 
                  />
                  <div id="og-bar" className="og-preview-bar">{seo?.ogImage || ""}</div>
                </div>
              </div>

              <div className="save-bar">
                {saved === "seo" && <span className="save-feedback">✓ Cambios guardados</span>}
                <button className="btn-save" onClick={() => {
                  const titleHome = (document.getElementById("seo-title") as HTMLInputElement).value;
                  const descriptionHome = (document.getElementById("seo-desc") as HTMLTextAreaElement).value;
                  const ogImage = (document.getElementById("seo-og") as HTMLInputElement).value;
                  saveFile("seo.json", { titleHome, descriptionHome, ogImage });
                  flash("seo");
                }}>Guardar SEO</button>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        {activeTab === "footer" && (
          <div className="cfg-panel">
            <div className="cfg-panel-hdr">
              <h2 className="cfg-panel-title">📝 Pie de Página</h2>
            </div>
            <div className="cfg-panel-body">
              <div className="field">
                <label>Línea principal</label>
                <input id="foot-l1" defaultValue={footer?.linea1 || ""} placeholder="© 2025 Mi Organización" />
                <p className="field-hint">Texto principal del footer, normalmente copyright o nombre.</p>
              </div>
              <div className="field">
                <label>Créditos / Información adicional</label>
                <textarea id="foot-l2" defaultValue={footer?.linea2 || ""} rows={3} placeholder="Hecho con ❤ por el equipo…" />
                <p className="field-hint">Segunda línea — puede contener créditos, versión u otro texto secundario.</p>
              </div>

              <div className="section-divider">Otros enlaces del pie</div>
              <div className="field">
                <label>Enlace 1 — Texto</label>
                <input id="foot-e1t" defaultValue={footer?.enlace1Texto || ""} placeholder="Política de privacidad" />
              </div>
              <div className="field">
                <label>Enlace 1 — URL</label>
                <input id="foot-e1u" defaultValue={footer?.enlace1Url || ""} placeholder="https://…" />
              </div>
              <div className="field">
                <label>Enlace 2 — Texto</label>
                <input id="foot-e2t" defaultValue={footer?.enlace2Texto || ""} placeholder="Términos de uso" />
              </div>
              <div className="field">
                <label>Enlace 2 — URL</label>
                <input id="foot-e2u" defaultValue={footer?.enlace2Url || ""} placeholder="https://…" />
              </div>

              <div className="save-bar">
                {saved === "footer" && <span className="save-feedback">✓ Cambios guardados</span>}
                <button className="btn-save" onClick={() => {
                  saveFile("footer.json", {
                    linea1: (document.getElementById("foot-l1") as HTMLInputElement).value,
                    linea2: (document.getElementById("foot-l2") as HTMLTextAreaElement).value,
                    enlace1Texto: (document.getElementById("foot-e1t") as HTMLInputElement).value,
                    enlace1Url: (document.getElementById("foot-e1u") as HTMLInputElement).value,
                    enlace2Texto: (document.getElementById("foot-e2t") as HTMLInputElement).value,
                    enlace2Url: (document.getElementById("foot-e2u") as HTMLInputElement).value,
                  });
                  flash("footer");
                }}>Guardar Pie de Página</button>
              </div>
            </div>
          </div>
        )}

        {/* ── REDES ── */}
        {activeTab === "redes" && (
          <div className="cfg-panel">
            <div className="cfg-panel-hdr">
              <h2 className="cfg-panel-title">📱 Redes Sociales</h2>
              <button
                className="btn-ghost-sm"
                onClick={() => setEditingRed({ nombre: "", emoji: "🔗", url: "", handle: "", bgColor: "#f3f4f6", orden: redes.length })}
              >+ Nueva Red</button>
            </div>
            <div className="cfg-panel-body">
              <div className="red-grid">
                {redes.length === 0 && (
                  <div className="red-empty">Sin redes sociales todavía — añade la primera.</div>
                )}
                {[...redes].sort((a, b) => a.orden - b.orden).map(red => (
                  <div key={red.filename} className="red-card">
                    <div className="red-card-emoji">{red.emoji}</div>
                    <div className="red-card-info">
                      <div className="red-card-name">{red.nombre}</div>
                      <div className="red-card-handle">{red.handle || red.url}</div>
                    </div>
                    <div className="red-card-actions">
                      <button className="btn-icon-sm edit" onClick={() => setEditingRed(red)}>✏️</button>
                      <button className="btn-icon-sm del" onClick={() => setDeletingRed(red.filename)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DONACIONES ── */}
        {activeTab === "donaciones" && (
          <div className="cfg-panel">
            <div className="cfg-panel-hdr">
              <h2 className="cfg-panel-title">❤️ Bloque de Donaciones</h2>
            </div>
            <div className="cfg-panel-body">
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 0, marginBottom: "1.5rem", lineHeight: 1.6 }}>
                Este texto aparece en el panel de <strong style={{ color: "var(--fg)" }}>Redes</strong> del nav. Puedes editar libremente el contenido informativo sobre cómo o dónde donar.
              </p>
              <div className="field">
                <label>Título del bloque</label>
                <input id="don-tit" defaultValue={donaciones?.titulo || ""} placeholder="Apóyanos" />
              </div>
              <div className="field">
                <div className="rich-helper">
                  Texto libre — se mostrará tal cual. Puedes usar saltos de línea.
                </div>
                <label>Mensaje principal</label>
                <textarea id="don-sub" defaultValue={donaciones?.subtitulo || ""} rows={5} placeholder="Explica aquí cómo la gente puede apoyar el proyecto, qué impacto tiene, etc…" />
              </div>

              <div className="section-divider">Información de pago</div>
              <div className="field-grid-2">
                <div className="field">
                  <label>Método (ej: Nequi, Binance)</label>
                  <input id="don-met" defaultValue={donaciones?.metodoLabel || ""} placeholder="Nequi" />
                </div>
                <div className="field">
                  <label>Número / Cuenta</label>
                  <input id="don-num" defaultValue={donaciones?.numero || ""} placeholder="310 000 0000" />
                </div>
              </div>
              <div className="field">
                <label>Nota adicional (opcional)</label>
                <input id="don-nota" defaultValue={donaciones?.nota || ""} placeholder="Ej: escribe tu nombre en el concepto" />
              </div>

              <div className="save-bar">
                {saved === "donaciones" && <span className="save-feedback">✓ Cambios guardados</span>}
                <button className="btn-save" onClick={() => {
                  const titulo = (document.getElementById("don-tit") as HTMLInputElement).value;
                  const subtitulo = (document.getElementById("don-sub") as HTMLTextAreaElement).value;
                  const metodoLabel = (document.getElementById("don-met") as HTMLInputElement).value;
                  const numero = (document.getElementById("don-num") as HTMLInputElement).value;
                  const nota = (document.getElementById("don-nota") as HTMLInputElement).value;
                  saveFile("donaciones.json", { titulo, subtitulo, metodoLabel, numero, numeroDisplay: numero, nota });
                  flash("donaciones");
                }}>Guardar Donaciones</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: RED SOCIAL ───────────────────────────── */}
      {editingRed && (
        <div className="modal-overlay" onClick={() => setEditingRed(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingRed.filename ? "Editar Red Social" : "Nueva Red Social"}</h2>

            <div className="field-grid-emoji" style={{ marginBottom: "1rem" }}>
              <div className="field field-emoji" style={{ marginBottom: 0 }}>
                <label>Emoji</label>
                <input id="red-emoji" defaultValue={editingRed.emoji || "🔗"} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nombre</label>
                <input id="red-nombre" defaultValue={editingRed.nombre} placeholder="Instagram" />
              </div>
            </div>
            <div className="field">
              <label>URL del enlace</label>
              <input id="red-url" defaultValue={editingRed.url} placeholder="https://instagram.com/usuario" />
            </div>
            <div className="field">
              <label>Usuario / Handle</label>
              <input id="red-handle" defaultValue={editingRed.handle} placeholder="@usuario" />
            </div>

            <div className="modal-footer">
              <button className="btn-sm-secondary" onClick={() => setEditingRed(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={() => {
                const nombre = (document.getElementById("red-nombre") as HTMLInputElement).value;
                const emoji = (document.getElementById("red-emoji") as HTMLInputElement).value;
                const url = (document.getElementById("red-url") as HTMLInputElement).value;
                const handle = (document.getElementById("red-handle") as HTMLInputElement).value;
                const filename = editingRed.filename || `${nombre.toLowerCase().replace(/\s+/g, "-")}.json`;
                saveFile("redes", { nombre, emoji, url, handle, bgColor: editingRed.bgColor || "#f3f4f6", orden: editingRed.orden }, filename);
                setEditingRed(null);
              }}>Guardar Red</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIRM DELETE ──────────────────────────────── */}
      {deletingRed && (
        <ConfirmDialog
          message="¿Eliminar esta red social? No se puede deshacer."
          onCancel={() => setDeletingRed(null)}
          onConfirm={() => { deleteRed(deletingRed); setDeletingRed(null); }}
        />
      )}
    </div>
  );
}