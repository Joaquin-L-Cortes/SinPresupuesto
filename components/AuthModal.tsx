"use client";
// components/AuthModal.tsx
import { useEffect, useRef, useState } from "react";
import { useAuth, getAvatar, AVATARS as AVATAR_DEFS } from "@/lib/auth-context";
import { getSupabase } from "@/lib/supabase";

const AVATARS = [
  {id:1,e:"🦁"},{id:2,e:"🐯"},{id:3,e:"🐻"},{id:4,e:"🐸"},{id:5,e:"🐢"},
  {id:6,e:"🐬"},{id:7,e:"🦋"},{id:8,e:"🦄"},{id:9,e:"🐙"},{id:10,e:"🦊"},
  {id:11,e:"🐺"},{id:12,e:"🦜"},{id:13,e:"🐧"},{id:14,e:"🦔"},{id:15,e:"🦅"},
  {id:16,e:"🦦"},{id:17,e:"🦩"},{id:18,e:"🪲"},
];

const MESES = ["enero","febrero","marzo","abril","mayo","junio",
               "julio","agosto","septiembre","octubre","noviembre","diciembre"];

interface Props {
  open: boolean;
  onClose: () => void;
  onToast?: (msg: string) => void;
  unreadCount?: number;
  onMarkAllRead?: () => void;
}

export function AuthModal({ open, onClose, onToast, unreadCount = 0, onMarkAllRead }: Props) {
  const { user, profile, logout, refreshProfile } = useAuth();

  // Login / Register state
  const [tab, setTab]           = useState<"login"|"register">("login");
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [nombre, setNombre]     = useState("");
  const [apellido, setApellido] = useState("");
  const [genero, setGenero]     = useState("NR");
  const [avatarId, setAvatarId] = useState(1);
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  // Edit-profile state
  const [editing, setEditing]           = useState(false);
  const [editNombre, setEditNombre]     = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editGenero, setEditGenero]     = useState("NR");
  const [editAvatar, setEditAvatar]     = useState(1);
  const [editErr, setEditErr]           = useState("");
  const [editBusy, setEditBusy]         = useState(false);
  const [editOk, setEditOk]             = useState(false);

  // Email change state
  const [newEmail, setNewEmail]         = useState("");
  const [emailPass, setEmailPass]       = useState("");
  const [emailStep, setEmailStep]       = useState<"idle"|"confirm"|"sent">("idle");

  // Forgot password state
  const [forgotStep, setForgotStep]     = useState<"idle"|"sent">("idle");
  const [forgotBusy, setForgotBusy]     = useState(false);
  const [forgotErr, setForgotErr]       = useState("");

  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNameInput, setDeleteNameInput] = useState("");

  const [showNotifs, setShowNotifs]     = useState(false);
  const [notifs, setNotifs]             = useState<any[]>([]);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState<string|null>(null);

  // #1 FIX: track if popup is currently open to prevent stacking
  const [popupOpen, setPopupOpen] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setErr(""); setEditing(false); setEditOk(false);
      setShowDeleteMenu(false); setShowDeleteConfirm(false);
      setDeleteNameInput(""); setEmailStep("idle");
      setNewEmail(""); setEmailPass("");
      setForgotStep("idle"); setForgotErr("");
    }
  }, [open]);

  // Cargar notificaciones globales
  useEffect(() => {
    if (!showNotifs || notifsLoaded) return;
    (async () => {
      try {
        const [{ db }, { collection, query, orderBy, getDocs, where, Timestamp }] = await Promise.all([
          import("@/lib/firebase"),
          import("firebase/firestore"),
        ]);
        const since = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const q = query(
          collection(db, "global_notifications"),
          where("createdAt", ">=", since),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        const lastSeen = (() => { try { return parseInt(localStorage.getItem("sp-notif-seen")||"0",10); } catch { return 0; } })();
        const myPosts: string[] = (() => { try { return JSON.parse(localStorage.getItem("sp-my-posts")||"[]"); } catch { return []; } })();
        const commentedPosts: string[] = (() => { try { return JSON.parse(localStorage.getItem("sp-commented-posts")||"[]"); } catch { return []; } })();
        const items = snap.docs
          .map(d => {
            const data = d.data() as Record<string, any>;
            const ts = data.createdAt?.toMillis?.() ?? 0;
            return { id: d.id, ...data, ts, isNew: data.authorId !== user?.uid && ts > lastSeen } as Record<string, any> & { id: string; ts: number; isNew: boolean };
          })
          .filter(n => {
            // Nunca mostrar las propias publicaciones del usuario
            if (n.authorId === user?.uid) return false;
            // Comentarios: solo los de posts donde participé
            if (n.type === "comment" && n.postId) {
              const isMyPost = myPosts.includes(n.postId);
              const iCommented = commentedPosts.includes(n.postId);
              const highEngagement = (n.likesCount || 0) + (n.commentCount || 0) >= 10;
              return isMyPost || iCommented || highEngagement;
            }
            // Posts nuevos de alta interacción
            if (n.type === "post") {
              return (n.likesCount || 0) + (n.commentCount || 0) >= 10;
            }
            return true;
          });
        setNotifs(items);
        setNotifsLoaded(true);
      } catch { /* ignore */ }
    })();
  }, [showNotifs, notifsLoaded, user]);

  // ESC para cerrar cualquier modal
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, editing, onClose]);

  // #2 FIX: mousedown in overlay only closes if target IS the overlay (not a child input/button)
  function handleOverlayMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }
  function handleEditOverlayMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) setEditing(false);
  }

  // Pre-fill edit form when opening editor
  useEffect(() => {
    if (editing && profile) {
      setEditNombre(profile.nombre || "");
      setEditApellido(profile.apellido || "");
      setEditGenero(profile.genero || "NR");
      setEditAvatar(profile.avatarId || 1);
      setEditErr("");
      setEditOk(false);
      setEmailStep("idle");
      setNewEmail("");
      setEmailPass("");
    }
  }, [editing, profile]);

  // Join date — compatible con metadata de Supabase y Firebase
  function joinDate(): string {
    try {
      const raw = user?.metadata?.creationTime ?? user?.created_at;
      if (!raw) return "";
      const d = new Date(raw);
      return `Desde ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    } catch { return ""; }
  }

  // Eliminar cuenta vía API Route (requiere service role en el servidor)
  async function deleteAccount() {
    if (!user) return;
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("Error al eliminar");
      onClose();
      onToast?.("🗑️ Cuenta eliminada correctamente.");
    } catch (e: any) {
      alert("Error al eliminar: " + (e.message || "Intenta iniciar sesión de nuevo y repite."));
    }
  }

  // Guardar cambios de perfil en Supabase
  async function saveProfile() {
    if (!editNombre.trim()) { setEditErr("El nombre es obligatorio"); return; }
    setEditBusy(true); setEditErr("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("profiles").update({
        nombre:   editNombre.trim(),
        apellido: editApellido.trim(),
        genero:   editGenero,
        avatar_id: editAvatar,
      }).eq("id", user.uid);
      if (error) throw error;
      setEditOk(true);
      await refreshProfile();
      setTimeout(() => { setEditOk(false); onClose(); }, 900);
    } catch {
      setEditErr("Error al guardar. Intenta de nuevo.");
    } finally { setEditBusy(false); }
  }

  // Detectar proveedor del usuario actual (compatible con user wrapeado de Supabase)
  function getProvider(): "password" | "google.com" | "microsoft.com" | "unknown" {
    const pid = user?.providerData?.[0]?.providerId;
    if (pid === "password" || pid === "google.com" || pid === "microsoft.com") return pid;
    // Supabase: detectar por app_metadata
    const provider = user?.app_metadata?.provider;
    if (provider === "google") return "google.com";
    if (provider === "azure")  return "microsoft.com";
    if (provider === "email")  return "password";
    return "unknown";
  }

  // Cambio de correo con Supabase
  async function changeEmail() {
    if (!newEmail.trim()) { setEditErr("Escribe el nuevo correo"); return; }
    const provider = getProvider();
    if (provider === "password" && !emailPass) {
      setEditErr("Escribe tu contraseña actual");
      return;
    }
    setEditBusy(true); setEditErr("");
    try {
      const supabase = getSupabase();
      // Para usuarios con contraseña, verificar credencial actual primero
      if (provider === "password") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: emailPass,
        });
        if (signInErr) throw { message: "Contraseña incorrecta" };
      }
      // Supabase envía email de verificación al nuevo correo
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailStep("sent");
    } catch (e: any) {
      setEditErr(e.message || "Error al cambiar el correo.");
    } finally { setEditBusy(false); }
  }

  // Olvidé mi contraseña — Supabase
  async function sendForgotPassword(emailToReset: string) {
    if (!emailToReset.trim()) { setForgotErr("Escribe tu correo primero"); return; }
    setForgotBusy(true); setForgotErr("");
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset.trim(), {
        redirectTo: typeof window !== "undefined" ? window.location.origin + "/reset-password" : undefined,
      });
      if (error) throw error;
      setForgotStep("sent");
    } catch (e: any) {
      setForgotErr(e.message || "Error al enviar el correo.");
    } finally { setForgotBusy(false); }
  }

  // #1 FIX: helper to run social login without stacking popups
  async function runWithPopup(fn: () => Promise<void>) {
    if (popupOpen) return;   // prevent double-open
    setPopupOpen(true);
    setBusy(true);
    setErr("");
    try {
      await fn();
    } finally {
      setBusy(false);
      setPopupOpen(false);
    }
  }

  // Microsoft — OAuth con Supabase (redirige a Azure, vuelve autenticado)
  async function handleMicrosoft() {
    await runWithPopup(async () => {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          scopes: "email",
        },
      });
      if (error) throw { message: error.message };
      // La redirección sucede aquí — el modal se cierra al volver con sesión
    });
  }

  async function handleEmail() {
    if (!email || !pass) { setErr("Completa todos los campos"); return; }
    setBusy(true); setErr("");
    try {
      const supabase = getSupabase();
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        onToast?.("✅ ¡Sesión iniciada correctamente!");
        onClose();
      } else {
        if (!nombre.trim()) { setErr("Escribe tu nombre"); setBusy(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { nombre: nombre.trim() } },
        });
        if (error) throw error;
        // Upsert del perfil completo (el trigger crea el row básico)
        if (data.user) {
          await supabase.from("profiles").upsert({
            id:       data.user.id,
            nombre:   nombre.trim(),
            apellido: apellido.trim(),
            genero,
            avatar_id: avatarId,
            role:     "estudiante",
          });
        }
        onToast?.("🎉 ¡Cuenta creada correctamente!");
        onClose();
      }
    } catch (e: any) {
      const MSGS: Record<string,string> = {
        "Invalid login credentials":         "Correo o contraseña incorrectos",
        "User already registered":           "Ese correo ya está registrado",
        "Password should be at least 6 characters": "La contraseña debe tener mínimo 6 caracteres",
        "Unable to validate email address: invalid format": "Correo inválido",
        "Email rate limit exceeded":         "Demasiados intentos. Espera un momento.",
      };
      setErr(MSGS[e.message] ?? e.message ?? "Error desconocido");
    } finally { setBusy(false); }
  }

  // Google OAuth con Supabase
  async function handleGoogle() {
    await runWithPopup(async () => {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw { message: error.message };
      // La redirección sucede aquí — sesión se establece al volver
    });
  }

  if (!open) return null;

  const av      = profile ? getAvatar(profile.avatarId || 1) : null;
  const avEmoji = av?.emoji || "👤";
  const avColor = av?.color || "var(--accent)";
  const avBg    = av?.bg    || "var(--bg3)";

  // ── EDIT PROFILE VIEW ───────────────────────────────────────────────────────
  if (user && editing) {
    const editAvDef = AVATAR_DEFS.find(a => a.id === editAvatar) ?? AVATAR_DEFS[0];
    return (
      <div className="modal-overlay open" ref={overlayRef}
        onMouseDown={handleEditOverlayMouseDown}>
        <div className="modal" style={{ maxWidth: 620, position: "relative" }}>

          <button onClick={() => setEditing(false)} style={{
            position:"absolute", top:14, right:14,
            background:"none", border:"none", fontSize:"1.1rem",
            cursor:"pointer", color:"var(--muted)", lineHeight:1,
            padding:"2px 6px", borderRadius:6,
          }}>✕</button>

          {/* Botón tres puntos verticales */}
          <div style={{ position:"absolute", top:14, right:46 }}>
            <button
              onClick={() => { setShowDeleteMenu(v => !v); setShowDeleteConfirm(false); setDeleteNameInput(""); }}
              style={{
                background:"none", border:"none", fontSize:"1.1rem",
                cursor:"pointer", color:"var(--muted)", lineHeight:1,
                padding:"2px 6px", borderRadius:6,
                letterSpacing:0, fontWeight:900,
              }}
              title="Más opciones"
            >⋮</button>
            {showDeleteMenu && !showDeleteConfirm && (
              <div style={{
                position:"absolute", top:"110%", right:0, zIndex:200,
                background:"var(--bg)", border:"1.5px solid var(--border)",
                borderRadius:8, boxShadow:"0 4px 16px #0002", minWidth:180,
                padding:"0.25rem",
              }}>
                <button
                  onClick={() => { setShowDeleteConfirm(true); setShowDeleteMenu(false); }}
                  style={{
                    width:"100%", textAlign:"left", background:"none",
                    border:"none", padding:"0.5rem 0.75rem", borderRadius:6,
                    cursor:"pointer", color:"#c0392b", fontSize:".88rem", fontWeight:600,
                  }}
                >🗑️ Eliminar Cuenta</button>
              </div>
            )}
          </div>

          {/* Modal de confirmación de eliminación */}
          {showDeleteConfirm && (
            <div style={{
              position:"fixed", inset:0, zIndex:300,
              background:"#0006", display:"flex", alignItems:"center", justifyContent:"center",
            }}
              onMouseDown={e => { if (e.target === e.currentTarget) { setShowDeleteConfirm(false); setDeleteNameInput(""); } }}
            >
              <div style={{
                background:"var(--bg)", border:"1.5px solid #f5a0a0",
                borderRadius:14, padding:"1.5rem", maxWidth:380, width:"90%",
                boxShadow:"0 8px 32px #0003",
              }}>
                <h3 style={{ color:"#c0392b", marginTop:0, marginBottom:".5rem" }}>⚠️ Eliminar Cuenta</h3>
                <p style={{ fontSize:".88rem", color:"var(--fg)", margin:"0 0 1rem" }}>
                  Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus datos, progreso y notas.
                </p>
                <p style={{ fontSize:".85rem", color:"var(--muted)", margin:"0 0 .5rem" }}>
                  Escribe tu nombre <strong style={{color:"var(--fg)"}}>{profile?.nombre}</strong> para confirmar:
                </p>
                <input
                  value={deleteNameInput}
                  onChange={e => setDeleteNameInput(e.target.value)}
                  placeholder={profile?.nombre || "Tu nombre"}
                  autoFocus
                  style={{ width:"100%", boxSizing:"border-box", marginBottom:".75rem" }}
                  onKeyDown={e => {
                    if (e.key === "Escape") { setShowDeleteConfirm(false); setDeleteNameInput(""); }
                    if (e.key === "Enter" && deleteNameInput.trim().toLowerCase() === (profile?.nombre || "").toLowerCase()) deleteAccount();
                  }}
                />
                <div style={{ display:"flex", gap:".5rem" }}>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteNameInput(""); }}
                    style={{
                      flex:1, padding:".5rem", borderRadius:8, border:"1.5px solid var(--border)",
                      background:"var(--bg2)", cursor:"pointer", color:"var(--muted)", fontWeight:600,
                    }}
                  >Cancelar</button>
                  <button
                    onClick={deleteAccount}
                    disabled={deleteNameInput.trim().toLowerCase() !== (profile?.nombre || "").toLowerCase()}
                    style={{
                      flex:1, padding:".5rem", borderRadius:8, border:"none",
                      background: deleteNameInput.trim().toLowerCase() === (profile?.nombre || "").toLowerCase()
                        ? "#c0392b" : "#f5a0a0",
                      color:"#fff", cursor: deleteNameInput.trim().toLowerCase() === (profile?.nombre || "").toLowerCase()
                        ? "pointer" : "not-allowed",
                      fontWeight:700, transition:"background .2s",
                    }}
                  >Eliminar</button>
                </div>
              </div>
            </div>
          )}

          <h2 style={{ marginRight: 36 }}>Editar perfil</h2>
          <p className="modal-sub">Modifica tus datos de estudiante</p>

          <div className="reg-layout" style={{ marginTop: "1rem" }}>
            <div className="reg-avatar-row">
            {/* Avatar preview */}
            <div className="reg-avatar-col">
              <div style={{
                fontSize:"3.5rem", width:90, height:90, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                background: editAvDef.bg, border:`2px solid ${editAvDef.color}`,
                transition:"all .3s", flexShrink:0,
              }}>
                {editAvDef.emoji}
              </div>
              <p style={{fontSize:".72rem",color:"var(--muted)",marginTop:".4rem",textAlign:"center"}}>
                Tu avatar
              </p>
            </div>
            {/* Avatar picker inline — solo móvil */}
            <div className="reg-picker-col reg-picker-inline">
              <p style={{fontSize:".7rem",color:"var(--muted)",marginBottom:".4rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>
                Elige tu avatar
              </p>
              <div className="avatar-picker-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".3rem"}}>
                {AVATARS.map(a => {
                  const avDef = AVATAR_DEFS.find(d => d.id === a.id);
                  return (
                    <button key={a.id} type="button"
                      className={`avatar-opt${editAvatar===a.id?" selected":""}`}
                      style={{
                        width:34,height:34,fontSize:"1rem",
                        background: avDef ? avDef.bg : "transparent",
                        borderColor: avDef ? avDef.color : "var(--border)",
                      }}
                      onClick={() => setEditAvatar(a.id)}>
                      {a.e}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>{/* /reg-avatar-row */}
            {/* Fields */}
            <div className="reg-fields-col">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input value={editNombre} onChange={e=>setEditNombre(e.target.value)} placeholder="Nombre" />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input value={editApellido} onChange={e=>setEditApellido(e.target.value)} placeholder="Apellido" />
                </div>
              </div>
              <div className="form-group">
                <label>Género</label>
                <select value={editGenero} onChange={e=>setEditGenero(e.target.value)}>
                  <option value="NR">Prefiero no decir</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="NB">No binario</option>
                </select>
              </div>
              <div className="form-group">
                <label>Correo electrónico</label>
                {emailStep === "idle" && (
                  <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <input
                      value={user.email || ""}
                      readOnly
                      style={{ flex: 1, opacity: 0.7, cursor: "default", background: "var(--bg2)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setEmailStep("confirm")}
                      style={{
                        flexShrink: 0, padding: ".35rem .65rem", fontSize: ".78rem",
                        borderRadius: 6, border: "1.5px solid var(--border)",
                        background: "var(--bg2)", cursor: "pointer", color: "var(--fg)",
                        whiteSpace: "nowrap",
                      }}
                    >✏️ Cambiar</button>
                  </div>
                )}
                {emailStep === "confirm" && (() => {
                  const isOAuth = getProvider() !== "password";
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="Nuevo correo"
                        autoFocus
                      />
                      {/* Solo mostrar campo de contraseña para usuarios email/password */}
                      {!isOAuth && (
                        <input
                          type="password"
                          value={emailPass}
                          onChange={e => setEmailPass(e.target.value)}
                          placeholder="Tu contraseña actual"
                          onKeyDown={e => e.key === "Enter" && changeEmail()}
                        />
                      )}
                      {isOAuth && (
                        <p style={{ fontSize: ".75rem", color: "var(--muted)", margin: 0,
                          background: "var(--bg2)", borderRadius: 6, padding: ".4rem .6rem",
                          border: "1px solid var(--border)" }}>
                          🔐 Se abrirá una ventana de {getProvider() === "google.com" ? "Google" : "Microsoft"} para verificar tu identidad.
                        </p>
                      )}
                      <div style={{ display: "flex", gap: ".4rem" }}>
                        <button
                          type="button"
                          onClick={changeEmail}
                          disabled={editBusy}
                          style={{
                            flex: 1, padding: ".35rem", fontSize: ".82rem", borderRadius: 6,
                            border: "1.5px solid var(--accent)", background: "var(--accent)",
                            color: "#fff", cursor: "pointer", fontWeight: 600,
                          }}
                        >{editBusy ? "⏳ Verificando…" : "📨 Enviar verificación"}</button>
                        <button
                          type="button"
                          onClick={() => { setEmailStep("idle"); setNewEmail(""); setEmailPass(""); setEditErr(""); }}
                          style={{
                            padding: ".35rem .6rem", fontSize: ".82rem", borderRadius: 6,
                            border: "1.5px solid var(--border)", background: "var(--bg2)",
                            cursor: "pointer", color: "var(--muted)",
                          }}
                        >Cancelar</button>
                      </div>
                      <p style={{ fontSize: ".72rem", color: "var(--muted)", margin: 0 }}>
                        Se enviará un email de verificación al nuevo correo. El cambio se aplica al hacer clic en ese link.
                      </p>
                    </div>
                  );
                })()}
                {emailStep === "sent" && (
                  <div style={{
                    padding: ".5rem .75rem", borderRadius: 8,
                    background: "#e8f8f0", border: "1.5px solid #1db97d",
                    fontSize: ".82rem", color: "#1a7a4a", fontWeight: 600,
                  }}>
                    ✅ Email de verificación enviado a <strong>{newEmail}</strong>.<br />
                    <span style={{ fontWeight: 400 }}>Haz clic en el link del correo para confirmar el cambio.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Avatar picker */}
            <div className="reg-picker-col reg-picker-desktop">
              <p style={{fontSize:".7rem",color:"var(--muted)",marginBottom:".4rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>
                Elige tu avatar
              </p>
              <div className="avatar-picker-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".3rem"}}>
                {AVATARS.map(a => {
                  const avDef = AVATAR_DEFS.find(d => d.id === a.id);
                  return (
                    <button key={a.id} type="button"
                      className={`avatar-opt${editAvatar===a.id?" selected":""}`}
                      style={{
                        width:40,height:40,fontSize:"1.15rem",
                        background: avDef ? avDef.bg : "transparent",
                        borderColor: avDef ? avDef.color : "var(--border)",
                      }}
                      onClick={() => setEditAvatar(a.id)}>
                      {a.e}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {editErr && <div className="login-err show" style={{marginTop:".5rem"}}>{editErr}</div>}
          {editOk  && (
            <div style={{color:"#1db97d",fontSize:".85rem",marginTop:".5rem",fontWeight:600}}>
              ✅ Cambios guardados. Recargando…
            </div>
          )}

          <button className="btn-submit" onClick={saveProfile} disabled={editBusy}
            style={{marginTop:"1rem"}}>
            {editBusy ? "⏳ Guardando…" : "💾 Guardar cambios"}
          </button>

          {/* #4: Solo aquí aparece ¿Olvidó su contraseña? (debajo de Guardar cambios) */}
          <div style={{marginTop:".6rem", textAlign:"center"}}>
            {forgotStep === "idle" && (
              <>
                <button
                  type="button"
                  onClick={() => sendForgotPassword(user?.email || "")}
                  disabled={forgotBusy}
                  style={{
                    background:"none", border:"none", cursor:"pointer",
                    color:"var(--accent)", fontSize:".82rem", textDecoration:"underline", padding:0,
                  }}
                >{forgotBusy ? "⏳ Enviando…" : "¿Olvidó su contraseña?"}</button>
                {forgotErr && <p style={{color:"#c0392b", fontSize:".78rem", margin:".25rem 0 0"}}>{forgotErr}</p>}
              </>
            )}
            {forgotStep === "sent" && (
              <p style={{color:"#1db97d", fontSize:".82rem", fontWeight:600, margin:0}}>
                ✅ Correo de recuperación enviado. Revisa tu bandeja.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LOGGED-IN VIEW ──────────────────────────────────────────────────────────
  if (user) {
    const joined = joinDate();
    return (
      <div className="modal-overlay open" ref={overlayRef}
        onMouseDown={handleOverlayMouseDown}>
        <div className="modal" style={{ maxWidth:380, position:"relative" }}>

          {/* X close */}
          <button onClick={onClose} style={{
            position:"absolute", top:14, right:14,
            background:"none", border:"none", fontSize:"1.1rem",
            cursor:"pointer", color:"var(--muted)", lineHeight:1,
            padding:"2px 6px", borderRadius:6,
          }}>✕</button>

          <h2 style={{ marginRight:36 }}>Tu cuenta</h2>

          {/* Tarjeta de perfil */}
          <div style={{
            display:"flex", alignItems:"center", gap:"1rem",
            background:"var(--bg2)", border:"1.5px solid var(--border)",
            borderRadius:12, padding:"1rem", margin:"1rem 0",
          }}>
            {/* Avatar */}
            <div style={{
              fontSize:"2.8rem", width:70, height:70, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:avBg, border:`2px solid ${avColor}`, flexShrink:0,
            }}>
              {avEmoji}
            </div>
            {/* Info */}
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:"1rem", color:"var(--fg)"}}>
                {profile?.nombre || ""} {profile?.apellido || ""}
              </div>
              <div style={{
                fontSize:".8rem", color:"var(--muted)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>
                {user.email}
              </div>
              {joined && (
                <div style={{fontSize:".75rem", color:"var(--muted)", marginTop:".25rem"}}>
                  📅 {joined}
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <button className="btn-submit" style={{marginBottom:"0.5rem"}}
            onClick={() => setEditing(true)}>
            ✏️ Realizar cambios
          </button>

          {/* Notificaciones */}
          <button
            className="btn-submit"
            style={{
              marginBottom: "0.5rem",
              background: "var(--bg2)",
              color: "var(--fg)",
              border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
              position: "relative",
            }}
            onClick={() => {
              setShowNotifs(v => !v);
              setNotifsLoaded(false);
              onMarkAllRead?.();
            }}
          >
            🔔 Notificaciones
            {unreadCount > 0 && !showNotifs && (
              <span style={{
                background: "#e74c3c", color: "#fff", borderRadius: 20,
                fontSize: ".65rem", fontWeight: 700, padding: "1px 6px",
                lineHeight: 1.4,
              }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {/* Panel de notificaciones */}
          {showNotifs && (
            <div style={{
              background: "var(--bg2)", border: "1.5px solid var(--border)",
              borderRadius: 12, marginBottom: ".5rem", overflow: "hidden",
            }}>
              {/* Cabecera con botón borrar todo */}
              {notifsLoaded && notifs.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: ".45rem .85rem", borderBottom: "1px solid var(--border)",
                  background: "var(--bg)",
                }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    Notificaciones
                  </span>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const [{ db }, { collection, getDocs, deleteDoc, query, where, Timestamp }] = await Promise.all([
                          import("@/lib/firebase"),
                          import("firebase/firestore"),
                        ]);
                        const since = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        const q = query(collection(db, "global_notifications"), where("createdAt", ">=", since));
                        const snap = await getDocs(q);
                        const toDelete = snap.docs.filter(d => d.data().authorId === user.uid);
                        await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
                        setNotifs(prev => prev.filter(n => n.authorId !== user.uid));
                      } catch { /* ignore */ }
                    }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: ".72rem", color: "#c0392b", fontWeight: 600, padding: "2px 6px",
                      borderRadius: 6, lineHeight: 1,
                    }}
                    title="Borrar mis notificaciones"
                  >
                    🗑 Limpiar
                  </button>
                </div>
              )}
              <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {!notifsLoaded && (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: ".82rem" }}>
                  Cargando…
                </div>
              )}
              {notifsLoaded && notifs.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: ".82rem" }}>
                  No hay notificaciones recientes
                </div>
              )}
              {notifsLoaded && notifs.map(n => {
                const date = n.ts ? new Date(n.ts) : null;
                const ago  = date ? (() => {
                  const diff = Math.floor((Date.now()-n.ts)/1000);
                  if (diff<60) return "hace un momento";
                  if (diff<3600) return "hace "+Math.floor(diff/60)+" min";
                  if (diff<86400) return "hace "+Math.floor(diff/3600)+" h";
                  return "hace "+Math.floor(diff/86400)+" d";
                })() : "";
                const hasLink = !!n.postId;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!hasLink) return;
                      onClose();
                      window.location.href = `/comunidad?post=${n.postId}`;
                    }}
                    style={{
                      padding: ".6rem .85rem", borderBottom: "1px solid var(--border)",
                      background: n.isNew ? "rgba(231,76,60,.06)" : "transparent",
                      display: "flex", flexDirection: "column", gap: ".15rem",
                      cursor: hasLink ? "pointer" : "default",
                      transition: "background .15s",
                      position: "relative",
                    }}
                    onMouseEnter={e => { if (hasLink) (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = n.isNew ? "rgba(231,76,60,.06)" : "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: ".4rem", paddingRight: "1.5rem" }}>
                      {n.isNew && <span style={{ width:7, height:7, borderRadius:"50%", background:"#e74c3c", flexShrink:0, display:"inline-block" }} />}
                      <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--fg)", lineHeight: 1.3, flex: 1 }}>
                        {n.title}
                      </span>
                      {hasLink && <span style={{ fontSize: ".75rem", color: "var(--muted)", flexShrink: 0 }}>›</span>}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: ".76rem", color: "var(--muted)", lineHeight: 1.4, paddingLeft: n.isNew ? "1.1rem" : 0 }}>
                        {n.body.length > 80 ? n.body.slice(0,80)+"…" : n.body}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: n.isNew ? "1.1rem" : 0 }}>
                      <span style={{ fontSize: ".7rem", color: "var(--muted)", opacity: .7 }}>
                        {ago}
                      </span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (deletingNotif === n.id) return;
                          setDeletingNotif(n.id);
                          try {
                            const [{ db }, { doc, deleteDoc }] = await Promise.all([
                              import("@/lib/firebase"),
                              import("firebase/firestore"),
                            ]);
                            await deleteDoc(doc(db, "global_notifications", n.id));
                            setNotifs(prev => prev.filter(x => x.id !== n.id));
                          } catch { /* ignore */ } finally { setDeletingNotif(null); }
                        }}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: ".68rem", color: "#c0392b", padding: "1px 4px",
                          borderRadius: 4, opacity: .6, lineHeight: 1,
                        }}
                        title="Borrar"
                      >
                        {deletingNotif === n.id ? "⏳" : "✕"}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          <button className="btn-submit" style={{
            background:"#fff1f2", color:"#c0392b", border:"1.5px solid #f5a0a0",
          }}
            onClick={async () => { await logout(); onClose(); }}>
            🚪 Cerrar sesión
          </button>

        </div>
      </div>
    );
  }

  // ── LOGIN / REGISTER VIEW ───────────────────────────────────────────────────
  return (
    <div className="modal-overlay open" ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}>
      <div className="modal" style={{maxWidth: tab === "register" ? 620 : 400, position:"relative"}}>

        {/* X close */}
        <button onClick={onClose} style={{
          position:"absolute", top:14, right:14,
          background:"none", border:"none", fontSize:"1.1rem",
          cursor:"pointer", color:"var(--muted)", lineHeight:1,
          padding:"2px 6px", borderRadius:6,
        }}>✕</button>

        <h2 style={{marginRight:36}}>{tab === "login" ? "Ingresar" : "Crear cuenta"}</h2>

        <div className="modal-tabs">
          <button className={`modal-tab${tab==="login"?" active":""}`} onClick={() => setTab("login")}>Ingresar</button>
          <button className={`modal-tab${tab==="register"?" active":""}`} onClick={() => setTab("register")}>Registrarse</button>
        </div>

        {tab === "register" && (
          <div className="reg-layout">
            <div className="reg-avatar-row">
            <div className="reg-avatar-col">
              {(() => {
                const selAvDef = AVATAR_DEFS.find(d => d.id === avatarId) ?? AVATAR_DEFS[0];
                return (
                  <div style={{
                    fontSize:"3.5rem",width:90,height:90,borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background: selAvDef.bg, border:`2px solid ${selAvDef.color}`,
                    transition:"all .3s",flexShrink:0,
                  }}>
                    {selAvDef.emoji}
                  </div>
                );
              })()}
              <p style={{fontSize:".72rem",color:"var(--muted)",marginTop:".4rem",textAlign:"center"}}>Tu avatar</p>
            </div>
            {/* Avatar picker inline — solo móvil */}
            <div className="reg-picker-col reg-picker-inline">
              <p style={{fontSize:".7rem",color:"var(--muted)",marginBottom:".4rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>
                Elige tu avatar
              </p>
              <div className="avatar-picker-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".3rem"}}>
                {AVATARS.map(a => {
                  const avDef = AVATAR_DEFS.find(d => d.id === a.id);
                  return (
                    <button key={a.id} type="button"
                      className={`avatar-opt${avatarId===a.id?" selected":""}`}
                      style={{
                        width:34,height:34,fontSize:"1rem",
                        background: avDef ? avDef.bg : "transparent",
                        borderColor: avDef ? avDef.color : "var(--border)",
                      }}
                      onClick={() => setAvatarId(a.id)}>
                      {a.e}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>{/* /reg-avatar-row */}
            <div className="reg-fields-col">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Joaquín" />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="Cortés" />
                </div>
              </div>
              <div className="form-group">
                <label>Género</label>
                <select value={genero} onChange={e=>setGenero(e.target.value)}>
                  <option value="NR">Prefiero no decir</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="NB">No binario</option>
                </select>
              </div>
              <div className="form-group">
                <label>Correo</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@gmail.com" />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  onKeyDown={e => e.key==="Enter" && handleEmail()} />
              </div>
            </div>
            <div className="reg-picker-col reg-picker-desktop">
              <p style={{fontSize:".7rem",color:"var(--muted)",marginBottom:".4rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>
                Elige tu avatar
              </p>
              <div className="avatar-picker-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".3rem"}}>
                {AVATARS.map(a => {
                  const avDef = AVATAR_DEFS.find(d => d.id === a.id);
                  return (
                    <button key={a.id} type="button"
                      className={`avatar-opt${avatarId===a.id?" selected":""}`}
                      style={{
                        width:40,height:40,fontSize:"1.15rem",
                        background: avDef ? avDef.bg : "transparent",
                        borderColor: avDef ? avDef.color : "var(--border)",
                      }}
                      onClick={() => setAvatarId(a.id)}>
                      {a.e}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "login" && (
          <>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={e=>{ setEmail(e.target.value); setForgotStep("idle"); setForgotErr(""); }} placeholder="tu@correo.com" />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key==="Enter" && handleEmail()} />
            </div>
          </>
        )}

        {err && <div className="login-err show">{err}</div>}

        <button className="btn-submit" onClick={handleEmail} disabled={busy} style={{marginTop:".75rem"}}>
          {busy ? "⏳ Procesando…" : (tab==="login" ? "Ingresar" : "Crear cuenta")}
        </button>

        {/* ¿Olvidó su contraseña? */}
        {tab === "login" && (
          <div style={{marginTop:".6rem", textAlign:"center"}}>
            {forgotStep === "idle" && (
              <>
                <button
                  type="button"
                  onClick={() => sendForgotPassword(email)}
                  disabled={forgotBusy}
                  style={{
                    background:"none", border:"none", cursor:"pointer",
                    color:"var(--accent)", fontSize:".82rem", textDecoration:"underline",
                    padding:0,
                  }}
                >{forgotBusy ? "⏳ Enviando…" : "¿Olvidó su contraseña?"}</button>
                {forgotErr && <p style={{color:"#c0392b", fontSize:".78rem", margin:".25rem 0 0"}}>{forgotErr}</p>}
              </>
            )}
            {forgotStep === "sent" && (
              <p style={{color:"#1db97d", fontSize:".82rem", fontWeight:600, margin:0}}>
                ✅ Correo de recuperación enviado. Revisa tu bandeja.
              </p>
            )}
          </div>
        )}

        {/* Separador */}
        <div className="or-sep" style={{marginTop:".9rem"}}>o continúa con</div>

        {/* Botones sociales: Google | Microsoft */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:".5rem", marginTop:".5rem"}}>
          <button className="social-btn" onClick={handleGoogle} disabled={busy || popupOpen}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button className="social-btn" onClick={handleMicrosoft} disabled={busy || popupOpen}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#F25022" d="M1 1h10v10H1z"/>
              <path fill="#7FBA00" d="M13 1h10v10H13z"/>
              <path fill="#00A4EF" d="M1 13h10v10H1z"/>
              <path fill="#FFB900" d="M13 13h10v10H13z"/>
            </svg>
            Microsoft
          </button>
        </div>

      </div>
    </div>
  );
}
