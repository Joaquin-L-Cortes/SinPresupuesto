"use client";
// components/SinPesito.tsx — chatbot flotante con preview de materiales integrado
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/AuthModal";
import classroomData from "@/content/classroom_data.json";
import { trackRecentFile } from "@/components/RecentMaterials";

const AI_URL = "https://sinpresito-ai.jocortesca.workers.dev/ai";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FileMat { type: string; title: string; url: string; }
interface SuggestedMaterial {
  nombre: string;
  tipo: string;
  categoria: string;
  asignatura: string;
  seccion: string;
  url: string;
  score: number;
}

// ─── classroom_data helpers (mirrors MaterialesClient logic) ──────────────────
const cdTopics   = (classroomData as any).topics   as {id:string;name:string}[];
const cdMats     = (classroomData as any).materials as {
  id:string; title:string; topicId:string; alternateLink:string;
  materials: FileMat[];
}[];

const topicById: Record<string,{id:string;name:string}> = {};
for (const t of cdTopics) topicById[t.id] = t;

/** Map every individual file URL → {file, mat, topic} */
const urlToEntry: Record<string, {file:FileMat; matTitle:string; matAlt:string; topicId:string; topicName:string}> = {};
for (const m of cdMats) {
  const topic = topicById[m.topicId];
  for (const f of m.materials || []) {
    urlToEntry[f.url] = {
      file: f,
      matTitle: m.title,
      matAlt: m.alternateLink,
      topicId: m.topicId,
      topicName: topic?.name ?? "",
    };
  }
}

// ─── Acceso rápido por asignatura (chips en bienvenida del chat) ──────────────
const QUICK_SUBJECTS: { label: string; emoji: string; query: string }[] = [
  { label: "Física",      emoji: "⚡", query: "Módulos teóricos de Física" },
  { label: "Matemáticas", emoji: "📐", query: "Material de Matemáticas" },
  { label: "Química",     emoji: "🧪", query: "Módulos teóricos de Química" },
  { label: "Biología",    emoji: "🧬", query: "Material de Biología" },
  { label: "Sociales",    emoji: "🌎", query: "Material de Sociales" },
  { label: "Análisis",    emoji: "📖", query: "Material de Análisis Textual" },
];

/** Detecta el tipo de un material a partir de su URL y título */
function detectFileType(url: string, title: string): string {
  const u = url.toLowerCase();
  const t = title.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("forms.gle") || u.includes("docs.google.com/forms")) return "form";
  if (u.includes("drive/folders") || u.includes("drive.google.com/drive/folders")) return "folder";
  if (t.endsWith(".jpg") || t.endsWith(".jpeg") || t.endsWith(".png") || t.endsWith(".gif") || t.endsWith(".webp")) return "image";
  if (t.endsWith(".xlsx") || t.endsWith(".xls")) return "excel";
  if (t.endsWith(".pptx") || t.endsWith(".ppt")) return "ppt";
  if (u.includes("docs.google.com/presentation") || u.includes("/presentation/d/")) return "ppt";
  if (u.includes("docs.google.com/spreadsheets") || u.includes("/spreadsheets/d/")) return "excel";
  if (u.includes("docs.google.com/document") || u.includes("/document/d/")) return "doc";
  // Para archivos en drive/file/d/ usamos la extensión del título
  if (u.includes("drive.google.com/file/d/") || u.includes("/file/d/")) {
    if (t.endsWith(".pdf")) return "pdf";
    if (t.endsWith(".jpg") || t.endsWith(".jpeg") || t.endsWith(".png")) return "image";
    if (t.endsWith(".pptx") || t.endsWith(".ppt")) return "ppt";
    if (t.endsWith(".xlsx") || t.endsWith(".xls")) return "excel";
  }
  return "drive";
}

function drivePreviewUrl(url: string, fileType?: string): string | null {
  // Carpetas de Drive — no tienen preview embebible
  if (url.includes("drive/folders") || url.includes("drive.google.com/drive/folders")) return null;
  const fm = url.match(/\/file\/d\/([\w-]+)/);
  if (fm) return `https://drive.google.com/file/d/${fm[1]}/preview`;
  const doc = url.match(/\/document\/d\/([\w-]+)/);
  if (doc) return `https://docs.google.com/document/d/${doc[1]}/preview`;
  const sh = url.match(/\/spreadsheets\/d\/([\w-]+)/);
  if (sh) return `https://docs.google.com/spreadsheets/d/${sh[1]}/preview`;
  const sl = url.match(/\/presentation\/d\/([\w-]+)/);
  if (sl) return `https://docs.google.com/presentation/d/${sl[1]}/preview`;
  return null;
}

function getPreviewUrl(f: FileMat): string | null {
  const detectedType = f.type || detectFileType(f.url, f.title);
  if (detectedType === "youtube") {
    const m = f.url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1`;
    // Playlists de YouTube
    const pl = f.url.match(/[?&]list=([\w-]+)/);
    if (pl) return `https://www.youtube.com/embed/videoseries?list=${pl[1]}`;
    return null;
  }
  if (detectedType === "form") return f.url;
  if (detectedType === "folder") return null; // carpetas no tienen preview
  if (detectedType === "image") {
    // Imágenes de Drive se pueden mostrar directamente
    const fm = f.url.match(/\/file\/d\/([\w-]+)/);
    if (fm) return `https://drive.google.com/uc?export=view&id=${fm[1]}`;
    return f.url;
  }
  return drivePreviewUrl(f.url, detectedType);
}

function fileIcon(f: FileMat) {
  const detectedType = f.type || detectFileType(f.url, f.title);
  if (detectedType === "youtube") return "▶️";
  if (detectedType === "form") return "📋";
  if (detectedType === "folder") return "📁";
  if (detectedType === "image") return "🖼️";
  if (detectedType === "excel") return "📊";
  if (detectedType === "ppt") return "📑";
  if (detectedType === "pdf") return "📄";
  // Fallback por URL/título
  const u = f.url || ""; const t = (f.title || "").toLowerCase();
  if (u.includes("folder") || u.includes("drive/folders")) return "📁";
  if (t.endsWith(".xlsx") || t.endsWith(".xls")) return "📊";
  if (t.endsWith(".pptx") || t.endsWith(".ppt")) return "📑";
  if (t.endsWith(".jpg") || t.endsWith(".png") || t.endsWith(".jpeg")) return "🖼️";
  return "📄";
}

// ─── Simple markdown for bot prose (not material cards) ───────────────────────
function parseProse(text: string): string {
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    // Bullet lines → styled list items
    .replace(/^[-•*]\s+(.+)$/gm, '<span style="display:block;padding-left:0.9rem;position:relative"><span style="position:absolute;left:0.2rem">·</span>$1</span>')
    .replace(/^(\d+)[.)\s]+(.+)$/gm, '<span style="display:block;padding-left:0.9rem;position:relative"><span style="position:absolute;left:0.1rem">$1.</span>$2</span>')
    .replace(/\n\n/g,"<br/>")
    .replace(/\n/g,"<br/>");
}

// ─── Full preview modal — same as MaterialesClient ────────────────────────────
function ChatPreviewModal({
  file, matTitle, topicName, onClose
}: {
  file: FileMat; matTitle: string; topicName: string; onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const pUrl = getPreviewUrl(file);
  const detectedType = file.type || detectFileType(file.url, file.title);
  const isFolder = detectedType === "folder" || file.url.includes("drive/folders");

  useEffect(() => {
    setLoading(true);
    setIsFullscreen(false);
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [file, onClose]);

  return (
    <div
      className="modal-backdrop open"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className={`modal-window${isFullscreen ? " is-fullscreen" : ""}`}>
        {/* chrome bar */}
        <div className="modal-chrome">
          <div className="modal-dots">
            <div className="modal-dot" style={{background:"#ff5f57",cursor:"pointer"}} onClick={onClose} />
            <div className="modal-dot" style={{background:"#febc2e"}} />
            <div className="modal-dot" style={{background:"#28c840"}} />
          </div>
          <div className="modal-url">{file.url.replace("https://","")}</div>
          <button className="btn-close-modal" onClick={onClose} title="Cerrar">✕</button>
        </div>
        {/* info bar */}
        <div className="modal-info">
          <div className="mi-icon">{fileIcon(file)}</div>
          <div className="mi-body">
            <div className="mi-name">{file.title || matTitle}</div>
            <div className="mi-meta">{topicName}</div>
          </div>
          <button
            className="btn-expand-preview"
            onClick={() => setIsFullscreen(p => !p)}
            title={isFullscreen ? "Reducir tamaño" : "Expandir"}
          >
            {isFullscreen ? "↙ Reducir" : "↗ Expandir"}
          </button>
          <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-drive">↗ Abrir</a>
        </div>
        {/* iframe area */}
        <div className="modal-iframe-wrap">
          {isFolder ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:"1rem",color:"var(--muted)"}}>
              <span style={{fontSize:"2rem"}}>📁</span>
              <p>Esta es una carpeta de Google Drive.</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-drive">↗ Abrir en Drive</a>
            </div>
          ) : pUrl ? (
            <>
              <div className={`modal-iframe-loading${loading ? "" : " hidden"}`}>
                <span style={{fontSize:"1.5rem"}}>⏳</span> Cargando…
              </div>
              <iframe src={pUrl} title={file.title || matTitle} allowFullScreen onLoad={() => setLoading(false)} />
            </>
          ) : (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:"1rem",color:"var(--muted)"}}>
              <p>Vista previa no disponible.</p>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn-drive">↗ Abrir en nueva pestaña</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Material chip / card rendered in chat ────────────────────────────────────
function MaterialChip({
  mat, uid, onPreview
}: {
  mat: SuggestedMaterial;
  uid: string | null;
  onPreview: (file: FileMat, matTitle: string, topicName: string) => void;
}) {
  const entry = urlToEntry[mat.url];

  function handleClick() {
    if (entry) {
      trackRecentFile(uid, entry.file.url, entry.file.title || entry.matTitle, entry.file.type, entry.topicName, entry.matTitle);
      onPreview(entry.file, entry.matTitle, entry.topicName);
    } else {
      // fallback: synthetic FileMat con detección automática de tipo
      const detectedType = detectFileType(mat.url, mat.nombre);
      const syntheticFile: FileMat = {
        type: detectedType,
        title: mat.nombre,
        url: mat.url,
      };
      trackRecentFile(uid, mat.url, mat.nombre, detectedType, mat.seccion, mat.nombre);
      onPreview(syntheticFile, mat.nombre, mat.seccion);
    }
  }

  const icon = entry ? fileIcon(entry.file)
    : fileIcon({ type: detectFileType(mat.url, mat.nombre), title: mat.nombre, url: mat.url });

  return (
    <button className="sp-mat-chip" onClick={handleClick} title={`Ver: ${mat.nombre}`}>
      <span className="sp-mat-chip-icon">{icon}</span>
      <div className="sp-mat-chip-body">
        <div className="sp-mat-chip-name">{mat.nombre}</div>
        <div className="sp-mat-chip-meta">{mat.asignatura} · {mat.categoria}</div>
      </div>
      <span className="sp-mat-chip-arrow">›</span>
    </button>
  );
}

// ─── Message type ─────────────────────────────────────────────────────────────
interface Msg {
  role: "user" | "bot";
  text: string;
  materials?: SuggestedMaterial[];
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SinPesito() {
  const { user }  = useAuth();
  const router    = useRouter();
  const [open, setOpen]           = useState(false);
  const [msgs, setMsgs]           = useState<Msg[]>([]);
  const [inp,  setInp]            = useState("");
  const [busy, setBusy]           = useState(false);
  const [authOpen, setAuthOpen]   = useState(false);
  const [preview, setPreview]     = useState<{file:FileMat;matTitle:string;topicName:string}|null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const history = useRef<{role:string;content:string}[]>([]);

  // Envío rápido por chip de asignatura
  const sendQuick = useCallback((query: string) => {
    setInp(query);
    setTimeout(() => {
      (document.getElementById("sp-inp") as HTMLInputElement | null)?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs]);

  async function send() {
    const q = inp.trim();
    if (!q || busy) return;
    if (!user) { setAuthOpen(true); return; }
    setInp("");
    setMsgs(p => [...p, {role:"user", text:q}]);
    history.current.push({ role:"user", content:q });
    setBusy(true);
    try {
      const res = await fetch(AI_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ message:q, history: history.current.slice(-6) }),
      });
      const data = await res.json() as any;
      let reply     = data.reply     || "Sin respuesta.";
      let materials: SuggestedMaterial[] = data.materials || [];

      // ── Fallback: si el worker no devuelve materials[], intenta extraerlos
      // del texto buscando URLs conocidas en urlToEntry
      if (materials.length === 0) {
        const foundUrls = new Set<string>();
        for (const url of Object.keys(urlToEntry)) {
          if (reply.includes(url)) foundUrls.add(url);
        }
        if (foundUrls.size > 0) {
          materials = Array.from(foundUrls).slice(0, 5).map(url => {
            const e = urlToEntry[url];
            return {
              nombre:     e.file.title || e.matTitle,
              tipo:       e.file.type,
              categoria:  e.matTitle,
              asignatura: e.topicName,
              seccion:    e.topicName,
              url,
              score:      1,
            };
          });
        }
      }

      // ── Solo mostrar materiales que existan en classroom_data (no inventados)
      materials = materials.filter(m => urlToEntry[m.url]);

      // ── Limpia el texto si ya hay chips para evitar duplicados visuales
      // Elimina líneas que parezcan listas de materiales (•, -, *, numeradas)
      if (materials.length > 0) {
        reply = reply
          .split("\n")
          .filter((line: string) => {
            const l = line.trim();
            // Quita líneas que son bullets con nombre de material ya en chips
            const isBullet = /^[-•*]\s+/.test(l) || /^\d+[.)\s]/.test(l);
            if (!isBullet) return true;
            // Quita si algún material está mencionado en esa línea
            return !materials.some(m => l.includes(m.nombre.slice(0, 20)) || l.includes(m.url));
          })
          .join("\n")
          .trim();
      }

      setMsgs(p => [...p, { role:"bot", text:reply, materials }]);
      history.current.push({ role:"assistant", content:reply });
    } catch {
      setMsgs(p => [...p, { role:"bot", text:"X No se pudo conectar." }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Mini preview modal */}
      {preview && (
        <ChatPreviewModal
          file={preview.file}
          matTitle={preview.matTitle}
          topicName={preview.topicName}
          onClose={() => setPreview(null)}
        />
      )}

      <div id="sp-bubble">
        {open && (
          <div id="sp-panel">
            <div id="sp-hdr">
              <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                <img src="/logos/sinpesito.svg" alt="SP" style={{width:"2rem",height:"2rem",borderRadius:"0.4rem",flexShrink:0}} />
                <div>
                  <div className="sp-name">SinPesito</div>
                  <div className="sp-sub">Busco el material que necesitas ✨</div>
                </div>
              </div>
              <button id="sp-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div id="sp-msgs" ref={msgsRef}>
              {msgs.length === 0 && (
                <>
                  <div className="sp-msg bot">
                    ¡Hola! 👋 Soy <b>SinPesito</b>.{" "}
                    {user ? "¿Qué asignatura o tema necesitas?" : "Inicia sesión para preguntarme. 🔒"}
                  </div>
                  {/* ── Chips de acceso rápido por asignatura ── */}
                  {user && (
                    <div className="sp-quick-row">
                      {QUICK_SUBJECTS.map((s, i) => (
                        <button
                          key={i}
                          className="sp-quick-chip"
                          onClick={() => sendQuick(s.query)}
                        >
                          {s.emoji} {s.label}
                        </button>
                      ))}
                      <button
                        className="sp-quick-chip sp-quick-chip--goto"
                        onClick={() => { setOpen(false); router.push("/materiales"); }}
                      >
                        📖 Ver todos
                      </button>
                    </div>
                  )}
                </>
              )}

              {msgs.map((m, i) => (
                <div key={i}>
                  {m.role === "bot" ? (
                    <div className="sp-msg bot"
                      dangerouslySetInnerHTML={{ __html: parseProse(m.text) }}
                    />
                  ) : (
                    <div className="sp-msg user">{m.text}</div>
                  )}
                  {/* Material chips below bot message */}
                  {m.role === "bot" && m.materials && m.materials.length > 0 && (
                    <div className="sp-chips">
                      {m.materials.slice(0,5).map((mat, mi) => (
                        <MaterialChip
                          key={mi}
                          mat={mat}
                          uid={user?.uid ?? null}
                          onPreview={(file, matTitle, topicName) =>
                            setPreview({ file, matTitle, topicName })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {busy && (
                <div className="sp-msg bot" style={{opacity:0.6}}>⏳ Pensando…</div>
              )}
            </div>

            <div id="sp-form">
              <input
                id="sp-inp" value={inp}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder={user ? "¿Qué asignatura o tema buscas?" : "Inicia sesión para escribir…"}
                autoComplete="off"
              />
              <button id="sp-send" onClick={send} disabled={busy}>➤</button>
            </div>
          </div>
        )}
        <button
          id="sp-btn"
          onClick={() => setOpen(p => !p)}
          title="SinPesito IA"
        >
          <img src="/logos/sinpesito.svg" alt="SinPesito" style={{width:"2.2rem",height:"2.2rem",borderRadius:"0.5rem"}} />
        </button>
      </div>
    </>
  );
}
