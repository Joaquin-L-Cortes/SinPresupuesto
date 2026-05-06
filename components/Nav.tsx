"use client";
// components/Nav.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth, getAvatar, getEmoji } from "@/lib/auth-context";
import { AuthModal } from "@/components/AuthModal";
import { AvanceModal } from "@/components/AvanceModal";
import { MaterialDropdown } from "@/components/MaterialDropdown";
import dynamic from "next/dynamic";
import classroomData from "@/content/classroom_data.json";
import navDataDefault from "@/content/nav.json";
import { getSupabase } from "@/lib/supabase";

// LibretaModal cargado solo en el cliente
const LibretaModal = dynamic(
  () => import("@/components/LibretaModal").then(m => ({ default: m.LibretaModal })),
  { ssr: false, loading: () => null }
);

// ─── Botón de avance con batería ──────────────────────────
function AvanceNavBtn({
  pct,
  fillColor,
  onClick,
}: {
  pct: number;
  fillColor: string;
  onClick: () => void;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    function check() { setCompact(window.innerWidth <= 640); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const pctLabel = String(pct).padStart(2, "0") + " %";
  const fillW = Math.max(pct, pct > 0 ? 4 : 0);

  const battery = (
    <span style={{
      position: "relative", display: "inline-flex", alignItems: "center",
      width: 26, height: 13, flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", inset: 0,
        border: `2px solid ${fillColor}`, borderRadius: 3,
      }} />
      <span style={{
        position: "absolute", right: -4, top: "50%",
        transform: "translateY(-50%)", width: 3, height: 6,
        background: fillColor, borderRadius: "0 2px 2px 0",
      }} />
      <span style={{
        position: "absolute", left: 2, top: 2, bottom: 2,
        width: `calc(${fillW}% - 4px + ${fillW / 100}*18px)`,
        maxWidth: 18, minWidth: 0,
        background: fillColor, borderRadius: 1.5,
        transition: "width .5s ease", opacity: 0.9,
      }} />
    </span>
  );

  return (
    <button className="nav-btn-lg nav-btn-avance" onClick={onClick} title="Mi avance"
      style={{
        color: fillColor, borderColor: fillColor,
        background: fillColor + "18", minWidth: compact ? "unset" : "5.5rem", justifyContent: "center"
      }}>
      {compact
        ? <span style={{
          fontVariantNumeric: "tabular-nums", fontWeight: 700,
          fontSize: ".78rem"
        }}>{pctLabel}</span>
        : <span style={{ display: "inline-flex", alignItems: "center", gap: ".45rem" }}>
          {battery}
          <span style={{
            fontVariantNumeric: "tabular-nums", fontWeight: 600,
            fontSize: ".78rem"
          }}>{pctLabel}</span>
        </span>
      }
    </button>
  );
}

// ─── Calcular total de archivos desde classroom_data ──────
const NAV_TOTAL_FILES = (() => {
  try {
    const mats = (classroomData as any).materials as any[];
    return mats.reduce((s: number, m: any) => s + ((m.materials || []).length || 1), 0);
  } catch { return 80; }
})();

// ─── Hook: porcentaje global ────────────
function useGlobalPct(uid: string | null) {
  const [pct, setPct] = useState(0);

  const calcLocal = useCallback(() => {
    try {
      const raw = localStorage.getItem("sp-seen");
      if (!raw) return 0;
      const seen: Record<string, string[]> = JSON.parse(raw);
      const total = Object.values(seen).reduce((s, a) => s + a.length, 0);
      return NAV_TOTAL_FILES > 0 ? Math.round((total / NAV_TOTAL_FILES) * 100) : 0;
    } catch { return 0; }
  }, []);

  useEffect(() => {
    async function loadFromSupabase(userId: string) {
      try {
        const sb = getSupabase();
        const { data: profile } = await sb.from("profiles").select("progress").eq("id", userId).single();
        if (!profile?.progress) { setPct(calcLocal()); return; }

        let seenCount = 0;
        const prog = profile.progress as Record<string, string[]>;
        Object.values(prog).forEach(seen => {
          seenCount += seen.length;
        });

        const computed = NAV_TOTAL_FILES > 0 ? Math.round((seenCount / NAV_TOTAL_FILES) * 100) : 0;
        setPct(Math.max(computed, calcLocal()));
      } catch { setPct(calcLocal()); }
    }

    if (uid) loadFromSupabase(uid);
    else setPct(calcLocal());

    function onUpdate() { setPct(calcLocal()); }
    window.addEventListener("sp-progress-update", onUpdate);
    return () => window.removeEventListener("sp-progress-update", onUpdate);
  }, [uid, calcLocal]);

  return pct;
}


// ─── Hook: notificaciones no leidas ─────────────────────────
function useUnreadNotifications(uid: string | null) {
  const [count, setCount] = useState(0);
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    // Leer el timestamp de la última vez que se vieron las notificaciones
    try {
      const stored = localStorage.getItem("sp-notif-seen");
      if (stored) setLastSeen(parseInt(stored, 10));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Firebase Notifications Disabled
    setCount(0);
  }, [uid]);

  function markAllRead() {
    const now = Date.now();
    setLastSeen(now);
    setCount(0);
    try { localStorage.setItem("sp-notif-seen", String(now)); } catch { /* ignore */ }
  }

  return { unreadCount: count, markAllRead };
}

// ─── Toast component ─────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => setVisible(false), 2800);
    const t3 = setTimeout(onDone, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed",
      bottom: 24, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
      opacity: visible ? 1 : 0,
      transition: "opacity .35s ease, transform .35s ease",
      zIndex: 9999,
      background: "var(--bg)",
      border: "1.5px solid var(--border)",
      borderRadius: 10,
      padding: ".55rem 1.1rem",
      fontSize: ".88rem", fontWeight: 600,
      color: "var(--fg)",
      boxShadow: "0 4px 20px #0003",
      pointerEvents: "none", whiteSpace: "nowrap", maxWidth: "90vw",
    }}>
      {message}
    </div>
  );
}

export function Nav({ activeHref }: { activeHref?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref ?? pathname;
  const { user, profile } = useAuth();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [authOpen, setAuthOpen] = useState(false);
  const [libretaOpen, setLibretaOpen] = useState(false);
  const [avanceOpen, setAvanceOpen] = useState(false);
  const [matOpen, setMatOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [navData, setNavData] = useState(navDataDefault);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  const matCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pct = useGlobalPct(user?.uid ?? null);
  const { unreadCount, markAllRead } = useUnreadNotifications(user?.uid ?? null);

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") ?? "light") as "light" | "dark";
    setTheme(t);
  }, []);

  useEffect(() => {
    function checkSize() { setIsSmall(window.innerWidth < 768); }
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Cerrar menú al navegar
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sp-theme", next);
    setTheme(next);
  }

  function openMat() { if (matCloseTimer.current) clearTimeout(matCloseTimer.current); setMatOpen(true); }
  function closeMat() { matCloseTimer.current = setTimeout(() => setMatOpen(false), 130); }
  function keepMat() { if (matCloseTimer.current) clearTimeout(matCloseTimer.current); }

  const av = profile ? getAvatar(profile.avatarId || 1) : null;
  const fillColor = av ? av.color : "var(--accent2)";
  const inicial1 = (profile?.nombre || "").charAt(0).toUpperCase();
  const inicial2 = (profile?.apellido || "").charAt(0).toUpperCase();
  const userName = profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() : "";

  return (
    <>
      <nav>
        <Link href="/" className="nav-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={(navData as any).logoSrc} alt={(navData as any).logoAlt} />
          {(navData as any).nombreSitio}
        </Link>

        {/* Nav links — ocultos en móvil, visibles desde tablet */}
        <ul className={`nav-links${menuOpen ? " nav-links--open" : ""}`}>
          {mounted && (profile?.role === "admin" || profile?.role === "profesor") && (
            <li>
              <Link href="/admin" className={active.startsWith("/admin") ? "active" : ""}
                onClick={() => setMenuOpen(false)}>
                ⚙️ Panel Admin
              </Link>
            </li>
          )}

          {((navData as any).links as any[]).map((link: any) => {
            const isMaterial = link.href === "/materiales" || link.label.toLowerCase().includes("material");
            const hasChildren = link.children && link.children.length > 0;
            
            if (isMaterial) {
              return (
                <li
                  key={link.id || link.href}
                  className="nav-mat-li"
                  onMouseEnter={!isSmall ? openMat : undefined}
                  onMouseLeave={!isSmall ? closeMat : undefined}
                >
                  <Link
                    href="/materiales"
                    className={`nav-mat-trigger${active === "/materiales" ? " active" : ""}${matOpen ? " open" : ""}`}
                    onClick={(e) => {
                      if (isSmall) {
                        e.preventDefault();
                        setMenuOpen(false);
                        window.location.href = "/materiales";
                      }
                    }}
                  >
                    {link.label}
                    {!isSmall && (
                      <span className="nav-mat-chevron" aria-hidden="true">
                        {matOpen ? "▲" : "▼"}
                      </span>
                    )}
                  </Link>
                  {!isSmall && matOpen && (
                    <MaterialDropdown
                      onMouseEnter={keepMat}
                      onMouseLeave={closeMat}
                      onSelect={() => { setMatOpen(false); setMenuOpen(false); }}
                    />
                  )}
                </li>
              );
            }

            if (hasChildren) {
              return (
                <li key={link.id || link.href} className="nav-item-has-children">
                  <div className="nav-link-with-sub">
                    <Link 
                      href={link.href} 
                      className={active === link.href ? "active" : ""}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                    <span className="nav-sub-chevron">▼</span>
                  </div>
                  <ul className="nav-submenu">
                    {link.children.map((child: any) => (
                      <li key={child.id || child.href}>
                        <Link href={child.href} onClick={() => setMenuOpen(false)}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }

            return (
              <li key={link.id || link.href}>
                <Link 
                  href={link.href} 
                  className={active === link.href ? "active" : ""}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="nav-right">
          {/* Tema: emoji solo en móvil, emoji+texto en desktop */}
          <button className="nav-btn-lg" onClick={toggleTheme} title="Cambiar tema">
            <span>{theme === "light" ? "🌙" : "☀️"}</span>
            {!isSmall && <span>{theme === "light" ? "Oscuro" : "Claro"}</span>}
          </button>

          {user && profile && (
            <button className="nav-btn-lg nav-btn-libreta" onClick={() => setLibretaOpen(true)}
              title="Libreta"
              style={{
                color: fillColor, borderColor: fillColor, background: fillColor + "12",
                minWidth: isSmall ? "unset" : "5.5rem", justifyContent: "center"
              }}>
              <span>📓</span>
              {!isSmall && <span>Libreta</span>}
            </button>
          )}

          {user && profile && (
            <AvanceNavBtn pct={pct} fillColor={fillColor} onClick={() => setAvanceOpen(true)} />
          )}

          {user && profile && av ? (
            <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
              <button
                className="nav-btn-lg"
                onClick={() => { setAuthOpen(true); markAllRead(); }}
                title="Mi perfil"
                style={{
                  background: av.bg, borderColor: av.color, color: av.color,
                  maxWidth: isSmall ? 80 : 140, overflow: "hidden",
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>{av.emoji}</span>
                {isSmall
                  ? <span style={{ fontWeight: 600, letterSpacing: ".03em" }}>{inicial1}{inicial2}</span>
                  : <span>{profile.nombre}</span>
                }
              </button>
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3,
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#e74c3c",
                  border: "2px solid var(--bg)",
                  pointerEvents: "none",
                  zIndex: 10,
                }} />
              )}
            </div>
          ) : (
            <button className="nav-btn-lg" onClick={() => setAuthOpen(true)}>
              {isSmall ? ((navData as any).botonIngresar as string).split(" ")[0] : (navData as any).botonIngresar}
            </button>
          )}

          {/* Botón hamburguesa — solo visible en móvil */}
          <button
            className={`nav-hamburger${menuOpen ? " nav-hamburger--open" : ""}`}
            onClick={() => setMenuOpen(p => !p)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Overlay oscuro al abrir menú móvil */}
      {menuOpen && (
        <div className="nav-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onToast={showToast} unreadCount={unreadCount} onMarkAllRead={markAllRead} />
      <LibretaModal open={libretaOpen} onClose={() => setLibretaOpen(false)} userName={userName} />
      <AvanceModal open={avanceOpen} onClose={() => setAvanceOpen(false)} />

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </>
  );
}
