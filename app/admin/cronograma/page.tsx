"use client";
import { useEffect, useState } from "react";

interface Cell { materia: string; subTexto: string; logo: string; color: string; }
interface Row { label: string; cells: Cell[]; }
interface Cronograma { titulo: string; fechas: string; meetUrl: string; cols: string[]; rows: Row[]; }

const PALETTE = [
  { hex: "", label: "Vacío" },
  { hex: "#dbeafe", label: "Azul" },
  { hex: "#dcfce7", label: "Verde" },
  { hex: "#fef9c3", label: "Amarillo" },
  { hex: "#fce7f3", label: "Rosa" },
  { hex: "#ffedd5", label: "Naranja" },
  { hex: "#f3e8ff", label: "Morado" },
  { hex: "#fee2e2", label: "Rojo" },
  { hex: "#e0f2fe", label: "Celeste" },
  { hex: "#f1f5f9", label: "Gris" },
];

const emptyCell = (): Cell => ({ materia: "", subTexto: "", logo: "", color: "" });

export default function CronogramaAdmin() {
  const [data, setData] = useState<Cronograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editingHeader, setEditingHeader] = useState<{ type: "col" | "row"; idx: number } | null>(null);
  const [headerDraft, setHeaderDraft] = useState("");

  useEffect(() => {
    fetch("/api/config?file=cronograma.json")
      .then(r => r.json())
      .then(json => {
        const d = { ...json };
        if (!d.cols) d.cols = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        if (!d.rows) d.rows = Array(3).fill(0).map((_, i) => ({
          label: `${12 + i * 3}:00 – ${14 + i * 3}:00`,
          cells: Array(d.cols.length).fill(0).map(emptyCell)
        }));
        setData(d);
        setLoading(false);
      });
  }, []);

  const persist = async (next: Cronograma) => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: "cronograma.json", data: next })
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = () => { if (data) persist(data); };

  const addCol = () => {
    if (!data) return;
    setData({ ...data, cols: [...data.cols, "Nuevo día"], rows: data.rows.map(r => ({ ...r, cells: [...r.cells, emptyCell()] })) });
  };

  const addRow = () => {
    if (!data) return;
    setData({ ...data, rows: [...data.rows, { label: "Nueva hora", cells: data.cols.map(emptyCell) }] });
  };

  const removeCol = (idx: number) => {
    if (!data || data.cols.length <= 1) return;
    setData({ ...data, cols: data.cols.filter((_, i) => i !== idx), rows: data.rows.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== idx) })) });
  };

  const removeRow = (idx: number) => {
    if (!data || data.rows.length <= 1) return;
    setData({ ...data, rows: data.rows.filter((_, i) => i !== idx) });
  };

  const updateCell = (field: keyof Cell, val: string) => {
    if (!editingCell || !data) return;
    const next = { ...data };
    next.rows[editingCell.r].cells[editingCell.c] = { ...next.rows[editingCell.r].cells[editingCell.c], [field]: val };
    setData(next);
  };

  const saveAndClose = () => { setEditingCell(null); };

  const openHeader = (type: "col" | "row", idx: number) => {
    if (!data) return;
    setHeaderDraft(type === "col" ? data.cols[idx] : data.rows[idx].label);
    setEditingHeader({ type, idx });
  };

  const saveHeader = () => {
    if (!editingHeader || !data) return;
    const next = { ...data };
    if (editingHeader.type === "col") next.cols[editingHeader.idx] = headerDraft;
    else next.rows[editingHeader.idx].label = headerDraft;
    setData(next);
    setEditingHeader(null);
  };

  const clearCell = (r: number, c: number) => {
    if (!data) return;
    const next = { ...data };
    next.rows[r].cells[c] = emptyCell();
    persist(next);
  };

  if (loading || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: "0.75rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1s ease infinite" }} />
      <span style={{ fontSize: "0.85rem", color: "var(--muted)", letterSpacing: "0.08em" }}>CARGANDO CRONOGRAMA</span>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </div>
  );

  const activeCell = editingCell ? data.rows[editingCell.r].cells[editingCell.c] : null;

  return (
    <div className="cron-root">
      <style jsx>{`
        .cron-root { max-width: 1100px; margin: 0 auto; }

        /* ── header ── */
        .cron-hdr {
          display: flex; justify-content: space-between; align-items: flex-end;
          padding-bottom: 2rem; border-bottom: 1px solid var(--border); margin-bottom: 2rem;
        }
        .cron-editable {
          background: none; border: none; outline: none; color: var(--fg);
          font-family: 'Syne', sans-serif; cursor: text;
        }
        .cron-editable:focus { border-bottom: 1px dashed var(--accent); }
        .cron-title-inp { font-size: 1.8rem; font-weight: 800; }
        .cron-dates-inp { font-size: 0.78rem; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.3rem; width: 300px; font-family: 'DM Sans', sans-serif; }

        .cron-status { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--muted); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); transition: background 0.3s; }
        .status-dot.saving { background: #f59e0b; animation: pulse 0.8s ease infinite; }
        .status-dot.saved  { background: #10b981; }

        /* ── stats row ── */
        .cron-stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .stat-chip {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
          padding: 0.5rem 0.9rem; font-size: 0.75rem; color: var(--muted);
          display: flex; align-items: center; gap: 0.4rem;
        }
        .stat-chip strong { color: var(--fg); font-weight: 600; }

        /* ── table container ── */
        .sheet-wrap {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 20px; overflow: auto;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .sheet-table { border-collapse: collapse; width: 100%; min-width: 650px; }

        /* ── col headers ── */
        .sheet-th-corner {
          padding: 0.85rem 1rem; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--muted); text-align: left;
          border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);
          white-space: nowrap; min-width: 80px; background: var(--bg);
        }
        .sheet-th {
          padding: 0; border-bottom: 1px solid var(--border);
          border-right: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
          background: var(--bg); position: relative;
        }
        .sheet-th-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.75rem 0.85rem; gap: 0.5rem;
        }
        .th-label {
          font-size: 0.78rem; font-weight: 700; color: var(--fg);
          cursor: pointer; flex: 1; text-align: center;
          padding: 0.15rem 0.3rem; border-radius: 5px;
          transition: background 0.15s;
        }
        .th-label:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); }
        .col-del-btn {
          width: 18px; height: 18px; border-radius: 5px;
          background: color-mix(in srgb, #f87171 15%, transparent);
          border: none; color: #f87171; font-size: 0.65rem;
          cursor: pointer; display: grid; place-items: center;
          opacity: 0; transition: opacity 0.15s; flex-shrink: 0;
        }
        .sheet-th:hover .col-del-btn { opacity: 1; }

        /* ── row label ── */
        .row-label-td {
          padding: 0; border-right: 1px solid var(--border);
          border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          background: var(--bg); min-width: 80px; position: relative;
        }
        .row-label-inner {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.8rem; gap: 0.4rem;
        }
        .row-label {
          font-size: 0.72rem; font-weight: 700; color: var(--muted);
          cursor: pointer; white-space: nowrap; padding: 0.15rem 0.3rem;
          border-radius: 4px; transition: background 0.15s; flex: 1;
        }
        .row-label:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); }
        .row-del-btn {
          width: 16px; height: 16px; border-radius: 4px;
          background: color-mix(in srgb, #f87171 15%, transparent);
          border: none; color: #f87171; font-size: 0.6rem;
          cursor: pointer; display: grid; place-items: center;
          opacity: 0; transition: opacity 0.15s; flex-shrink: 0;
        }
        .row-label-td:hover .row-del-btn { opacity: 1; }

        /* ── cells ── */
        .sheet-td { border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent); border-right: 1px solid color-mix(in srgb, var(--border) 50%, transparent); padding: 0; position: relative; }
        .cell-wrap {
          min-height: 80px; min-width: 120px; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 0.6rem; gap: 3px;
          transition: filter 0.15s, transform 0.1s;
          position: relative;
        }
        .cell-wrap:hover { filter: brightness(0.94); }
        .cell-wrap:hover .cell-clear { opacity: 1; }
        .cell-empty { color: var(--border); font-size: 1.1rem; opacity: 0.5; }
        .cell-logo { width: 22px; height: 22px; object-fit: contain; }
        .cell-title { font-size: 0.72rem; font-weight: 700; color: #222; line-height: 1.2; }
        .cell-sub   { font-size: 0.6rem; opacity: 0.65; color: #333; }
        .cell-clear {
          position: absolute; top: 4px; right: 4px;
          width: 16px; height: 16px; border-radius: 4px;
          background: rgba(0,0,0,0.15); border: none; color: #fff;
          font-size: 0.55rem; cursor: pointer; display: grid; place-items: center;
          opacity: 0; transition: opacity 0.15s;
        }

        /* ── add buttons ── */
        .add-row { display: flex; gap: 0.75rem; margin-top: 1.5rem; justify-content: center; }
        .btn-add-col, .btn-add-row {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.55rem 1.1rem; border-radius: 11px;
          border: 1px dashed var(--border); background: none; color: var(--muted);
          font-size: 0.78rem; font-weight: 500; cursor: pointer;
          transition: all 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .btn-add-col:hover, .btn-add-row:hover { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 5%, transparent); }

        /* ── modal overlay ── */
        .cell-modal-overlay {
          position: fixed; inset: 0;
          background: color-mix(in srgb, var(--bg) 75%, transparent);
          backdrop-filter: blur(10px);
          z-index: 1000; display: grid; place-items: center;
          padding: 1rem; animation: mfIn 0.15s ease;
        }
        .cell-modal {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 22px; padding: 1.75rem;
          width: 100%; max-width: 420px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.25);
          animation: mUp 0.22s cubic-bezier(.16,1,.3,1);
          max-height: 90vh; overflow-y: auto;
        }
        .cell-modal h3 { font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 700; margin: 0 0 1.35rem; color: var(--fg); }
        .field { margin-bottom: 1rem; }
        .field label { display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.4rem; }
        .field input {
          width: 100%; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 10px; padding: 0.6rem 0.85rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem; color: var(--fg);
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }

        /* ── color palette ── */
        .palette-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.6rem; display: block; }
        .palette-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .pal-swatch {
          aspect-ratio: 1; border-radius: 9px; cursor: pointer;
          border: 2px solid var(--border); transition: transform 0.12s, border-color 0.12s;
          display: grid; place-items: center; font-size: 0.65rem; font-weight: 700;
          position: relative; overflow: hidden;
        }
        .pal-swatch:hover { transform: scale(1.08); }
        .pal-swatch.active { border-color: var(--accent); transform: scale(1.1); }
        .pal-swatch.empty-swatch { background: repeating-linear-gradient(45deg, var(--border) 0, var(--border) 1px, transparent 0, transparent 50%) 0 0 / 8px 8px; }

        .modal-footer { display: flex; gap: 0.6rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); justify-content: flex-end; }
        .btn-sm-primary {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
          padding: 0.55rem 1.2rem; border-radius: 11px; border: none;
          background: var(--accent); color: #fff; cursor: pointer; transition: all 0.15s;
        }
        .btn-sm-primary:hover { opacity: 0.88; }
        .btn-sm-secondary {
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500;
          padding: 0.55rem 1rem; border-radius: 11px;
          border: 1px solid var(--border); background: var(--bg2); color: var(--fg); cursor: pointer; transition: all 0.15s;
        }
        .btn-sm-secondary:hover { border-color: var(--accent); }

        /* header edit modal */
        .hdr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); z-index: 1001; display: grid; place-items: center; }
        .hdr-modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 18px; padding: 1.5rem; width: 320px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); animation: mUp 0.2s cubic-bezier(.16,1,.3,1); }

        @keyframes mfIn { from{opacity:0} to{opacity:1} }
        @keyframes mUp  { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse{ 0%,100%{opacity:.4} 50%{opacity:1} }
      `}</style>

      {/* ── HEADER ── */}
      <div className="admin-topbar">
        <h1 className="admin-page-title">
          ⊞ Cronograma
          <span>{data.cols.length} días · {data.rows.length} franjas</span>
        </h1>
        <div className="topbar-actions">
          {saved && <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✓ Guardado</span>}
          <button 
            className="btn-primary" 
            onClick={handleManualSave} 
            disabled={saving}
            style={{ minWidth: '140px' }}
          >
            {saving ? "..." : "💾 Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* ── SETTINGS CARD ── */}
      <div className="admin-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="form-row">
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Título del Cronograma
            </label>
            <input
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.9rem' }}
              value={data.titulo}
              onChange={e => setData({ ...data, titulo: e.target.value })}
              placeholder="Ej: Cronograma de Clases - 2026"
            />
          </div>
          <div className="form-row">
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Fechas / Periodo
            </label>
            <input
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.9rem' }}
              value={data.fechas}
              onChange={e => setData({ ...data, fechas: e.target.value })}
              placeholder="Ej: Del 15 de Marzo al 20 de Mayo"
            />
          </div>
          <div className="form-row">
            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              Enlace Sala de Clases
            </label>
            <input
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.9rem' }}
              value={data.meetUrl}
              onChange={e => setData({ ...data, meetUrl: e.target.value })}
              placeholder="https://meet.google.com/..."
            />
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn-add-col" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer' }} onClick={addCol}>+ Añadir Día</button>
          <button className="btn-add-row" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', cursor: 'pointer' }} onClick={addRow}>+ Añadir Franja</button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="sheet-wrap">
        <table className="sheet-table">
          <thead>
            <tr>
              <th className="sheet-th-corner">Hora \ Día</th>
              {data.cols.map((col, i) => (
                <th key={i} className="sheet-th">
                  <div className="sheet-th-inner">
                    <span className="th-label" onClick={() => openHeader("col", i)}>{col}</span>
                    {data.cols.length > 1 && (
                      <button className="col-del-btn" onClick={() => removeCol(i)} title="Eliminar día">✕</button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="row-label-td">
                  <div className="row-label-inner">
                    <span className="row-label" onClick={() => openHeader("row", rIdx)}>{row.label}</span>
                    {data.rows.length > 1 && (
                      <button className="row-del-btn" onClick={() => removeRow(rIdx)} title="Eliminar franja">✕</button>
                    )}
                  </div>
                </td>
                {row.cells.map((cell, cIdx) => {
                  const isEmpty = !cell.materia && !cell.logo;
                  return (
                    <td key={cIdx} className="sheet-td">
                      <div
                        className="cell-wrap"
                        style={{ background: cell.color || "transparent" }}
                        onClick={() => setEditingCell({ r: rIdx, c: cIdx })}
                      >
                        {isEmpty ? (
                          <span className="cell-empty">+</span>
                        ) : (
                          <>
                            {cell.logo && <img className="cell-logo" src={cell.logo} alt="" />}
                            {cell.materia && <span className="cell-title" style={{ color: cell.color ? "#1a1a2e" : "var(--fg)" }}>{cell.materia}</span>}
                            {cell.subTexto && <span className="cell-sub" style={{ color: cell.color ? "#2d2d4e" : "var(--muted)" }}>{cell.subTexto}</span>}
                          </>
                        )}
                        {!isEmpty && (
                          <button className="cell-clear" onClick={e => { e.stopPropagation(); clearCell(rIdx, cIdx); }} title="Limpiar celda">✕</button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CELL EDITOR MODAL ── */}
      {editingCell && activeCell && (
        <div className="cell-modal-overlay" onClick={saveAndClose}>
          <div className="cell-modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Celda — Fila {editingCell.r + 1}, Columna {editingCell.c + 1}</h3>

            <div className="field">
              <label>Materia o título</label>
              <input autoFocus value={activeCell.materia} onChange={e => updateCell("materia", e.target.value)} placeholder="Ej: Matemáticas" />
            </div>
            <div className="field">
              <label>Subtexto (opcional)</label>
              <input value={activeCell.subTexto} onChange={e => updateCell("subTexto", e.target.value)} placeholder="Ej: Teoria / Prof. García" />
            </div>
            <div className="field">
              <label>URL del ícono (opcional)</label>
              <input value={activeCell.logo} onChange={e => updateCell("logo", e.target.value)} placeholder="/logos/matematicas.png" />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <span className="palette-label">Color de fondo</span>
              <div className="palette-grid">
                {PALETTE.map(p => (
                  <div
                    key={p.hex}
                    className={`pal-swatch${!p.hex ? " empty-swatch" : ""}${activeCell.color === p.hex ? " active" : ""}`}
                    style={p.hex ? { background: p.hex } : {}}
                    title={p.label}
                    onClick={() => updateCell("color", p.hex)}
                  >
                    {!p.hex && "✕"}
                    {activeCell.color === p.hex && p.hex && <span style={{ fontSize: "0.7rem" }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(activeCell.materia || activeCell.logo) && (
              <div style={{ background: activeCell.color || "var(--bg)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", minHeight: "60px" }}>
                {activeCell.logo && <img src={activeCell.logo} style={{ width: 24, height: 24, objectFit: "contain" }} alt="" />}
                <div style={{ textAlign: "center" }}>
                  {activeCell.materia && <div style={{ fontSize: "0.8rem", fontWeight: 700, color: activeCell.color ? "#1a1a2e" : "var(--fg)" }}>{activeCell.materia}</div>}
                  {activeCell.subTexto && <div style={{ fontSize: "0.65rem", opacity: 0.7, color: activeCell.color ? "#333" : "var(--muted)" }}>{activeCell.subTexto}</div>}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-sm-secondary" onClick={() => setEditingCell(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={saveAndClose}>Guardar Celda</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER EDITOR ── */}
      {editingHeader && (
        <div className="hdr-modal-overlay" onClick={() => setEditingHeader(null)}>
          <div className="hdr-modal" onClick={e => e.stopPropagation()}>
            <div className="field">
              <label>{editingHeader.type === "col" ? "Nombre del día" : "Franja horaria"}</label>
              <input autoFocus value={headerDraft} onChange={e => setHeaderDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveHeader()} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn-sm-secondary" onClick={() => setEditingHeader(null)}>Cancelar</button>
              <button className="btn-sm-primary" onClick={saveHeader}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}