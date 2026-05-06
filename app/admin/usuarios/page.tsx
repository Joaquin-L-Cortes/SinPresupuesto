"use client";
import { useEffect, useState, useMemo } from "react";
import { getSupabase } from "@/lib/supabase";
import ConfirmDialog from "../components/ConfirmDialog";

interface Usuario {
  id: string;
  nombre: string | null;
  apellido: string | null;
  genero: string | null;
  avatar_id: number | null;
  role: "admin" | "profesor" | "estudiante";
  updated_at: string;
}

const AVATAR_EMOJI: Record<number, string> = {
  1: "🦁", 2: "🐯", 3: "🐻", 4: "🐸", 5: "🐢", 6: "🐬", 7: "🦋", 8: "🦄",
  9: "🐙", 10: "🦊", 11: "🐺", 12: "🦜", 13: "🐧", 14: "🦔", 15: "🦅", 16: "🦦", 17: "🦩", 18: "🪲"
};
const GENERO_MAP: Record<string, string> = { M: "Masculino", F: "Femenino", NB: "No binario", NR: "Prefiere no decir" };

const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  admin: { bg: "color-mix(in srgb, #818cf8 15%, transparent)", color: "#818cf8", label: "Admin" },
  profesor: { bg: "color-mix(in srgb, #34d399 15%, transparent)", color: "#34d399", label: "Profesor" },
  estudiante: { bg: "color-mix(in srgb, #94a3b8 15%, transparent)", color: "#94a3b8", label: "Estudiante" },
};

const ROLES = ["todos", "admin", "profesor", "estudiante"] as const;
const PER_PAGE = 12;

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLE[role] || ROLE_STYLE.estudiante;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "0.18rem 0.55rem",
      borderRadius: "6px", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.07em",
      textTransform: "uppercase", background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`
    }}>{s.label}</span>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<typeof ROLES[number]>("todos");
  const [page, setPage] = useState(1);

  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    const sb = getSupabase();
    const { data, error } = await sb
      .from("profiles")
      .select("id, nombre, apellido, genero, avatar_id, role, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setErr(error.message);
    else setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter(u => {
    const name = `${u.nombre ?? ""} ${u.apellido ?? ""}`.toLowerCase();
    return (roleFilter === "todos" || u.role === roleFilter) &&
      (!search || name.includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase()));
  }), [users, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = useMemo(() => ({
    todos: users.length,
    admin: users.filter(u => u.role === "admin").length,
    profesor: users.filter(u => u.role === "profesor").length,
    estudiante: users.filter(u => u.role === "estudiante").length,
  }), [users]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true); setErr("");
    const sb = getSupabase();
    const { error } = await sb.from("profiles").update({
      nombre: editingUser.nombre,
      apellido: editingUser.apellido,
      genero: editingUser.genero,
      avatar_id: editingUser.avatar_id,
      role: editingUser.role,
      updated_at: new Date().toISOString()
    }).eq("id", editingUser.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const handleDelete = async (uid: string) => {
    const sb = getSupabase();
    const { error } = await sb.from("profiles").delete().eq("id", uid);
    if (error) { setErr(error.message); return; }
    setUsers(prev => prev.filter(u => u.id !== uid));
    setConfirmDelId(null);
  };

  const handleFilterChange = (r: typeof ROLES[number]) => { setRoleFilter(r); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  return (
    <div className="usr-root">
      <style jsx>{`
        .usr-root { max-width: 1100px; margin: 0 auto; }

        /* ── toolbar ── */
        .usr-toolbar {
          display: flex; gap: 1rem; align-items: center;
          margin-bottom: 2rem; flex-wrap: wrap;
        }
        .search-wrap { position: relative; flex: 1; min-width: 220px; }
        .search-icon { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 0.9rem; pointer-events: none; }
        .search-input {
          width: 100%; background: var(--bg2); border: 1px solid var(--border);
          border-radius: 12px; padding: 0.65rem 0.9rem 0.65rem 2.4rem;
          color: var(--fg); font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
          outline: none; transition: all 0.15s;
        }
        .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .search-input::placeholder { color: var(--muted); }

        .role-tabs {
          display: flex; gap: 2px; background: var(--bg2);
          border: 1px solid var(--border); border-radius: 12px; padding: 3px;
        }
        .role-tab {
          padding: 0.4rem 0.85rem; border-radius: 9px;
          border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem; font-weight: 600; transition: all 0.15s;
          white-space: nowrap; display: flex; align-items: center; gap: 0.35rem;
          background: none; color: var(--muted);
        }
        .role-tab.active { background: var(--accent); color: #fff; }
        .role-tab:not(.active):hover { background: var(--bg); color: var(--fg); }
        .role-tab .cnt { font-size: 0.65rem; opacity: 0.75; }

        /* ── error ── */
        .err-banner {
          background: color-mix(in srgb, #f87171 10%, transparent);
          border: 1px solid color-mix(in srgb, #f87171 30%, transparent);
          color: #f87171; padding: 0.85rem 1rem; border-radius: 12px;
          font-size: 0.82rem; margin-bottom: 1.5rem;
        }

        /* ── grid ── */
        .user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

        /* ── user card ── */
        .user-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 20px; padding: 1.5rem;
          display: flex; flex-direction: column; gap: 0; position: relative;
          transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s;
        }
        .user-card:hover {
          border-color: color-mix(in srgb, var(--accent) 35%, transparent);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12);
        }
        .card-badge { position: absolute; top: 1.25rem; right: 1.25rem; }

        .card-avatar {
          width: 56px; height: 56px; background: var(--bg);
          border: 1px solid var(--border); border-radius: 16px;
          display: grid; place-items: center; font-size: 2rem;
          margin-bottom: 1rem;
        }
        .card-name { font-family: Fraunces, serif; font-size: 1.05rem; font-weight: 700; color: var(--fg); margin: 0 0 2px; line-height: 1.2; }
        .card-id { font-size: 0.65rem; color: var(--muted); font-family: monospace; margin-bottom: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1.25rem; }
        .meta-item { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.45rem 0.65rem; }
        .meta-item-label { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 2px; }
        .meta-item-val   { font-size: 0.78rem; font-weight: 600; color: var(--fg); display: block; }

        .card-actions { display: flex; gap: 0.5rem; margin-top: auto; }
        .btn-edit {
          flex: 1; padding: 0.5rem; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg);
          color: var(--fg); font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.35rem;
        }
        .btn-edit:hover { border-color: var(--accent); color: var(--accent); }
        .btn-del {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg);
          color: var(--muted); font-size: 0.85rem; cursor: pointer; transition: all 0.15s;
          display: grid; place-items: center;
        }
        .btn-del:hover { border-color: #f87171; color: #f87171; background: color-mix(in srgb, #f87171 8%, transparent); }

        /* ── empty / loading ── */
        .empty-state { text-align: center; padding: 5rem 1rem; color: var(--muted); }
        .empty-icon  { font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.4; }
        .empty-text  { font-size: 0.9rem; }

        /* ── pagination ── */
        .pagination { display: flex; justify-content: center; align-items: center; gap: 0.4rem; margin-top: 2.5rem; }
        .pag-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg2);
          color: var(--muted); cursor: pointer; transition: all 0.15s;
          display: grid; place-items: center; font-size: 0.875rem; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
        }
        .pag-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .pag-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
        .pag-btn:disabled { opacity: 0.35; cursor: default; }
        .pag-info { font-size: 0.72rem; color: var(--muted); padding: 0 0.5rem; }

        /* ── modal ── */
        .modal-overlay { position: fixed; inset: 0; background: color-mix(in srgb, var(--bg) 75%, transparent); backdrop-filter: blur(10px); z-index: 1000; display: grid; place-items: center; padding: 1rem; animation: mfIn 0.15s ease; }
        .modal-panel {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 24px;
          padding: 2rem; width: 100%; max-width: 500px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.3);
          animation: mUp 0.22s cubic-bezier(.16,1,.3,1);
          max-height: 90vh; overflow-y: auto;
        }
        .modal-title { font-family: Fraunces, serif; font-size: 1.35rem; font-weight: 700; margin: 0 0 1.5rem; color: var(--fg); padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
        .field { margin-bottom: 1rem; }
        .field label { display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.4rem; }
        .field input, .field select {
          width: 100%; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--border); border-radius: 11px;
          padding: 0.65rem 0.85rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; color: var(--fg); outline: none; transition: all 0.15s;
        }
        .field input:focus, .field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent); }
        .field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

        /* ── role selector ── */
        .role-selector { display: flex; gap: 0.5rem; }
        .role-opt {
          flex: 1; padding: 0.65rem 0.5rem; border-radius: 11px;
          border: 2px solid var(--border); cursor: pointer; text-align: center;
          transition: all 0.15s; background: var(--bg);
        }
        .role-opt-icon  { font-size: 1.1rem; display: block; margin-bottom: 3px; }
        .role-opt-label { font-size: 0.72rem; font-weight: 700; color: var(--muted); display: block; }
        .role-opt.selected-estudiante { border-color: #94a3b8; background: color-mix(in srgb, #94a3b8 10%, transparent); }
        .role-opt.selected-estudiante .role-opt-label { color: #94a3b8; }
        .role-opt.selected-profesor   { border-color: #34d399; background: color-mix(in srgb, #34d399 10%, transparent); }
        .role-opt.selected-profesor   .role-opt-label { color: #34d399; }
        .role-opt.selected-admin      { border-color: #818cf8; background: color-mix(in srgb, #818cf8 10%, transparent); }
        .role-opt.selected-admin      .role-opt-label { color: #818cf8; }
        .role-opt:hover:not([class*="selected"]) { border-color: var(--accent); }

        /* ── avatar picker ── */
        .avatar-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-top: 0.5rem; }
        .av-opt {
          aspect-ratio: 1; border-radius: 10px; border: 2px solid var(--border);
          background: var(--bg); display: grid; place-items: center; font-size: 1.3rem;
          cursor: pointer; transition: all 0.15s;
        }
        .av-opt:hover   { border-color: var(--accent); transform: scale(1.06); }
        .av-opt.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); transform: scale(1.08); }

        .modal-footer { display: flex; gap: 0.6rem; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
        .btn-sm-primary { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600; padding: 0.55rem 1.25rem; border-radius: 11px; border: none; background: var(--accent); color: #fff; cursor: pointer; transition: all 0.15s; }
        .btn-sm-primary:hover { opacity: 0.88; }
        .btn-sm-primary:disabled { opacity: 0.5; cursor: default; }
        .btn-sm-secondary { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 500; padding: 0.55rem 1rem; border-radius: 11px; border: 1px solid var(--border); background: var(--bg2); color: var(--fg); cursor: pointer; transition: all 0.15s; }
        .btn-sm-secondary:hover { border-color: var(--accent); }

        @keyframes mfIn { from{opacity:0} to{opacity:1} }
        @keyframes mUp  { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* ── HEADER ── */}
      <div className="admin-topbar">
        <h1 className="admin-page-title">
          ⊕ Comunidad
          <span>{users.length} perfiles</span>
        </h1>
        <button className="btn-secondary" onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>↻</span>
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="usr-toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, apellido o UID…"
          />
        </div>
        <div className="role-tabs">
          {ROLES.map(r => (
            <button key={r} className={`role-tab${roleFilter === r ? " active" : ""}`} onClick={() => handleFilterChange(r)}>
              {r === "todos" ? "Todos" : r.charAt(0).toUpperCase() + r.slice(1)}
              <span className="cnt">{counts[r]}</span>
            </button>
          ))}
        </div>
      </div>

      {err && <div className="err-banner">⚠ {err}</div>}

      {/* ── CONTENT ── */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ animation: "pulse 1s ease infinite" }}>⊕</div>
          <p className="empty-text">Sincronizando base de datos…</p>
        </div>
      ) : paged.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p className="empty-text">Sin resultados para "{search || roleFilter}"</p>
        </div>
      ) : (
        <>
          <div className="user-grid">
            {paged.map(u => (
              <div key={u.id} className="user-card">
                <div className="card-badge"><RoleBadge role={u.role} /></div>
                <div className="card-avatar">{AVATAR_EMOJI[u.avatar_id ?? 1] ?? "👤"}</div>
                <p className="card-name">{[u.nombre, u.apellido].filter(Boolean).join(" ") || "Sin nombre"}</p>
                <p className="card-id">{u.id}</p>
                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-item-label">Género</span>
                    <span className="meta-item-val">{GENERO_MAP[u.genero || ""] || "—"}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-item-label">Actualizado</span>
                    <span className="meta-item-val">{new Date(u.updated_at).toLocaleDateString("es", { day: "2-digit", month: "short" })}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => setEditingUser(u)}>✏️ Editar</button>
                  <button className="btn-del" onClick={() => setConfirmDelId(u.id)} title="Eliminar">🗑️</button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pag-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="pag-info">{page} / {totalPages}</span>
              {[...Array(totalPages)].map((_, i) => i + 1).filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages).reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, []).map((p, i) => typeof p === "string" ? (
                <span key={i} className="pag-info">…</span>
              ) : (
                <button key={p} className={`pag-btn${page === p ? " active" : ""}`} onClick={() => setPage(p as number)}>{p}</button>
              ))}
              <button className="pag-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* ── EDIT MODAL ── */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Editar Perfil</h2>
            <form onSubmit={handleSave}>
              {err && <div className="err-banner" style={{ marginBottom: "1rem" }}>⚠ {err}</div>}

              <div className="field-grid-2" style={{ marginBottom: "1rem" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Nombre</label>
                  <input value={editingUser.nombre || ""} onChange={e => setEditingUser({ ...editingUser, nombre: e.target.value })} placeholder="Nombre" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Apellido</label>
                  <input value={editingUser.apellido || ""} onChange={e => setEditingUser({ ...editingUser, apellido: e.target.value })} placeholder="Apellido" />
                </div>
              </div>

              <div className="field">
                <label>Género</label>
                <select value={editingUser.genero || "NR"} onChange={e => setEditingUser({ ...editingUser, genero: e.target.value })}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="NB">No binario / Otro</option>
                  <option value="NR">Prefiero no decirlo</option>
                </select>
              </div>

              <div className="field">
                <label>Rol del sistema</label>
                <div className="role-selector">
                  {(["estudiante", "profesor", "admin"] as const).map(r => (
                    <div
                      key={r}
                      className={`role-opt${editingUser.role === r ? ` selected-${r}` : ""}`}
                      onClick={() => setEditingUser({ ...editingUser, role: r })}
                    >
                      <span className="role-opt-icon">{r === "admin" ? "⚡" : r === "profesor" ? "📖" : "🎓"}</span>
                      <span className="role-opt-label">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Avatar</label>
                <div className="avatar-grid">
                  {Object.entries(AVATAR_EMOJI).map(([id, em]) => (
                    <div
                      key={id}
                      className={`av-opt${editingUser.avatar_id === +id ? " sel" : ""}`}
                      onClick={() => setEditingUser({ ...editingUser, avatar_id: +id })}
                    >{em}</div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-sm-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="btn-sm-primary" disabled={saving}>
                  {saving ? "Guardando…" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelId && (
        <ConfirmDialog
          message="¿Eliminar este perfil permanentemente? Esta acción no se puede deshacer y revocará el acceso del usuario."
          onCancel={() => setConfirmDelId(null)}
          onConfirm={() => handleDelete(confirmDelId)}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </div>
  );
}