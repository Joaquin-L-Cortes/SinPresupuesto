"use client";

import { useState, useEffect } from "react";
import navDataDefault from "@/content/nav.json";

interface NavLink {
  id: string;
  label: string;
  href: string;
  children?: NavLink[];
}

export default function NavigationAdmin() {
  const [navData, setNavData] = useState<any>(navDataDefault);
  const [links, setLinks] = useState<NavLink[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/config?file=nav.json");
        const data = await res.json();
        if (data) {
          setNavData(data);
          setLinks(data.links || []);
        }
      } catch (e) {
        console.error("Error loading nav:", e);
        setLinks(navDataDefault.links || []);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const newConfig = { ...navData, links };
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "nav.json", data: newConfig })
      });
      if (!res.ok) throw new Error("Error al guardar");
      alert("Navegación actualizada correctamente");
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const updateGlobal = (field: string, value: string) => {
    setNavData((prev: any) => ({ ...prev, [field]: value }));
  };

  function addLink(parentId?: string) {
    const newLink: NavLink = { id: "new-" + Date.now(), label: "Nuevo Ítem", href: "/" };
    if (!parentId) {
      setLinks([...links, newLink]);
    } else {
      setLinks(links.map(l => {
        if (l.id === parentId) return { ...l, children: [...(l.children || []), newLink] };
        return l;
      }));
    }
  }

  function removeLink(id: string) {
    if (!confirm("¿Eliminar este ítem?")) return;

    const removeRecursive = (list: NavLink[]): NavLink[] => {
      return list
        .filter(item => item.id !== id)
        .map(item => {
          if (item.children) {
            return { ...item, children: removeRecursive(item.children) };
          }
          return item;
        });
    };

    setLinks(removeRecursive(links));
  }

  function updateLink(id: string, field: keyof NavLink, value: string) {
    const updateRecursive = (list: NavLink[]): NavLink[] => {
      return list.map(l => {
        if (l.id === id) return { ...l, [field]: value };
        if (l.children) return { ...l, children: updateRecursive(l.children) };
        return l;
      });
    };
    setLinks(updateRecursive(links));
  }

  function moveItem(id: string, dir: number, parentId?: string) {
    if (!parentId) {
      const idx = links.findIndex(l => l.id === id);
      if (idx + dir < 0 || idx + dir >= links.length) return;
      const next = [...links];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      setLinks(next);
    } else {
      setLinks(links.map(l => {
        if (l.id === parentId && l.children) {
          const idx = l.children.findIndex(c => c.id === id);
          if (idx + dir < 0 || idx + dir >= l.children.length) return l;
          const nextC = [...l.children];
          [nextC[idx], nextC[idx + dir]] = [nextC[idx + dir], nextC[idx]];
          return { ...l, children: nextC };
        }
        return l;
      }));
    }
  }

  return (
    <div className="nav-admin">
      <header className="admin-topbar">
        <h1 className="admin-page-title">
          🔗 Navegación <span>Configuración Total</span>
        </h1>
        <div className="topbar-actions">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "..." : "💾 Guardar Todo"}
          </button>
        </div>
      </header>

      <div className="admin-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>⚙️</span> Ajustes Generales
        </h3>
        <div className="grid-2">
          <div className="form-row">
            <label>Nombre del Sitio</label>
            <input value={navData.nombreSitio} onChange={e => updateGlobal("nombreSitio", e.target.value)} />
          </div>
          <div className="form-row">
            <label>Texto Botón Ingreso</label>
            <input value={navData.botonIngresar} onChange={e => updateGlobal("botonIngresar", e.target.value)} />
          </div>
          <div className="form-row">
            <label>Ruta Logo (SVG/PNG)</label>
            <input value={navData.logoSrc} onChange={e => updateGlobal("logoSrc", e.target.value)} />
          </div>
          <div className="form-row">
            <label>Texto Alt Logo</label>
            <input value={navData.logoAlt} onChange={e => updateGlobal("logoAlt", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🗺️</span> Estructura del Menú
        </h3>

        <div className="nav-builder">
          {links.map((link, idx) => (
            <div key={link.id} className="nav-group">
              <div className="nav-row main-row">
                <div className="nav-handle">
                  <button onClick={() => moveItem(link.id, -1)} disabled={idx === 0}>▲</button>
                  <button onClick={() => moveItem(link.id, 1)} disabled={idx === links.length - 1}>▼</button>
                </div>
                <div className="nav-inputs">
                  <input
                    placeholder="Nombre del menú"
                    value={link.label}
                    onChange={e => updateLink(link.id, "label", e.target.value)}
                  />
                  <input
                    placeholder="Ruta (ej: /clases)"
                    value={link.href}
                    onChange={e => updateLink(link.id, "href", e.target.value)}
                  />
                </div>
                <div className="nav-actions">
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => addLink(link.id)}>+ Sub</button>
                  <button className="btn-danger" style={{ padding: '0.4rem' }} onClick={() => removeLink(link.id)}>✕</button>
                </div>
              </div>

              {link.children && link.children.length > 0 && (
                <div className="nav-children">
                  {link.children.map((child, cIdx) => (
                    <div key={child.id} className="nav-row child-row">
                      <div className="nav-handle small">
                        <button onClick={() => moveItem(child.id, -1, link.id)} disabled={cIdx === 0}>▲</button>
                        <button onClick={() => moveItem(child.id, 1, link.id)} disabled={cIdx === (link.children?.length || 0) - 1}>▼</button>
                      </div>
                      <div className="nav-inputs">
                        <input
                          placeholder="Sub-item"
                          value={child.label}
                          onChange={e => updateLink(child.id, "label", e.target.value)}
                        />
                        <input
                          placeholder="URL"
                          value={child.href}
                          onChange={e => updateLink(child.id, "href", e.target.value)}
                        />
                      </div>
                      <button className="btn-danger" style={{ padding: '0.3rem' }} onClick={() => removeLink(child.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '1rem', borderStyle: 'dashed', padding: '1rem' }}
            onClick={() => addLink()}
          >
            + Añadir Nuevo Enlace Principal
          </button>
        </div>
      </div>

      <style jsx>{`
        .nav-admin { max-width: 1000px; margin: 0 auto; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 600px) { .grid-2 { grid-template-columns: 1fr; } }
        
        .nav-builder { display: flex; flex-direction: column; gap: 1rem; }
        .nav-group { 
          background: var(--bg); border: 1px solid var(--border); 
          border-radius: 16px; overflow: hidden; 
        }
        
        .nav-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; }
        .main-row { background: var(--bg2); }
        .child-row { margin-left: 2.5rem; border-top: 1px solid var(--border); font-size: 0.9rem; }
        
        .nav-handle { display: flex; flex-direction: column; gap: 2px; }
        .nav-handle button { 
          background: none; border: none; color: var(--muted); 
          font-size: 0.6rem; cursor: pointer; padding: 2px;
          border-radius: 4px;
        }
        .nav-handle button:hover:not(:disabled) { background: var(--bg3); color: var(--accent); }
        .nav-handle button:disabled { opacity: 0.2; cursor: default; }
        
        .nav-inputs { flex: 1; display: flex; gap: 0.5rem; }
        .nav-inputs input { flex: 1; min-width: 0; }
        
        .nav-actions { display: flex; gap: 0.5rem; }
        .nav-children { background: var(--bg); }
      `}</style>
    </div>
  );
}
