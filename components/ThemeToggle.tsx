"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const t = (document.documentElement.getAttribute("data-theme") ?? "light") as "light" | "dark";
    setTheme(t);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sp-theme", next);
    setTheme(next);
  }

  return (
    <button 
      onClick={toggleTheme} 
      title="Cambiar tema"
      style={{
        background: 'none',
        border: '1.5px solid var(--border)',
        color: 'var(--muted)',
        borderRadius: '20px',
        padding: '0.4rem 0.8rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent2)';
        e.currentTarget.style.color = 'var(--accent2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--muted)';
      }}
    >
      <span>{theme === "light" ? "🌙" : "☀️"}</span>
      <span>{theme === "light" ? "Oscuro" : "Claro"}</span>
    </button>
  );
}
