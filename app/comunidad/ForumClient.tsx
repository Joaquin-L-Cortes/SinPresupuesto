"use client";
// app/comunidad/ForumClient.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";

const BAD_WORDS = [
  "mierda","puta","puto","hijueputa","malparido","malparida","gonorrea","hdp",
  "marica","pendejo","pendeja","idiota","imbécil","estúpido","estúpida",
  "verga","coño","culero","chingada","cabrón","joder","fuck","shit","bitch","asshole",
];

function hasBadWords(text: string) {
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ");
  return BAD_WORDS.some(w => new RegExp("\\b"+w.normalize("NFD").replace(/[\u0300-\u036f]/g,"")+"\\b").test(norm));
}

function timeAgo(ts: any) {
  if (!ts) return "";
  // Soporta ISO string (Supabase) y Firestore Timestamp
  const t = ts?.toDate ? ts.toDate().getTime() : typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Math.floor((Date.now()-t)/1000);
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return `hace ${Math.floor(diff/86400)} d`;
}

const BADGE: Record<string,{cls:string,lbl:string}> = {
  general:  {cls:"badge-general",  lbl:"General"},
  apunte:   {cls:"badge-apunte",   lbl:"Apunte"},
  quiz:     {cls:"badge-quiz",     lbl:"Quiz"},
  pregunta: {cls:"badge-pregunta", lbl:"Pregunta"},
};

// ─── Modal de confirmación de eliminación ───────────────────
function ConfirmDeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:400,
      background:"#0006", display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{
        background:"var(--bg)", border:"1.5px solid #f5a0a0",
        borderRadius:14, padding:"1.5rem", maxWidth:340, width:"90%",
        boxShadow:"0 8px 32px #0003",
      }}>
        <h3 style={{ color:"#c0392b", marginTop:0, marginBottom:".5rem" }}>🗑️ Eliminar publicación</h3>
        <p style={{ fontSize:".88rem", color:"var(--fg)", margin:"0 0 1.25rem" }}>
          ¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.
        </p>
        <div style={{ display:"flex", gap:".5rem" }}>
          <button onClick={onCancel} style={{
            flex:1, padding:".5rem", borderRadius:8, border:"1.5px solid var(--border)",
            background:"var(--bg2)", cursor:"pointer", color:"var(--muted)", fontWeight:600,
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            flex:1, padding:".5rem", borderRadius:8, border:"none",
            background:"#c0392b", color:"#fff", cursor:"pointer", fontWeight:700,
          }}>Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección de comentarios ──────────────────────────────────
function CommentsSection({ postId, fb, user, profile, commentCount, onCountChange, autoExpand }: {
  postId: string; fb: any; user: any; profile: any;
  commentCount: number; onCountChange: (n: number) => void;
  autoExpand?: boolean;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loaded, setLoaded]     = useState(false);

  // Si viene de una notificación, expandir automáticamente
  useEffect(() => {
    if (autoExpand && !loaded) setLoaded(true);
  }, [autoExpand]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [err, setErr]           = useState("");
  const [delTarget, setDelTarget] = useState<string|null>(null);

  useEffect(() => {
    if (!fb || !loaded) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`comments-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => { loadComments(); }
      ).subscribe();
    loadComments();
    async function loadComments() {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      // Normalizar claves
      setComments((data ?? []).map((c: any) => ({
        ...c,
        authorId:   c.author_id,
        authorName: c.author_name,
        authorAvatar: c.author_avatar,
        createdAt:  c.created_at,
      })));
    }
    return () => { supabase.removeChannel(channel); };
  }, [fb, postId, loaded]);

  function getEmoji(p: any) {
    const MAP: Record<number,string> = {1:"🦁",2:"🐯",3:"🐻",4:"🐸",5:"🐢",6:"🐬",7:"🦋",8:"🦄",9:"🐙",10:"🦊",11:"🐺",12:"🦜",13:"🐧",14:"🦔",15:"🦅",16:"🦦",17:"🦩",18:"🪲"};
    return p ? (MAP[p.avatarId] || "👤") : "👤";
  }

  async function sendComment() {
    if (!user || !profile || !text.trim()) return;
    if (hasBadWords(text)) { setErr("El comentario contiene palabras no permitidas."); return; }
    setSending(true); setErr("");
    try {
      const supabase = getSupabase();
      const authorName = (profile.nombre+" "+profile.apellido).trim() || "Estudiante";
      // Insertar en Supabase
      const { error } = await supabase.from("comments").insert({
        post_id:      postId,
        author_id:    user.uid,
        author_name:  authorName,
        author_avatar: getEmoji(profile),
        text:         text.trim(),
      });
      if (error) throw error;
      // El trigger DB incrementa comment_count automáticamente
      // Registrar que este usuario comentó en este post
      try {
        const commented: string[] = JSON.parse(localStorage.getItem("sp-commented-posts") || "[]");
        if (!commented.includes(postId)) {
          commented.push(postId);
          localStorage.setItem("sp-commented-posts", JSON.stringify(commented.slice(-200)));
        }
      } catch { /* ignore */ }
      // Notificación global — mantiene Firestore (tabla global_notifications no migrada)
      try {
        const [{ db }, { addDoc, collection, serverTimestamp }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/firestore"),
        ]);
        await addDoc(collection(db, "global_notifications"), {
          type:      "comment",
          title:     `💬 Nuevo comentario de ${authorName}`,
          body:      text.trim().slice(0, 120),
          postId,
          authorId:  user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (_) { /* no crítico */ }
      onCountChange(commentCount + 1);
      setText("");
    } catch (e: any) {
      setErr("Error al enviar. " + (e.message || ""));
    } finally { setSending(false); }
  }

  async function deleteComment(cid: string) {
    const supabase = getSupabase();
    await supabase.from("comments").delete().eq("id", cid);
    // El trigger DB decrementa comment_count automáticamente
    onCountChange(Math.max(0, commentCount - 1));
    setDelTarget(null);
  }

  if (!loaded) {
    return (
      <button
        className="show-comments-btn"
        onClick={() => setLoaded(true)}
        style={{
          marginTop:".5rem", background:"none", border:"none",
          color:"var(--muted)", fontSize:".8rem", cursor:"pointer", padding:0,
        }}
      >
        💬 Ver {commentCount > 0 ? `${commentCount} comentario${commentCount!==1?"s":""}` : "comentarios"}
      </button>
    );
  }

  return (
    <div className="comments-section" style={{ marginTop:".75rem", borderTop:"1px solid var(--border)", paddingTop:".75rem" }}>
      {delTarget && (
        <ConfirmDeleteModal
          onConfirm={() => deleteComment(delTarget)}
          onCancel={() => setDelTarget(null)}
        />
      )}

      {comments.length === 0 && (
        <p style={{ fontSize:".8rem", color:"var(--muted)", margin:"0 0 .5rem" }}>Sin comentarios aún. ¡Sé el primero!</p>
      )}

      {comments.map(c => {
    const canDel = user && (profile?.role === 'admin' || user.uid === c.authorId);
        return (
          <div key={c.id} style={{
            display:"flex", gap:".5rem", marginBottom:".6rem", alignItems:"flex-start",
          }}>
            <span style={{ fontSize:"1.1rem", flexShrink:0, lineHeight:1.4 }}>{c.authorAvatar || "👤"}</span>
            <div style={{ flex:1, background:"var(--bg2)", borderRadius:8, padding:".4rem .6rem", minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:".5rem" }}>
                <span style={{ fontWeight:600, fontSize:".78rem", color:"var(--fg)" }}>{c.authorName}</span>
                <div style={{ display:"flex", alignItems:"center", gap:".35rem" }}>
                  <span style={{ fontSize:".7rem", color:"var(--muted)", whiteSpace:"nowrap" }}>{timeAgo(c.createdAt)}</span>
                  {canDel && (
                    <button onClick={() => setDelTarget(c.id)} style={{
                      background:"none", border:"none", cursor:"pointer",
                      color:"#c0392b", fontSize:".7rem", padding:"0 2px", lineHeight:1,
                    }} title="Eliminar">🗑</button>
                  )}
                </div>
              </div>
              <div style={{ fontSize:".82rem", color:"var(--fg)", marginTop:".15rem", wordBreak:"break-word" }}>{c.text}</div>
            </div>
          </div>
        );
      })}

      {user ? (
        <div style={{ display:"flex", gap:".4rem", marginTop:".4rem", alignItems:"flex-end" }}>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setErr(""); }}
            placeholder="Escribe un comentario…"
            rows={2}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
            style={{
              flex:1, resize:"none", borderRadius:8, border:"1.5px solid var(--border)",
              padding:".4rem .6rem", fontSize:".82rem", background:"var(--bg)",
              color:"var(--fg)", fontFamily:"inherit",
            }}
          />
          <button
            onClick={sendComment}
            disabled={sending || !text.trim()}
            style={{
              padding:".45rem .8rem", borderRadius:8, border:"none",
              background: text.trim() ? "var(--accent)" : "var(--border)",
              color: text.trim() ? "#fff" : "var(--muted)",
              cursor: text.trim() ? "pointer" : "not-allowed",
              fontWeight:600, fontSize:".82rem", transition:"all .2s", flexShrink:0,
            }}
          >{sending ? "⏳" : "Enviar"}</button>
        </div>
      ) : (
        <p style={{ fontSize:".78rem", color:"var(--muted)", margin:".4rem 0 0" }}>Inicia sesión para comentar.</p>
      )}
      {err && <p style={{ fontSize:".78rem", color:"#c0392b", margin:".3rem 0 0" }}>{err}</p>}
    </div>
  );
}

// ─── Botón compartir ─────────────────────────────────────────
function ShareMenu({ postId, title }: { postId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/comunidad?post=${postId}`
    : "";

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(title+" — "+url)}`, "_blank");
    setOpen(false);
  }

  async function copyUrl() {
    try { await navigator.clipboard.writeText(url); } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
  }

  return (
    <div style={{ position:"relative" }} ref={ref}>
      <button
        className="act-btn"
        onClick={() => setOpen(v => !v)}
        title="Compartir"
      >🔗</button>
      {open && (
        <div style={{
          position:"absolute", bottom:"110%", right:0, zIndex:200,
          background:"var(--bg)", border:"1.5px solid var(--border)",
          borderRadius:10, boxShadow:"0 4px 16px #0002",
          minWidth:190, padding:".25rem",
        }}>
          <button onClick={shareWhatsApp} style={{
            width:"100%", textAlign:"left", background:"none", border:"none",
            padding:".5rem .75rem", borderRadius:7, cursor:"pointer",
            color:"var(--fg)", fontSize:".86rem", fontWeight:500,
            display:"flex", alignItems:"center", gap:".5rem",
          }}>
            <span style={{ fontSize:"1.1rem" }}>💬</span> Compartir por WhatsApp
          </button>
          <button onClick={copyUrl} style={{
            width:"100%", textAlign:"left", background:"none", border:"none",
            padding:".5rem .75rem", borderRadius:7, cursor:"pointer",
            color: copied ? "#1db97d" : "var(--fg)", fontSize:".86rem", fontWeight:500,
            display:"flex", alignItems:"center", gap:".5rem",
          }}>
            <span style={{ fontSize:"1.1rem" }}>{copied ? "✅" : "🔗"}</span>
            {copied ? "¡URL copiada!" : "Copiar URL"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function ForumClient() {
  const { user, profile } = useAuth();
  const [loaded, setLoaded] = useState(false); // reemplaza 'fb'
  const searchParams      = useSearchParams();
  const targetPostId      = searchParams?.get("post") ?? null;
  const [highlightedPost, setHighlightedPost] = useState<string|null>(targetPostId);
  const postRefs          = useRef<Record<string, HTMLDivElement|null>>({});

  useEffect(() => { setLoaded(true); }, []);

  const [posts, setPosts]             = useState<any[]>([]);
  const [tab, setTab]                 = useState("general");
  const [sort, setSort]               = useState("reciente");
  const [search, setSearch]           = useState("");
  const [postType, setPostType]       = useState("general");
  const [title, setTitle]             = useState("");
  const [body, setBody]               = useState("");
  const [quizQ, setQuizQ]             = useState("");
  const [quizOpts, setQuizOpts]       = useState(["","","",""]);
  const [quizCorrect, setQuizCorrect] = useState(-1);
  const [publishing, setPublishing]   = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string,number>>({});
  const [deleteTarget, setDeleteTarget] = useState<string|null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string,number>>({});

  // Carga en tiempo real con Supabase Realtime
  useEffect(() => {
    if (!loaded) return;
    const supabase = getSupabase();
    async function fetchPosts() {
      const { data } = await supabase
        .from("forum_posts")
        .select("*")
        .order("created_at", { ascending: false });
      // Normalizar claves al formato que espera el JSX
      setPosts((data ?? []).map((p: any) => ({
        ...p,
        authorId:     p.author_id,
        authorName:   p.author_name,
        authorAvatar: p.author_avatar,
        commentCount: p.comment_count,
        createdAt:    p.created_at,
      })));
    }
    fetchPosts();
    const channel = supabase
      .channel("forum-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" },
        () => fetchPosts()
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loaded]);

  // Scroll al post indicado por ?post= una vez que los posts carguen
  useEffect(() => {
    if (!targetPostId || posts.length === 0) return;
    const el = postRefs.current[targetPostId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedPost(targetPostId);
        setTimeout(() => setHighlightedPost(null), 3000);
      }, 300);
    }
  }, [posts, targetPostId]);

  function getEmoji(p: any) {
    const MAP: Record<number,string> = {1:"🦁",2:"🐯",3:"🐻",4:"🐸",5:"🐢",6:"🐬",7:"🦋",8:"🦄",9:"🐙",10:"🦊",11:"🐺",12:"🦜",13:"🐧",14:"🦔",15:"🦅",16:"🦦",17:"🦩",18:"🪲"};
    return p ? (MAP[p.avatarId] || "👤") : "👤";
  }

  async function publish() {
    if (!user || !profile || !title) return;
    if (postType !== "quiz" && !body) return;
    if (hasBadWords(title+" "+body)) return;
    if (postType==="quiz" && (!quizQ || quizOpts.filter(Boolean).length<2 || quizCorrect<0)) return;
    setPublishing(true);
    try {
      const supabase = getSupabase();
      const postAuthorName = (profile.nombre+" "+profile.apellido).trim() || "Estudiante";
      const { data: newPost, error } = await supabase.from("forum_posts").insert({
        type:          postType,
        title,
        body,
        quiz:          postType==="quiz" ? { question:quizQ, options:quizOpts.filter(Boolean), correctIndex:quizCorrect } : null,
        author_id:    user.uid,
        author_name:  postAuthorName,
        author_avatar: getEmoji(profile),
        likes:         [],
        dislikes:      [],
        comment_count: 0,
      }).select().single();
      if (error) throw error;
      // Guardar en localStorage
      try {
        const mine: string[] = JSON.parse(localStorage.getItem("sp-my-posts") || "[]");
        if (!mine.includes(newPost.id)) {
          mine.push(newPost.id);
          localStorage.setItem("sp-my-posts", JSON.stringify(mine.slice(-100)));
        }
      } catch { /* ignore */ }
      // Notificación global en Firestore (no migrada a Supabase)
      try {
        const [{ db }, { addDoc, collection, serverTimestamp }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/firestore"),
        ]);
        const typeLabels: Record<string,string> = { general:"📢", apunte:"📝", pregunta:"❓", quiz:"🎯" };
        await addDoc(collection(db,"global_notifications"), {
          type:      "post",
          title:     (typeLabels[postType]||"📢")+" "+postAuthorName+" publicó en Comunidad",
          body:      title.slice(0, 120),
          postId:    newPost.id,
          authorId:  user.uid,
          createdAt: serverTimestamp(),
        });
      } catch (_) { /* no crítico */ }
      setTitle(""); setBody(""); setQuizQ(""); setQuizOpts(["","","",""]); setQuizCorrect(-1);
    } finally { setPublishing(false); }
  }

  async function toggleLike(pid: string) {
    if (!user) return;
    const supabase = getSupabase();
    const p = posts.find(x => x.id===pid); if (!p) return;
    const liked = (p.likes||[]).includes(user.uid);
    const newLikes    = liked ? (p.likes||[]).filter((id: string) => id !== user.uid) : [...(p.likes||[]), user.uid];
    const newDislikes = (p.dislikes||[]).filter((id: string) => id !== user.uid);
    await supabase.from("forum_posts").update({ likes: newLikes, dislikes: newDislikes }).eq("id", pid);
  }

  async function deletePost(pid: string) {
    const supabase = getSupabase();
    await supabase.from("forum_posts").delete().eq("id", pid);
    setDeleteTarget(null);
  }

  const filtered = posts
    .filter(p => {
      if (tab==="apuntes")   return p.type==="apunte";
      if (tab==="preguntas") return p.type==="pregunta";
      if (tab==="quizzes")   return p.type==="quiz";
      return true; // "general" muestra todo
    })
    .filter(p => !search || (p.title||"").toLowerCase().includes(search.toLowerCase()) || (p.body||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort==="popular"
      ? ((b.likes?.length||0)-(b.dislikes?.length||0))-((a.likes?.length||0)-(a.dislikes?.length||0))
      : 0);

  const letters = ["A","B","C","D"];

  return (
    <>
      {/* Modal confirmar eliminar post */}
      {deleteTarget && (
        <ConfirmDeleteModal
          onConfirm={() => deletePost(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="yt-hero">
        <div className="yt-hero-inner">
          <div className="yt-hero-icon" style={{background:"#25d366"}}>
            <span style={{fontSize:"1.5rem", lineHeight:1}}>💬</span>
          </div>
          <div className="yt-hero-texts">
            <h1>💬 Comunidad SinPre</h1>
            <p>Comparte apuntes, resuelve dudas y pon a prueba tu conocimiento con quizzes.</p>
          </div>
        </div>
      </div>

      <div className="forum-wrap">
        {/* Tabs */}
        <div className="tabs-row">
          {[["general","💬 General"],["apuntes","📝 Apuntes"],["preguntas","❓ Preguntas"],["quizzes","🧠 Quizzes"]].map(([id,lbl])=>(
            <button key={id} className={`tab-pill${tab===id?" active":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {/* Compose */}
        {!user ? (
          <div className="login-gate">
            <p>Inicia sesión para publicar en la comunidad</p>
          </div>
        ) : (
          <div className="compose-box">
            <div className="compose-type-row">
              {[["general","💬 General"],["apunte","📝 Apunte"],["pregunta","❓ Pregunta"],["quiz","🧠 Quiz"]].map(([t,lbl])=>(
                <button key={t} className={`ctype-btn${postType===t?" active":""}`} onClick={()=>setPostType(t)}>{lbl}</button>
              ))}
            </div>
            <input className="compose-title-inp" value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="Título de tu publicación…" maxLength={120} />
            <textarea className="compose-body-inp" value={body} onChange={e=>setBody(e.target.value)}
              placeholder={
                postType==="apunte"   ? "Escribe aquí tu apunte…" :
                postType==="pregunta" ? "Describe tu pregunta con detalle…" :
                postType==="quiz"     ? "Contexto adicional (opcional)…" :
                                       "¿Qué quieres compartir con la comunidad?"
              } />
            {postType==="quiz" && (
              <div className="quiz-section">
                <input className="quiz-q-inp" value={quizQ} onChange={e=>setQuizQ(e.target.value)} placeholder="Escribe la pregunta del quiz…" maxLength={200} />
                <div className="quiz-opts">
                  {quizOpts.map((opt,i)=>(
                    <div key={i} className="quiz-opt-row">
                      <input type="radio" className="opt-radio" checked={quizCorrect===i} onChange={()=>setQuizCorrect(i)} />
                      <input className="opt-inp" value={opt} onChange={e=>{const a=[...quizOpts];a[i]=e.target.value;setQuizOpts(a);}} placeholder={["Opción A","Opción B","Opción C","Opción D"][i]} maxLength={120} />
                    </div>
                  ))}
                </div>
                <p className="quiz-hint">☝ Selecciona el radio de la opción correcta</p>
              </div>
            )}
            <div className="compose-footer">
              <span className="compose-footer-left">Los admins pueden eliminar contenido inapropiado.</span>
              <button className="btn-publish" onClick={publish} disabled={publishing}>
                {publishing?"⏳ Publicando…":"📤 Publicar"}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-row">
          <input className="search-inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar publicaciones…" />
          <button className={`filter-chip${sort==="reciente"?" active":""}`} onClick={()=>setSort("reciente")}>🕐 Reciente</button>
          <button className={`filter-chip${sort==="popular"?" active":""}`} onClick={()=>setSort("popular")}>🔥 Popular</button>
        </div>

        {!loaded && <div className="empty-state"><div className="es-icon">⏳</div><p>Cargando publicaciones…</p></div>}
        {loaded && filtered.length===0 && <div className="empty-state"><div className="es-icon">📭</div><p>No hay publicaciones aquí. ¡Sé el primero!</p></div>}

        {loaded && filtered.map(p => {
          const uid    = user?.uid;
          const liked  = uid && (p.likes||[]).includes(uid);
          const badge  = BADGE[p.type] || {cls:"badge-general",lbl:"General"};
          const canDel = profile?.role === 'admin' || uid===p.authorId;
          const chosen = quizAnswers[p.id];
          const cCount = commentCounts[p.id] ?? (p.commentCount || 0);

          const isHighlighted = highlightedPost === p.id;
          return (
            <div
              key={p.id}
              className={`post-card type-${p.type}`}
              ref={el => { postRefs.current[p.id] = el; }}
              style={isHighlighted ? {
                outline: "2px solid var(--accent)",
                boxShadow: "0 0 0 4px rgba(var(--accent-rgb,99,102,241),.15)",
                transition: "outline .3s, box-shadow .3s",
              } : undefined}
            >
              <div className="pc-header">
                <div className="pc-avatar">{p.authorAvatar||"👤"}</div>
                <div className="pc-meta">
                  <span className="pc-author">{p.authorName||"Anónimo"}</span>
                  <span className={`pc-type-badge ${badge.cls}`}>{badge.lbl}</span>
                  <div className="pc-date">{timeAgo(p.createdAt)}</div>
                </div>
                {canDel && (
                  <button className="pc-dots-btn" onClick={() => setDeleteTarget(p.id)}>⋯</button>
                )}
              </div>
              <div className="pc-title">{p.title}</div>
              {p.body && <div className="pc-body">{p.body}</div>}
              {p.type==="quiz" && p.quiz && (
                <div className="pc-quiz">
                  <div className="quiz-question">{p.quiz.question}</div>
                  <div className="quiz-choices">
                    {(p.quiz.options||[]).map((opt: string, i: number) => {
                      let cls = "quiz-choice";
                      if (chosen!==undefined) {
                        cls+=" locked";
                        if (i===chosen && i===p.quiz.correctIndex) cls+=" correct";
                        else if (i===chosen) cls+=" wrong";
                        else if (i===p.quiz.correctIndex) cls+=" reveal-correct";
                      }
                      return (
                        <div key={i} className={cls} onClick={()=>{if(chosen===undefined)setQuizAnswers(prev=>({...prev,[p.id]:i}));}}>
                          <div className="choice-letter">{letters[i]}</div>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {chosen!==undefined && (
                    <div className={`quiz-result ${chosen===p.quiz.correctIndex?"ok":"fail"}`}>
                      {chosen===p.quiz.correctIndex?"✅ ¡Correcto! Muy bien.":"❌ Incorrecto. La respuesta correcta está marcada en verde."}
                    </div>
                  )}
                </div>
              )}
              <div className="pc-actions">
                <button className={`act-btn${liked?" liked":""}`} onClick={()=>toggleLike(p.id)}>
                  👍 <span>{(p.likes||[]).length}</span>
                </button>
                <div className="act-sep" />
                <ShareMenu postId={p.id} title={p.title} />
              </div>

              {/* Comentarios */}
              <CommentsSection
                postId={p.id}
                fb={true}
                user={user}
                profile={profile}
                commentCount={cCount}
                onCountChange={n => setCommentCounts(prev => ({ ...prev, [p.id]: n }))}
                autoExpand={targetPostId === p.id}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
