"use client";
// components/RecentMaterials.tsx
// Materiales sugeridos: aleatorios de classroom_data (Firebase deshabilitado).
import { useEffect, useState } from "react";
import classroomData from "@/content/classroom_data.json";

interface FileMat { type: string; title: string; url: string; }
interface RawMat {
  id: string; title: string; topicId: string; alternateLink: string;
  materials: FileMat[];
}
export interface FlatFile {
  fileUrl: string; fileTitle: string; fileType: string;
  topicName: string; matTitle: string; file: FileMat;
}

const MAX_RECENT = 6;

const cdTopics = (classroomData as any).topics as {id:string;name:string}[];
const cdMats   = (classroomData as any).materials as RawMat[];
const topicById: Record<string,string> = {};
for (const t of cdTopics) topicById[t.id] = t.name;

const ALL_FILES: FlatFile[] = [];
for (const m of cdMats) {
  const topicName = topicById[m.topicId] || "";
  for (const f of m.materials || []) {
    if (f.url && !f.url.includes("drive/folders")) {
      ALL_FILES.push({
        fileUrl: f.url, fileTitle: f.title || m.title, fileType: f.type,
        topicName, matTitle: m.title, file: f,
      });
    }
  }
}

export async function trackRecentFile(
  _uid: string | null,
  _fileUrl: string,
  _fileTitle: string,
  _fileType: string,
  _topicName: string,
  _matTitle: string,
) {
  // Placeholder — pendiente migrar persistencia de recientes a Supabase
}

export function RecentMaterials() {
  const [items, setItems] = useState<FlatFile[]>([]);

  useEffect(() => {
    // Por ahora mostramos 6 aleatorios mientras se migra la persistencia de recientes a Supabase
    const shuffled = [...ALL_FILES].sort(() => 0.5 - Math.random());
    setItems(shuffled.slice(0, MAX_RECENT));
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="sections-wrap">
      <div className="sections-label">⚡ Materiales sugeridos</div>
      <div className="sections-grid">
        {items.map((flat, i) => (
          <a
            key={flat.fileUrl + i}
            href={flat.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="section-card"
            style={{textDecoration:"none", border:"1.5px solid var(--border)", textAlign:"left", width:"100%", background:"var(--card)"}}
          >
            <span style={{fontSize:"1.6rem", flexShrink:0}}>📄</span>
            <div style={{minWidth:0}}>
              <div className="section-card-num">{flat.topicName.split(".")[0]}.</div>
              <div className="section-card-title" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{flat.fileTitle}</div>
              <div className="section-card-count">{flat.matTitle}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
