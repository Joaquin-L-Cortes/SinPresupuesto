// components/SectionsGrid.tsx
"use client";
import Link from "next/link";
import classroomData from "@/content/classroom_data.json";

const TOPIC_ICONS: Record<string, string> = {
  "I.":"⚡","II.":"📋","III.":"📑","IV.":"🌟","V.":"📝",
  "VI.":"📐","VII.":"⚛️","VIII.":"🧪","IX.":"🔬","X.":"🌍",
  "XI.":"🖼️","XII.":"📚","XIII.":"📊","XIV.":"🎬","XV.":"🎯",
};

export function SectionsGrid() {
  const topics  = (classroomData as any).topics as { id: string; name: string }[];
  const mats    = (classroomData as any).materials as any[];

  const count: Record<string, number> = {};
  for (const m of mats) count[m.topicId] = (count[m.topicId] || 0) + 1;

  const sections = topics.map(t => ({
    id:    t.id,
    name:  t.name,
    total: count[t.id] || 0,
  }));

  const numeral = (name: string) => name.split(".")[0] + ".";

  return (
    <div className="sections-wrap">
      <div className="sections-label">📂 Secciones de material</div>
      <div className="sections-grid">
        {sections.map(sec => {
          const num = numeral(sec.name);
          return (
            <Link key={sec.id} href={`/materiales#sec-${sec.id}`} className="section-card">
              <span style={{fontSize:"1.6rem",flexShrink:0}}>{TOPIC_ICONS[num] || "📁"}</span>
              <div>
                <div className="section-card-num">{num}</div>
                <div className="section-card-title">{sec.name.replace(/^[IVX]+\.\s*/,"")}</div>
                {sec.total > 0 && <div className="section-card-count">{sec.total} archivos</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
