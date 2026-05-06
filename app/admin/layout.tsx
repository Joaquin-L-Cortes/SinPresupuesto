"use client";

import Link from "next/link";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/admin", icon: "◈", label: "Dashboard", desc: "Resumen general" },
  { href: "/admin/cronograma", icon: "⊞", label: "Cronograma", desc: "Horarios de clases" },
  { href: "/admin/navigation", icon: "☶", label: "Navegación", desc: "Menú y enlaces" },
  { href: "/admin/site-config", icon: "⊙", label: "Configuración", desc: "SEO, footer, redes" },
  { href: "/admin/usuarios", icon: "⊕", label: "Comunidad", desc: "Usuarios y roles" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    // Si no hay perfil (ni siquiera el de la cookie), redirigir
    if (!profile) {
      router.replace("/");
      return;
    }

    // Si el rol es estudiante, denegar acceso
    if (profile.role === "estudiante") {
      alert("Acceso Denegado");
      router.replace("/");
    }
    
    // Nota: No comprobamos '!user' aquí porque al recargar puede tardar 
    // unos milisegundos más que el perfil de la cookie.
  }, [profile, authLoading, router]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (authLoading) return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg)", gap: "1rem" }}>
      <div className="spin-ring" />
      <p style={{ fontFamily: "'Syne', sans-serif", color: "var(--accent)", fontSize: "0.9rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Verificando Acceso</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-ring { width:36px;height:36px;border:2.5px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite; }`}</style>
    </div>
  );

  if (!user || !profile || profile.role === "estudiante") return null;

  const initials = ((profile.nombre || "A")[0] + (profile.apellido || "")[0]).toUpperCase() || "AD";

  return (
    <div className={`adm-shell${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --sb-w: 240px;
          --sb-w-col: 68px;
          --hdr-h: 60px;
          --font-display: 'Syne', sans-serif;
          --font-ui: 'DM Sans', sans-serif;
          --radius: 14px;
          --ease: cubic-bezier(.16,1,.3,1);
          --sidebar-bg: color-mix(in srgb, var(--bg2) 98%, var(--accent) 2%);
        }

        /* ── SHELL ── */
        .adm-shell { display: flex; min-height: 100vh; background: var(--bg); color: var(--fg); font-family: var(--font-ui); }

        /* ── SIDEBAR ── */
        .adm-sidebar {
          width: var(--sb-w);
          height: 100vh;
          position: fixed; left: 0; top: 0;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          z-index: 200;
          transition: width 0.3s var(--ease);
          overflow: hidden;
        }
        .adm-shell.collapsed .adm-sidebar { width: var(--sb-w-col); }

        /* brand */
        .sb-brand {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 1.25rem 1rem 1rem;
          border-bottom: 1px solid var(--border);
          text-decoration: none; overflow: hidden; flex-shrink: 0;
        }
        .sb-brand img { width: 32px; height: 32px; object-fit: contain; flex-shrink: 0; }
        .sb-brand-text { overflow: hidden; }
        .sb-brand-name { font-family: Fraunces, serif; font-weight: 700; font-size: 1rem; color: var(--fg); white-space: nowrap; display: block; }
        .sb-brand-role { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); opacity: 0.8; display: block; }

        /* nav */
        .sb-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem 0.65rem; display: flex; flex-direction: column; gap: 2px; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

        .sb-nav-section { 
          font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--muted); padding: 0.85rem 0.5rem 0.35rem; white-space: nowrap;
          opacity: 1; transition: opacity 0.2s;
        }
        .adm-shell.collapsed .sb-nav-section { opacity: 0; }

        .sb-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.7rem 0.75rem; border-radius: 12px;
          text-decoration: none; color: var(--muted);
          font-size: 0.875rem; font-weight: 500;
          transition: all 0.18s; white-space: nowrap;
          position: relative; overflow: hidden;
        }
        .sb-link:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); color: var(--fg); }
        .sb-link.active {
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          color: var(--accent); font-weight: 600;
        }
        .sb-link.active::before {
          content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; background: var(--accent); border-radius: 0 3px 3px 0;
        }
        .sb-link-icon {
          font-size: 1.05rem; width: 22px; text-align: center; flex-shrink: 0;
          font-family: monospace; font-weight: 400; transition: transform 0.18s;
        }
        .sb-link:hover .sb-link-icon { transform: scale(1.15); }
        .sb-link-text { overflow: hidden; }
        .sb-link-label { display: block; font-size: 0.875rem; line-height: 1.2; }
        .sb-link-desc  { display: block; font-size: 0.67rem; color: var(--muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-link.active .sb-link-desc { color: color-mix(in srgb, var(--accent) 70%, transparent); }

        /* tooltip for collapsed */
        .adm-shell.collapsed .sb-link-text { opacity: 0; width: 0; }
        .adm-shell.collapsed .sb-nav-section { pointer-events: none; height: 0; padding: 0; overflow: hidden; }

        /* collapse toggle */
        .sb-toggle {
          margin: 0.65rem; padding: 0.65rem; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg);
          cursor: pointer; transition: all 0.18s; display: flex;
          align-items: center; justify-content: center; gap: 0.6rem;
          color: var(--muted); font-size: 0.8rem; font-weight: 500;
          font-family: var(--font-ui); flex-shrink: 0;
        }
        .sb-toggle:hover { border-color: var(--accent); color: var(--accent); }
        .sb-toggle-icon { transition: transform 0.3s var(--ease); font-size: 0.9rem; }
        .adm-shell.collapsed .sb-toggle-icon { transform: rotate(180deg); }

        /* footer */
        .sb-footer { padding: 0.75rem; border-top: 1px solid var(--border); flex-shrink: 0; }

        /* ── TOPBAR ── */
        .adm-topbar {
          height: var(--hdr-h);
          position: fixed; top: 0;
          left: var(--sb-w); right: 0;
          background: color-mix(in srgb, var(--bg) 88%, transparent);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 1.5rem; gap: 0.75rem;
          z-index: 150; transition: left 0.3s var(--ease);
        }
        .adm-shell.collapsed .adm-topbar { left: var(--sb-w-col); }

        .topbar-breadcrumb {
          flex: 1; display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.82rem; color: var(--muted);
        }
        .topbar-breadcrumb .crumb-sep { opacity: 0.35; }
        .topbar-breadcrumb .crumb-current { color: var(--fg); font-weight: 600; }

        .topbar-actions { display: flex; align-items: center; gap: 0.65rem; }

        .topbar-site-btn {
          display: flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.85rem; border-radius: 9px;
          border: 1px solid var(--border); background: var(--bg2);
          text-decoration: none; color: var(--muted);
          font-size: 0.75rem; font-weight: 600;
          transition: all 0.15s; font-family: var(--font-ui);
          letter-spacing: 0.03em;
        }
        .topbar-site-btn:hover { border-color: var(--accent); color: var(--accent); }

        .user-chip {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.35rem 0.75rem 0.35rem 0.35rem;
          border: 1px solid var(--border); border-radius: 999px;
          background: var(--bg2); cursor: default; transition: all 0.15s;
        }
        .user-chip:hover { border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
        .user-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #7c3aed));
          color: #fff; font-size: 0.7rem; font-weight: 700;
          display: grid; place-items: center;
          font-family: var(--font-display);
        }
        .user-chip-info { line-height: 1.2; }
        .user-chip-name { font-size: 0.78rem; font-weight: 600; color: var(--fg); }
        .user-chip-role { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }

        /* mobile hamburger */
        .mobile-menu-btn {
          display: none; width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid var(--border); background: var(--bg2);
          cursor: pointer; align-items: center; justify-content: center;
          font-size: 1rem; color: var(--fg); transition: all 0.15s;
        }
        .mobile-menu-btn:hover { border-color: var(--accent); }

        /* mobile overlay */
        .sidebar-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          z-index: 190;
        }

        /* ── CONTENT ── */
        .adm-content {
          flex: 1;
          margin-left: var(--sb-w);
          margin-top: var(--hdr-h);
          min-height: calc(100vh - var(--hdr-h));
          padding: 2.5rem 2rem;
          transition: margin-left 0.3s var(--ease);
          background: var(--bg);
        }
        .adm-shell.collapsed .adm-content { margin-left: var(--sb-w-col); }

        /* ── SHARED ADMIN STYLES ── */
        .admin-topbar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap;
        }
        .admin-page-title {
          font-family: Fraunces, serif; font-size: 1.7rem; font-weight: 700;
          color: var(--fg); display: flex; align-items: center; gap: 0.75rem; margin: 0;
        }
        .admin-page-title span {
          font-family: var(--font-ui); font-size: 0.72rem; font-weight: 600;
          color: var(--muted); background: var(--bg2);
          padding: 0.2rem 0.65rem; border-radius: 999px; border: 1px solid var(--border);
        }

        .admin-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 20px; padding: 1.5rem; overflow: hidden;
        }

        .admin-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .admin-table th {
          text-align: left; padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border);
          color: var(--muted); font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; font-size: 0.65rem;
        }
        .admin-table td { padding: 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .admin-table tr:last-child td { border-bottom: none; }
        .admin-table tr:hover td { background: color-mix(in srgb, var(--accent) 3%, transparent); }

        /* Shared buttons */
        .btn-primary, .btn-secondary, .btn-danger {
          font-family: var(--font-ui); font-weight: 600; font-size: 0.84rem;
          padding: 0.6rem 1.2rem; border-radius: 11px; cursor: pointer;
          transition: all 0.15s; border: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
        }
        .btn-primary  { background: var(--accent); color: #fff; }
        .btn-primary:hover  { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 30%, transparent); }
        .btn-secondary { background: var(--bg2); color: var(--fg); border: 1px solid var(--border); }
        .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
        .btn-danger { background: color-mix(in srgb, #f87171 10%, transparent); color: #f87171; border: 1px solid color-mix(in srgb, #f87171 25%, transparent); }
        .btn-danger:hover { background: #f87171; color: #fff; }

        .form-row { margin-bottom: 1.4rem; }
        .form-row label { display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: var(--muted); margin-bottom: 0.4rem; letter-spacing: 0.1em; }

        .content-area input, .content-area textarea, .content-area select,
        .modal-box input, .modal-box textarea, .modal-box select {
          width: 100%; background: var(--bg); border: 1px solid var(--border);
          border-radius: 11px; padding: 0.65rem 0.9rem;
          color: var(--fg); font-family: var(--font-ui); font-size: 0.875rem;
          outline: none; transition: all 0.15s;
        }
        .content-area input:focus, .content-area textarea:focus, .content-area select:focus,
        .modal-box input:focus, .modal-box textarea:focus, .modal-box select:focus {
          border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
        }

        .modal-backdrop {
          position: fixed; inset: 0;
          background: color-mix(in srgb, var(--bg) 70%, transparent);
          backdrop-filter: blur(10px);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; animation: bkFade 0.18s ease;
        }
        .modal-box {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: 24px; padding: 2rem;
          width: 100%; max-width: 560px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.3);
          animation: boxUp 0.22s cubic-bezier(.16,1,.3,1);
        }
        .modal-box h3 { font-family: var(--font-display); font-size: 1.5rem; margin: 0 0 1.5rem; color: var(--fg); }
        .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.75rem; padding-top: 1rem; border-top: 1px solid var(--border); }

        @keyframes bkFade { from { opacity:0 } to { opacity:1 } }
        @keyframes boxUp  { from { transform: translateY(12px); opacity:0 } to { transform: translateY(0); opacity:1 } }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .adm-sidebar { transform: translateX(-100%); width: var(--sb-w) !important; transition: transform 0.3s var(--ease); }
          .adm-shell.mobile-open .adm-sidebar { transform: translateX(0); }
          .adm-shell.mobile-open .sidebar-overlay { display: block; }
          .adm-topbar { left: 0 !important; }
          .adm-content { margin-left: 0 !important; padding: 1.5rem 1rem; }
          .mobile-menu-btn { display: flex !important; }
          .sb-toggle { display: none; }
        }

        @media (max-width: 500px) {
          .adm-content { padding: 1rem 0.75rem; }
          .topbar-breadcrumb { display: none; }
        }
      `}} />

      {/* ── MOBILE OVERLAY ── */}
      <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <Link href="/" className="sb-brand">
          <img src="/logos/logo-sp.svg" alt="Logo" />
          <div className="sb-brand-text">
            <span className="sb-brand-name">SinPresupuesto</span>
            <span className="sb-brand-role">Panel Admin</span>
          </div>
        </Link>

        <nav className="sb-nav">
          <div className="sb-nav-section">Navegación</div>
          {NAV_ITEMS.map(item => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`sb-link${isActive ? " active" : ""}`}>
                <span className="sb-link-icon">{item.icon}</span>
                <span className="sb-link-text">
                  <span className="sb-link-label">{item.label}</span>
                  <span className="sb-link-desc">{item.desc}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <button className="sb-toggle" onClick={() => setCollapsed(c => !c)}>
          <span className="sb-toggle-icon">←</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", fontFamily: "var(--font-ui)" }}>Colapsar</span>
        </button>

        <div className="sb-footer">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* ── TOPBAR ── */}
      <header className="adm-topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>

        <div className="topbar-breadcrumb">
          <span>Admin</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">
            {NAV_ITEMS.find(i => i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href))?.label || "Panel"}
          </span>
        </div>

        <div className="topbar-actions">
          <ThemeToggle />
          <Link href="/" className="topbar-site-btn">↗ Sitio Web</Link>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-chip-info">
              <div className="user-chip-name">{profile.nombre || "Administrador"}</div>
              <div className="user-chip-role">{profile.role}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="adm-content content-area">
        {children}
      </main>
    </div>
  );
}