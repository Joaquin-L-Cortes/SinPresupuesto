import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, deleteUser, EmailAuthProvider,
  reauthenticateWithCredential, updateEmail, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, OAuthProvider, RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhlQr5ulNvGqPXMX0wEgc63KjdtvVzcpo",
  authDomain: "sinpresupuesto-f0151.firebaseapp.com",
  projectId: "sinpresupuesto-f0151",
  storageBucket: "sinpresupuesto-f0151.firebasestorage.app",
  messagingSenderId: "263855838882",
  appId: "1:263855838882:web:1a15d6faafe60c5006e9fb"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const appleProvider  = new OAuthProvider('apple.com');

const AVATARS = [
  { id:1,  color:'#e74c3c', bg:'#fdecea', emoji:'🦁' },
  { id:2,  color:'#e67e22', bg:'#fef0e6', emoji:'🐯' },
  { id:3,  color:'#f1c40f', bg:'#fefbe6', emoji:'🐻' },
  { id:4,  color:'#2ecc71', bg:'#e8f8f0', emoji:'🐸' },
  { id:5,  color:'#1abc9c', bg:'#e6f9f5', emoji:'🐢' },
  { id:6,  color:'#3498db', bg:'#e8f4fd', emoji:'🐬' },
  { id:7,  color:'#2980b9', bg:'#e3f0fa', emoji:'🦋' },
  { id:8,  color:'#9b59b6', bg:'#f5eefa', emoji:'🦄' },
  { id:9,  color:'#8e44ad', bg:'#f0e8f8', emoji:'🐙' },
  { id:10, color:'#e91e63', bg:'#fde8f1', emoji:'🦊' },
  { id:11, color:'#ff5722', bg:'#feeee8', emoji:'🐺' },
  { id:12, color:'#009688', bg:'#e6f5f3', emoji:'🦜' },
  { id:13, color:'#607d8b', bg:'#edf1f3', emoji:'🐧' },
  { id:14, color:'#795548', bg:'#f0ebe8', emoji:'🦔' },
  { id:15, color:'#1a3a6b', bg:'#e8edf5', emoji:'🦅' },
  { id:16, color:'#00897b', bg:'#e0f5f2', emoji:'🦦' },
  { id:17, color:'#c0392b', bg:'#fce8e6', emoji:'🦩' },
  { id:18, color:'#6c3483', bg:'#f0e8f8', emoji:'🪲' },
];

const MATERIALES = [
  { id:'motivacion-guia',     label:'I. Motivación/Guía' },
  { id:'clases-sin-pre',      label:'II. Clases Sin-Pre' },
  { id:'temarios',            label:'III. Temarios' },
  { id:'admision-y-examenes', label:'IV. Admisión y Exámenes' },
  { id:'clases-preu-s-i',     label:"V. Clases PreU's I" },
  { id:'clases-preu-s-ii',    label:"VI. Clases PreU's II (Libres)" },
  { id:'recursos-udea',       label:'VII. Recursos UdeA' },
  { id:'diapositivas',        label:'VIII. Diapositivas con TODO' },
  { id:'apuntes',             label:'IX. Apuntes Estudio' },
  { id:'textos',              label:'X. Textos Varios' },
  { id:'modulos-teoricos',    label:'XI. Módulos Teóricos' },
  { id:'modulos-especiales',  label:'XII. Módulos Especiales' },
  { id:'ejercicios',          label:'XIII. Ejercicios Prácticas' },
  { id:'simulacros',          label:'XIV. Simulacros' },
  { id:'simulacros-cal',      label:'XV. Simulacros Calificados' },
  { id:'apps',                label:"XVI. App's Estudio (Android)" },
  { id:'clases-vivo',         label:'Clases en vivo/grabadas' },
  { id:'donativos',           label:'Donativos' },
  { id:'formulario',          label:'Formulario Económico' },
  { id:'medios',              label:'Medios de Sin-Presupuesto' },
  { id:'tomos',               label:'Tomos' },
];

let currentUser = null;
let userProfile = null;
let tempAvatarId = null;
let confirmationResult = null; // para teléfono

function showToast(msg, duration, type) {
  duration = duration || 2500;
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  if (type === 'success') t.style.background = '#1a7a4a';
  if (type === 'error')   t.style.background = '#c0392b';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

async function loadProfile(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : null;
}
async function saveProfile(uid, data) {
  await setDoc(doc(db, 'usuarios', uid), data, { merge: true });
}
async function saveAvance(uid, avance) {
  await updateDoc(doc(db, 'usuarios', uid), { avance });
}
function getAvatar(id) { return AVATARS.find(a => a.id === id) || AVATARS[0]; }

function renderAvatarPicker(selectedId) {
  return AVATARS.map(a => `
    <button class="avatar-opt ${a.id === selectedId ? 'av-selected' : ''}"
      data-id="${a.id}" data-color="${a.color}" data-bg="${a.bg}"
      style="background:${a.bg};border:2px solid ${a.id === selectedId ? a.color : 'transparent'};
             width:50px;height:50px;border-radius:50%;font-size:1.5rem;cursor:pointer;transition:all .2s;"
    >${a.emoji}</button>`).join('');
}

// ─── CREAR PERFIL PARA LOGIN SOCIAL ──────────────────────
async function ensureProfile(user) {
  let profile = await loadProfile(user.uid);
  if (!profile) {
    // Nuevo usuario social — crear perfil básico
    const parts    = (user.displayName || 'Estudiante Sin-Pre').split(' ');
    const nombre   = parts[0] || 'Estudiante';
    const apellido = parts.slice(1).join(' ') || 'Sin-Pre';
    const avance   = {};
    MATERIALES.forEach(m => avance[m.id] = false);
    profile = { nombre, apellido, email: user.email || '', avatarId: 1, avance, creadoEn: new Date().toISOString() };
    await saveProfile(user.uid, profile);
  }
  return profile;
}

// ─── NAV ──────────────────────────────────────────────────
function updateStudentNav(user, profile) {
  const btnIn  = document.getElementById('btn-student-login');
  const btnAv  = document.getElementById('btn-avance');
  const btnPer = document.getElementById('btn-perfil');
  if (!btnIn) return;
  if (user && profile) {
    const av = getAvatar(profile.avatarId || 1);
    btnIn.innerHTML = `<span style="font-size:1.1rem">${av.emoji}</span> ${profile.nombre}`;
    btnIn.style.cssText = `background:${av.bg};border:1.5px solid ${av.color};color:${av.color};font-family:'DM Sans',sans-serif;font-size:0.8rem;padding:0.4rem 0.85rem;border-radius:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:0.35rem;`;
    btnIn.onclick = openPerfilModal;
    if (btnAv)  btnAv.style.display = 'flex';
    if (btnPer) btnPer.style.display = 'flex';
  } else {
    btnIn.innerHTML = '👤 Ingresar';
    btnIn.removeAttribute('style');
    btnIn.onclick = openStudentModal;
    if (btnAv)  btnAv.style.display = 'none';
    if (btnPer) btnPer.style.display = 'none';
  }
}

// ─── LOGIN SOCIAL ─────────────────────────────────────────
async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureProfile(result.user);
    closeStudentModal();
    showToast('✓ Bienvenido con Google', 2500, 'success');
  } catch(e) {
    document.getElementById('st-login-err').textContent = e.message;
  }
}

async function loginWithApple() {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    await ensureProfile(result.user);
    closeStudentModal();
    showToast('✓ Bienvenido con Apple', 2500, 'success');
  } catch(e) {
    document.getElementById('st-login-err').textContent = e.message;
  }
}

function showPhonePane() {
  document.getElementById('pane-login').style.display   = 'none';
  document.getElementById('pane-phone').style.display   = 'block';
  document.getElementById('pane-reg').style.display     = 'none';
  document.getElementById('pane-phone-otp').style.display = 'none';
}

async function sendPhoneOTP() {
  const phone = document.getElementById('phone-number').value.trim();
  const err   = document.getElementById('phone-err');
  if (!phone) { err.textContent = 'Ingresa tu número.'; return; }
  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    document.getElementById('pane-phone').style.display     = 'none';
    document.getElementById('pane-phone-otp').style.display = 'block';
    err.textContent = '';
  } catch(e) {
    err.textContent = e.message;
  }
}

async function verifyPhoneOTP() {
  const code = document.getElementById('phone-otp').value.trim();
  const err  = document.getElementById('phone-otp-err');
  try {
    const result = await confirmationResult.confirm(code);
    await ensureProfile(result.user);
    closeStudentModal();
    showToast('✓ Bienvenido', 2500, 'success');
  } catch(e) {
    err.textContent = 'Código incorrecto.';
  }
}

// ─── OLVIDÉ CONTRASEÑA ────────────────────────────────────
async function doForgotPassword() {
  const email = document.getElementById('st-email').value.trim();
  const err   = document.getElementById('st-login-err');
  if (!email) { err.textContent = 'Escribe tu correo arriba primero.'; err.style.color = '#e67e22'; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    err.textContent = '✓ Correo de recuperación enviado.';
    err.style.color = '#1a7a4a';
  } catch(e) {
    err.textContent = 'No se encontró ese correo.';
    err.style.color = '#c0392b';
  }
}

// ─── MODAL ESTUDIANTE ─────────────────────────────────────
function openStudentModal() {
  document.getElementById('student-modal').classList.add('open');
  showStudentTab('login');
  setTimeout(() => document.getElementById('st-email').focus(), 100);
}
function closeStudentModal() {
  document.getElementById('student-modal').classList.remove('open');
  document.getElementById('st-login-err').textContent = '';
  document.getElementById('st-reg-err').textContent   = '';
}
function showStudentTab(tab) {
  ['tab-login','tab-reg'].forEach(id => document.getElementById(id).classList.remove('active'));
  ['pane-login','pane-reg','pane-phone','pane-phone-otp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  if (tab === 'login') {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('pane-login').style.display = 'block';
  } else {
    document.getElementById('tab-reg').classList.add('active');
    document.getElementById('pane-reg').style.display = 'block';
  }
}

async function doStudentLogin() {
  const email = document.getElementById('st-email').value.trim();
  const pass  = document.getElementById('st-pass').value;
  const err   = document.getElementById('st-login-err');
  err.style.color = '#c0392b';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeStudentModal();
    showToast('✓ Bienvenido de nuevo', 2500, 'success');
  } catch(e) {
    err.textContent = e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : e.message;
  }
}

async function doStudentRegister() {
  const nombre   = document.getElementById('st-nombre').value.trim();
  const apellido = document.getElementById('st-apellido').value.trim();
  const email    = document.getElementById('st-remail').value.trim();
  const pass     = document.getElementById('st-rpass').value;
  const avatarId = parseInt(document.querySelector('#reg-avatar-picker .av-selected')?.dataset.id || '1');
  const err      = document.getElementById('st-reg-err');
  if (!nombre || !apellido) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
  if (pass.length < 6)      { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const avance = {};
    MATERIALES.forEach(m => avance[m.id] = false);
    await saveProfile(cred.user.uid, { nombre, apellido, email, avatarId, avance, creadoEn: new Date().toISOString() });
    closeStudentModal();
    showToast('✓ Cuenta creada. ¡Bienvenido!', 3000, 'success');
  } catch(e) {
    err.textContent = e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado.' : e.message;
  }
}

// ─── MODAL AVANCE ─────────────────────────────────────────
function openAvanceModal() {
  if (!currentUser || !userProfile) return;
  const avance = userProfile.avance || {};
  const total  = MATERIALES.length;
  const hechos = MATERIALES.filter(m => avance[m.id]).length;
  const pct    = Math.round((hechos / total) * 100);
  document.getElementById('avance-progress-bar').style.width = pct + '%';
  document.getElementById('avance-progress-text').textContent = `${hechos} de ${total} completados (${pct}%)`;
  document.getElementById('avance-list').innerHTML = MATERIALES.map(m => `
    <label class="avance-item ${avance[m.id] ? 'done' : ''}">
      <input type="checkbox" data-id="${m.id}" ${avance[m.id] ? 'checked' : ''}>
      <span>${m.label}</span>
    </label>`).join('');
  document.getElementById('avance-modal').classList.add('open');
  document.querySelectorAll('.avance-item input').forEach(cb => {
    cb.addEventListener('change', async () => {
      userProfile.avance[cb.dataset.id] = cb.checked;
      cb.closest('.avance-item').classList.toggle('done', cb.checked);
      const h = MATERIALES.filter(m => userProfile.avance[m.id]).length;
      const p = Math.round((h / total) * 100);
      document.getElementById('avance-progress-bar').style.width = p + '%';
      document.getElementById('avance-progress-text').textContent = `${h} de ${total} completados (${p}%)`;
      await saveAvance(currentUser.uid, userProfile.avance);
    });
  });
}
function closeAvanceModal() { document.getElementById('avance-modal').classList.remove('open'); }

// ─── MODAL PERFIL ─────────────────────────────────────────
function openPerfilModal() {
  if (!userProfile) return;
  tempAvatarId = userProfile.avatarId || 1;
  renderPerfilView();
  document.getElementById('perfil-modal').classList.add('open');
}
function closePerfilModal() {
  document.getElementById('perfil-modal').classList.remove('open');
  document.getElementById('perfil-menu-dropdown').style.display = 'none';
}

function renderPerfilView() {
  const av = getAvatar(userProfile.avatarId || 1);
  document.getElementById('perfil-avatar-display').textContent      = av.emoji;
  document.getElementById('perfil-avatar-display').style.background = av.bg;
  document.getElementById('perfil-nombre').textContent = userProfile.nombre + ' ' + userProfile.apellido;
  document.getElementById('perfil-email').textContent  = userProfile.email || '';
  document.getElementById('perfil-desde').textContent  = userProfile.creadoEn
    ? 'Desde ' + new Date(userProfile.creadoEn).toLocaleDateString('es-CO', {year:'numeric', month:'long'}) : '';
  document.getElementById('perfil-view').style.display = 'block';
  document.getElementById('perfil-edit').style.display = 'none';
  document.getElementById('btn-realizar-cambios').style.display = 'block';
  document.getElementById('btn-guardar-cambios').style.display  = 'none';
}

function enterEditMode() {
  tempAvatarId = userProfile.avatarId || 1;
  document.getElementById('edit-nombre').value   = userProfile.nombre   || '';
  document.getElementById('edit-apellido').value = userProfile.apellido || '';
  document.getElementById('edit-email').value    = userProfile.email    || '';
  document.getElementById('edit-avatar-picker').innerHTML = renderAvatarPicker(tempAvatarId);
  document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('av-selected'); b.style.borderColor = 'transparent';
      });
      btn.classList.add('av-selected'); btn.style.borderColor = btn.dataset.color;
      tempAvatarId = parseInt(btn.dataset.id);
      const av = getAvatar(tempAvatarId);
      document.getElementById('perfil-avatar-display').textContent      = av.emoji;
      document.getElementById('perfil-avatar-display').style.background = av.bg;
    });
  });
  document.getElementById('perfil-view').style.display = 'none';
  document.getElementById('perfil-edit').style.display = 'block';
  document.getElementById('btn-realizar-cambios').style.display = 'none';
  document.getElementById('btn-guardar-cambios').style.display  = 'block';
}

async function saveProfileChanges() {
  const nombre   = document.getElementById('edit-nombre').value.trim();
  const apellido = document.getElementById('edit-apellido').value.trim();
  const email    = document.getElementById('edit-email').value.trim();
  const errEl    = document.getElementById('perfil-edit-err');
  if (!nombre || !apellido) { errEl.textContent = 'El nombre y apellido no pueden estar vacíos.'; return; }
  const btn = document.getElementById('btn-guardar-cambios');
  btn.textContent = 'Guardando...'; btn.disabled = true; errEl.textContent = '';
  try {
    await saveProfile(currentUser.uid, { nombre, apellido, avatarId: tempAvatarId });
    userProfile.nombre = nombre; userProfile.apellido = apellido; userProfile.avatarId = tempAvatarId;
    if (email !== currentUser.email) {
      await updateEmail(currentUser, email);
      await saveProfile(currentUser.uid, { email });
      userProfile.email = email;
    }
    renderPerfilView();
    updateStudentNav(currentUser, userProfile);
    showToast('✓ Perfil actualizado', 2500, 'success');
  } catch(e) {
    errEl.textContent = e.code === 'auth/requires-recent-login'
      ? 'Para cambiar el correo debes cerrar sesión y volver a ingresar.' : e.message;
  } finally {
    btn.textContent = 'Guardar cambios'; btn.disabled = false;
  }
}

async function doLogout() {
  await signOut(auth);
  closePerfilModal();
  showToast('Sesión cerrada', 2000);
}

// ─── BORRAR CUENTA ────────────────────────────────────────
function openDeleteModal() {
  document.getElementById('perfil-menu-dropdown').style.display = 'none';
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('delete-pass').value = '';
  document.getElementById('delete-err').textContent = '';
  setTimeout(() => document.getElementById('delete-pass').focus(), 100);
}
function closeDeleteModal() { document.getElementById('delete-modal').classList.remove('open'); }

async function doDeleteAccount() {
  const pass  = document.getElementById('delete-pass').value;
  const errEl = document.getElementById('delete-err');
  const btn   = document.getElementById('btn-confirm-delete');
  if (!pass) { errEl.textContent = 'Ingresa tu contraseña.'; return; }
  btn.textContent = 'Eliminando...'; btn.disabled = true;
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, pass);
    await reauthenticateWithCredential(currentUser, credential);
    await deleteDoc(doc(db, 'usuarios', currentUser.uid));
    await deleteUser(currentUser);
    closeDeleteModal(); closePerfilModal();
    showToast('Cuenta eliminada.', 2500);
  } catch(e) {
    errEl.textContent = (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      ? 'Contraseña incorrecta.' : e.message;
  } finally {
    btn.textContent = 'Sí, eliminar mi cuenta'; btn.disabled = false;
  }
}

async function forgotPasswordDelete() {
  const email = currentUser?.email;
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    document.getElementById('delete-err').textContent = '✓ Correo de recuperación enviado.';
    document.getElementById('delete-err').style.color = '#1a7a4a';
  } catch(e) {
    document.getElementById('delete-err').textContent = e.message;
  }
}

// ─── INYECTAR HTML ────────────────────────────────────────
function injectModals() {
  const DIVIDER = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin:1rem 0">
      <div style="flex:1;height:1px;background:var(--border)"></div>
      <span style="font-size:0.75rem;color:var(--muted)">o continúa con</span>
      <div style="flex:1;height:1px;background:var(--border)"></div>
    </div>`;

  const SOCIAL_BTNS = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem">
      <button onclick="loginWithGoogle()"
        style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.55rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);transition:background .2s;"
        onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Google
      </button>
      <button onclick="loginWithApple()"
        style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.55rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);transition:background .2s;"
        onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
        Apple
      </button>
    </div>
    <button onclick="showPhonePane()"
      style="width:100%;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.55rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.82rem;color:var(--text);transition:background .2s;"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
      📱 Teléfono
    </button>`;

  const html = `
  <!-- RECAPTCHA invisible para teléfono -->
  <div id="recaptcha-container"></div>

  <!-- MODAL ESTUDIANTE -->
  <div class="modal-overlay" id="student-modal">
    <div class="modal" style="max-width:420px">
      <div style="display:flex;gap:0;margin-bottom:1.5rem;border-bottom:2px solid var(--border);">
        <button id="tab-login" class="tab-btn active" onclick="showStudentTab('login')">Ingresar</button>
        <button id="tab-reg"   class="tab-btn"        onclick="showStudentTab('reg')">Registrarse</button>
        <button onclick="closeStudentModal()" style="margin-left:auto;background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>

      <!-- LOGIN -->
      <div id="pane-login">
        <div class="form-group"><label>Correo</label><input type="email" id="st-email" placeholder="tucorreo@gmail.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="st-pass" placeholder="••••••••"></div>
        <p style="font-size:0.82rem;min-height:1.2em" id="st-login-err"></p>
        <button class="btn-submit" onclick="doStudentLogin()">Ingresar</button>
        <p style="text-align:center;margin-top:0.75rem">
          <button onclick="doForgotPassword()" style="background:none;border:none;color:var(--muted);font-size:0.8rem;cursor:pointer;text-decoration:underline;">¿Olvidaste tu contraseña?</button>
        </p>
        ${DIVIDER}
        ${SOCIAL_BTNS}
      </div>

      <!-- TELÉFONO -->
      <div id="pane-phone" style="display:none">
        <button onclick="showStudentTab('login')" style="background:none;border:none;color:var(--muted);font-size:0.82rem;cursor:pointer;margin-bottom:1rem;">← Volver</button>
        <div class="form-group"><label>Número de teléfono</label><input type="tel" id="phone-number" placeholder="+57 300 000 0000"></div>
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="phone-err"></p>
        <button class="btn-submit" onclick="sendPhoneOTP()">Enviar código</button>
      </div>

      <!-- OTP TELÉFONO -->
      <div id="pane-phone-otp" style="display:none">
        <p style="color:var(--muted);font-size:0.85rem;margin-bottom:1rem">Ingresa el código de 6 dígitos enviado a tu número.</p>
        <div class="form-group"><label>Código</label><input type="text" id="phone-otp" placeholder="123456" maxlength="6"></div>
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="phone-otp-err"></p>
        <button class="btn-submit" onclick="verifyPhoneOTP()">Verificar</button>
      </div>

      <!-- REGISTRO -->
      <div id="pane-reg" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div class="form-group"><label>Nombre</label><input type="text" id="st-nombre" placeholder="Joaquín"></div>
          <div class="form-group"><label>Apellido</label><input type="text" id="st-apellido" placeholder="Cortés"></div>
        </div>
        <div class="form-group"><label>Correo</label><input type="email" id="st-remail" placeholder="tucorreo@gmail.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="st-rpass" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group">
          <label>Elige tu avatar</label>
          <div id="reg-avatar-picker" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.3rem"></div>
        </div>
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="st-reg-err"></p>
        <button class="btn-submit" onclick="doStudentRegister()">Crear cuenta</button>
      </div>
    </div>
  </div>

  <!-- MODAL AVANCE -->
  <div class="modal-overlay" id="avance-modal">
    <div class="modal" style="max-width:480px;max-height:80vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Mi avance</h2>
        <button onclick="closeAvanceModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <div style="background:var(--bg3);border-radius:100px;height:10px;margin-bottom:0.5rem;overflow:hidden">
        <div id="avance-progress-bar" style="height:100%;background:var(--accent2);border-radius:100px;transition:width .4s;width:0%"></div>
      </div>
      <p id="avance-progress-text" style="font-size:0.82rem;color:var(--muted);margin-bottom:1.25rem"></p>
      <div id="avance-list" style="display:flex;flex-direction:column;gap:0.4rem"></div>
    </div>
  </div>

  <!-- MODAL PERFIL -->
  <div class="modal-overlay" id="perfil-modal">
    <div class="modal" style="max-width:420px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;position:relative">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Mi perfil</h2>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <div style="position:relative">
            <button id="perfil-menu-btn" style="background:none;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;padding:0.1rem 0.4rem;border-radius:6px;line-height:1;" title="Opciones">⋮</button>
            <div id="perfil-menu-dropdown" style="display:none;position:absolute;right:0;top:110%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:165px;z-index:10;overflow:hidden">
              <button onclick="openDeleteModal()" style="width:100%;padding:0.65rem 1rem;background:none;border:none;color:#c0392b;font-family:'DM Sans',sans-serif;font-size:0.88rem;text-align:left;cursor:pointer;" onmouseover="this.style.background='#fdecea'" onmouseout="this.style.background='none'">🗑 Borrar cuenta</button>
            </div>
          </div>
          <button onclick="closePerfilModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;padding:1rem;background:var(--bg3);border-radius:14px">
        <div id="perfil-avatar-display" style="width:64px;height:64px;border-radius:50%;font-size:2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
        <div>
          <div id="perfil-nombre" style="font-weight:600;font-size:1.05rem;color:var(--accent)"></div>
          <div id="perfil-email"  style="font-size:0.82rem;color:var(--muted)"></div>
          <div id="perfil-desde"  style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem"></div>
        </div>
      </div>
      <div id="perfil-view"></div>
      <div id="perfil-edit" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div class="form-group"><label>Nombre</label><input type="text" id="edit-nombre"></div>
          <div class="form-group"><label>Apellido</label><input type="text" id="edit-apellido"></div>
        </div>
        <div class="form-group"><label>Correo</label><input type="email" id="edit-email"></div>
        <div class="form-group">
          <label>Avatar</label>
          <div id="edit-avatar-picker" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.3rem"></div>
        </div>
        <p style="font-size:0.82rem;min-height:1.2em" id="perfil-edit-err"></p>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:0.75rem">
        <button id="btn-realizar-cambios" class="btn-submit" style="background:var(--accent2)" onclick="enterEditMode()">Realizar cambios</button>
        <button id="btn-guardar-cambios"  class="btn-submit" style="display:none"              onclick="saveProfileChanges()">Guardar cambios</button>
        <button class="btn-submit" style="background:#e74c3c" onclick="doLogout()">Cerrar sesión</button>
      </div>
    </div>
  </div>

  <!-- MODAL BORRAR CUENTA -->
  <div class="modal-overlay" id="delete-modal">
    <div class="modal" style="max-width:380px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <h2 style="font-family:'Fraunces',serif;color:#c0392b">Borrar cuenta</h2>
        <button onclick="closeDeleteModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:1.25rem">Esta acción eliminará tu cuenta y todos tus datos para siempre. No se puede deshacer.</p>
      <div class="form-group"><label>Confirma tu contraseña</label><input type="password" id="delete-pass" placeholder="••••••••"></div>
      <p style="font-size:0.82rem;min-height:1.2em" id="delete-err"></p>
      <button id="btn-confirm-delete" class="btn-submit" style="background:#c0392b" onclick="doDeleteAccount()">Sí, eliminar mi cuenta</button>
      <p style="text-align:center;margin-top:0.75rem">
        <button onclick="forgotPasswordDelete()" style="background:none;border:none;color:var(--muted);font-size:0.8rem;cursor:pointer;text-decoration:underline;">¿Olvidaste tu contraseña?</button>
      </p>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Avatar picker registro
  document.getElementById('reg-avatar-picker').innerHTML = renderAvatarPicker(1);
  document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('av-selected'); b.style.borderColor = 'transparent';
      });
      btn.classList.add('av-selected'); btn.style.borderColor = btn.dataset.color;
    });
  });
  const first = document.querySelector('#reg-avatar-picker .avatar-opt');
  if (first) { first.classList.add('av-selected'); first.style.borderColor = first.dataset.color; }

  // Menú tres puntos
  document.getElementById('perfil-menu-btn').onclick = () => {
    const d = document.getElementById('perfil-menu-dropdown');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('click', e => {
    const d = document.getElementById('perfil-menu-dropdown');
    const b = document.getElementById('perfil-menu-btn');
    if (d && !d.contains(e.target) && e.target !== b) d.style.display = 'none';
  });

  // Enter
  document.getElementById('st-pass')?.addEventListener('keydown',     e => { if(e.key==='Enter') doStudentLogin(); });
  document.getElementById('delete-pass')?.addEventListener('keydown', e => { if(e.key==='Enter') doDeleteAccount(); if(e.key==='Escape') closeDeleteModal(); });
  document.getElementById('phone-otp')?.addEventListener('keydown',   e => { if(e.key==='Enter') verifyPhoneOTP(); });

  // Cerrar modales al click fuera
  ['student-modal','avance-modal','perfil-modal','delete-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) {
        if (id === 'student-modal') closeStudentModal();
        if (id === 'avance-modal')  closeAvanceModal();
        if (id === 'perfil-modal')  closePerfilModal();
        if (id === 'delete-modal')  closeDeleteModal();
      }
    });
  });
}

function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .tab-btn{background:none;border:none;padding:.6rem 1.1rem;font-family:'DM Sans',sans-serif;font-size:.9rem;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s}
    .tab-btn.active{color:var(--accent2);border-bottom-color:var(--accent2);font-weight:600}
    .avance-item{display:flex;align-items:center;gap:.75rem;padding:.55rem .75rem;border-radius:10px;cursor:pointer;transition:background .15s;border:1.5px solid var(--border);background:var(--bg2)}
    .avance-item:hover{background:var(--bg3)}
    .avance-item.done{background:rgba(46,111,196,.07);border-color:var(--accent3)}
    .avance-item input{width:18px;height:18px;accent-color:var(--accent2);cursor:pointer;flex-shrink:0}
    .avance-item span{font-size:.88rem;color:var(--text)}
    .avance-item.done span{color:var(--accent2)}
    #btn-student-login{background:none;border:1.5px solid var(--border);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.8rem;padding:.4rem .85rem;border-radius:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:.35rem}
    #btn-student-login:hover{border-color:var(--accent2);color:var(--accent2)}
    #btn-avance,#btn-perfil{background:none;border:1.5px solid var(--border);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.8rem;padding:.4rem .85rem;border-radius:20px;cursor:pointer;transition:all .2s}
    #btn-avance:hover,#btn-perfil:hover{border-color:var(--accent2);color:var(--accent2)}
  `;
  document.head.appendChild(s);
}

document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  injectModals();
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
      userProfile = await ensureProfile(user);
    } else { userProfile = null; }
    updateStudentNav(user, userProfile);
  });
});

window.openStudentModal    = openStudentModal;
window.closeStudentModal   = closeStudentModal;
window.showStudentTab      = showStudentTab;
window.doStudentLogin      = doStudentLogin;
window.doStudentRegister   = doStudentRegister;
window.doForgotPassword    = doForgotPassword;
window.loginWithGoogle     = loginWithGoogle;
window.loginWithApple      = loginWithApple;
window.showPhonePane       = showPhonePane;
window.sendPhoneOTP        = sendPhoneOTP;
window.verifyPhoneOTP      = verifyPhoneOTP;
window.openAvanceModal     = openAvanceModal;
window.closeAvanceModal    = closeAvanceModal;
window.openPerfilModal     = openPerfilModal;
window.closePerfilModal    = closePerfilModal;
window.enterEditMode       = enterEditMode;
window.saveProfileChanges  = saveProfileChanges;
window.doLogout            = doLogout;
window.openDeleteModal     = openDeleteModal;
window.closeDeleteModal    = closeDeleteModal;
window.doDeleteAccount     = doDeleteAccount;
window.forgotPasswordDelete = forgotPasswordDelete;
