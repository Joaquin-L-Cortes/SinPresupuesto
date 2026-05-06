"use client";
// components/MaterialDropdown.tsx
// Panel desplegable al hacer hover sobre "Material" en el nav.
// Mismo estilo visual que el SectionsGrid del inicio.
import { useRouter, usePathname } from "next/navigation";
import classroomData from "@/content/classroom_data.json";

const TOPIC_ICONS: Record<string, string> = {
  "I.":   "⚡",  "II.":  "📋",  "III.": "📑",  "IV.":  "🌟",  "V.":   "📝",
  "VI.":  "📐",  "VII.": "⚛️",  "VIII.":"🧪",  "IX.":  "🔬",  "X.":   "🌍",
  "XI.":  "🖼️", "XII.": "📚",  "XIII.":"📊",  "XIV.": "🎬",  "XV.":  "🎯",
};

function numeral(name: string) { return name.split(".")[0] + "."; }
function topicIcon(name: string) { return TOPIC_ICONS[numeral(name)] || "📁"; }
function isActive(name: string) { return name.includes("Curso Activo"); }
function cleanName(name: string) {
  return name.replace(/^[IVX]+\.\s*/, "").replace(/\s*\(Curso Activo\)\s*/g, "").trim();
}

interface Props {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onSelect: () => void;
}

export function MaterialDropdown({ onMouseEnter, onMouseLeave, onSelect }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const topics = (classroomData as any).topics   as { id: string; name: string }[];
  const mats   = (classroomData as any).materials as { topicId: string; materials?: unknown[] }[];

  const fileCount: Record<string, number> = {};
  for (const m of mats) {
    const files = (m.materials as any[])?.length || 0;
    fileCount[m.topicId] = (fileCount[m.topicId] || 0) + files;
  }

  function handleSelect(topicId: string) {
    onSelect();
    const hash = `#sec-${topicId}`;
    if (pathname === "/materiales") {
      // Already on the page: update hash + dispatch hashchange so the listener fires
      window.history.pushState(null, "", `/materiales${hash}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      router.push(`/materiales${hash}`);
    }
  }

  return (
    <div
      className="mat-dropdown"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      aria-label="Secciones de material"
    >
      <div className="mat-dropdown-header">
        <span className="mat-dropdown-title">📂 Secciones de material</span>
        <a href="/materiales" className="mat-dropdown-all" onClick={onSelect}>
          Ver todo →
        </a>
      </div>
      <div className="mat-dropdown-grid">
        {topics.map(t => {
          const num    = numeral(t.name);
          const active = isActive(t.name);
          const count  = fileCount[t.id] || 0;

          return (
            <button
              key={t.id}
              className={`mat-dd-card${active ? " mat-dd-card--active" : ""}`}
              onClick={() => handleSelect(t.id)}
              role="menuitem"
            >
              {active && <span className="mat-dd-badge">Activo</span>}
              <span className="mat-dd-icon">{topicIcon(t.name)}</span>
              <div className="mat-dd-body">
                <div className="mat-dd-num">{num}</div>
                <div className="mat-dd-name">{cleanName(t.name)}</div>
                {count > 0 && <div className="mat-dd-count">{count} archivos</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
