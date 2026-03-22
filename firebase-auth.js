import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, deleteUser, EmailAuthProvider,
  reauthenticateWithCredential, updateEmail, sendPasswordResetEmail,
  GoogleAuthProvider, OAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhlQr5ulNvGqPXMX0wEgc63KjdtvVzcpo",
  authDomain: "sinpresupuesto-f0151.firebaseapp.com",
  projectId: "sinpresupuesto-f0151",
  storageBucket: "sinpresupuesto-f0151.firebasestorage.app",
  messagingSenderId: "263855838882",
  appId: "1:263855838882:web:1a15d6faafe60c5006e9fb"
};

const app    = initializeApp(firebaseConfig);
const auth   = getAuth(app);
const db     = getFirestore(app);
const googleProvider   = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');
const appleProvider     = new OAuthProvider('apple.com');

// ─── UID DEL ADMIN (solo este puede editar) ──────────────
const ADMIN_UID = 'Yx6LxvfXOZQMBU9nxszWZN3mtrz1';

// ─── GÉNERO ───────────────────────────────────────────────
function saludo(genero, tipo) {
  const G = {
    bienvenido:      { M:'✓ Bienvenido de nuevo',        F:'✓ Bienvenida de nuevo',        NB:'✓ Bienvenide de nuevo',        NR:'✓ Bienvenido de nuevo' },
    bienvenidoNuevo: { M:'✓ Cuenta creada. ¡Bienvenido!', F:'✓ Cuenta creada. ¡Bienvenida!', NB:'✓ Cuenta creada. ¡Bienvenide!', NR:'✓ Cuenta creada. ¡Bienvenido!' },
    bienvenidoSocial:{ M:'✓ Bienvenido con Google',       F:'✓ Bienvenida con Google',       NB:'✓ Bienvenide con Google',       NR:'✓ Bienvenido con Google' },
  };
  return (G[tipo] || G['bienvenido'])[genero || 'NR'];
}

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

let currentUser  = null;
let userProfile  = null;
let tempAvatarId = null;
let confirmationResult = null;

// showToast viene de editor.js (cargado antes)
function toast(msg, type) { window.showToast && window.showToast(msg, 2500, type); }

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
             width:48px;height:48px;border-radius:50%;font-size:1.4rem;cursor:pointer;transition:all .2s;"
    >${a.emoji}</button>`).join('');
}

async function ensureProfile(user) {
  let profile = await loadProfile(user.uid);
  if (!profile) {
    const parts  = (user.displayName || 'Estudiante').split(' ');
    const avance = {};
    MATERIALES.forEach(m => avance[m.id] = false);
    profile = {
      nombre: parts[0] || 'Estudiante',
      apellido: parts.slice(1).join(' ') || '',
      email: user.email || '',
      avatarId: 1, genero: 'NR', avance,
      creadoEn: new Date().toISOString()
    };
    await saveProfile(user.uid, profile);
  }
  return profile;
}

function isAdmin(user, profile) {
  // Verificación por UID — el campo admin:true en Firestore es bonus pero no bloqueante
  return user && user.uid === ADMIN_UID;
}

// ─── NAV ──────────────────────────────────────────────────
function updateNav(user, profile) {
  const btnIn  = document.getElementById('btn-student-login');
  const btnAv  = document.getElementById('btn-avance');
  const btnPer = document.getElementById('btn-perfil');
  const btnAdm = document.getElementById('btn-admin-footer');

  // Botón del footer admin
  if (btnAdm) {
    if (isAdmin(user, profile)) {
      btnAdm.textContent = 'Cerrar sesión (admin)';
      btnAdm.style.color = '#c0392b';
      btnAdm.onmouseover = () => btnAdm.style.color = '#922b21';
      btnAdm.onmouseout  = () => btnAdm.style.color = '#c0392b';
      btnAdm.onclick = confirmAdminLogout;
    } else {
      btnAdm.textContent = 'Joaquín L. Cortés';
      btnAdm.style.color = 'var(--border)';
      btnAdm.onmouseover = () => btnAdm.style.color = 'var(--muted)';
      btnAdm.onmouseout  = () => btnAdm.style.color = 'var(--border)';
      btnAdm.onclick = openAdminModal;
    }
  }

  if (!btnIn) return;

  if (user && profile) {
    if (isAdmin(user, profile)) {
      // Admin logueado — no mostrar botones de estudiante
      btnIn.style.display = 'none';
      if (btnAv)  btnAv.style.display = 'none';
      if (btnPer) btnPer.style.display = 'none';
      // Activar editor
      window.activateEditor && window.activateEditor();
      toast('✓ Bienvenido, Joaquín. Modo edición activo.', 'success');
    } else {
      // Estudiante normal
      const av = getAvatar(profile.avatarId || 1);
      btnIn.style.display = '';
      btnIn.innerHTML = `<span style="font-size:1.1rem">${av.emoji}</span> ${profile.nombre}`;
      btnIn.style.cssText = `background:${av.bg};border:1.5px solid ${av.color};color:${av.color};font-family:'DM Sans',sans-serif;font-size:0.8rem;padding:0.4rem 0.85rem;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:0.35rem;white-space:nowrap;max-width:140px;overflow:hidden;`;
      btnIn.onclick = openPerfilModal;
      if (btnAv)  btnAv.style.display = 'flex';
      if (btnPer) btnPer.style.display = 'flex';
    }
  } else {
    // No logueado
    btnIn.style.display = '';
    btnIn.innerHTML = '👤 Ingresar';
    btnIn.removeAttribute('style');
    btnIn.onclick = openStudentModal;
    if (btnAv)  btnAv.style.display = 'none';
    if (btnPer) btnPer.style.display = 'none';
    window.deactivateEditor && window.deactivateEditor();
  }
}

// ─── MODAL ADMIN ──────────────────────────────────────────
function openAdminModal() {
  document.getElementById('admin-modal')?.classList.add('open');
  setTimeout(() => document.getElementById('admin-email')?.focus(), 100);
}
function closeAdminModal() {
  document.getElementById('admin-modal')?.classList.remove('open');
  const err = document.getElementById('admin-err');
  if (err) err.textContent = '';
}
async function doAdminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const pass  = document.getElementById('admin-pass').value;
  const err   = document.getElementById('admin-err');
  err.textContent = '';
  if (!email || !pass) { err.textContent = 'Completa todos los campos.'; return; }
  const btn = document.getElementById('admin-submit');
  btn.textContent = 'Verificando...'; btn.disabled = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    // Verificar UID primero (rápido, sin red extra)
    if (cred.user.uid !== ADMIN_UID) {
      await signOut(auth);
      err.textContent = 'No tienes permisos de administrador.';
      return;
    }
    // Leer perfil con loadProfile (NO ensureProfile para no sobrescribir admin:true)
    const profile = await loadProfile(cred.user.uid);
    // Si por alguna razón no tiene admin:true aún, lo agregamos ahora
    if (!profile?.admin) {
      await saveProfile(cred.user.uid, { admin: true });
    }
    closeAdminModal();
    // updateNav se llama por onAuthStateChanged
  } catch(e) {
    err.textContent = e.code === 'auth/invalid-credential'
      ? 'Correo o contraseña incorrectos.' : e.message;
  } finally {
    btn.textContent = 'Ingresar'; btn.disabled = false;
  }
}
function confirmAdminLogout() {
  document.getElementById('admin-logout-modal')?.classList.add('open');
}
function closeAdminLogoutModal() {
  document.getElementById('admin-logout-modal')?.classList.remove('open');
}
async function doAdminLogout() {
  await signOut(auth);
  closeAdminLogoutModal();
  toast('Sesión de administrador cerrada.');
}
function adminForgotPassword() {
  window.open('https://accounts.google.com/signin/recovery', '_blank');
}

// ─── MODAL ESTUDIANTE ─────────────────────────────────────
function openStudentModal() {
  document.getElementById('student-modal')?.classList.add('open');
  showStudentTab('login');
  setTimeout(() => document.getElementById('st-email')?.focus(), 100);
}
function closeStudentModal() {
  document.getElementById('student-modal')?.classList.remove('open');
  if(document.getElementById('st-login-err')) document.getElementById('st-login-err').textContent = '';
  if(document.getElementById('st-reg-err'))   document.getElementById('st-reg-err').textContent = '';
}
function showStudentTab(tab) {
  ['tab-login','tab-reg'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  ['pane-login','pane-reg','pane-phone','pane-phone-otp'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  if (tab === 'login') {
    document.getElementById('tab-login')?.classList.add('active');
    if(document.getElementById('pane-login')) document.getElementById('pane-login').style.display = 'block';
  } else {
    document.getElementById('tab-reg')?.classList.add('active');
    if(document.getElementById('pane-reg')) document.getElementById('pane-reg').style.display = 'block';
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
    // El saludo se muestra en onAuthStateChanged cuando userProfile ya está cargado
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
  const genero   = document.getElementById('st-genero').value;
  const err      = document.getElementById('st-reg-err');
  if (!nombre || !apellido) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
  if (pass.length < 6)      { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const avance = {};
    MATERIALES.forEach(m => avance[m.id] = false);
    await saveProfile(cred.user.uid, { nombre, apellido, email, avatarId, genero, avance, creadoEn: new Date().toISOString() });
    closeStudentModal();
    toast(saludo(genero, 'bienvenidoNuevo'), 'success');
  } catch(e) {
    err.textContent = e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado.' : e.message;
  }
}
async function loginWithGoogle() {
  try {
    const result  = await signInWithPopup(auth, googleProvider);
    const profile = await ensureProfile(result.user);
    closeStudentModal();
    if (!isAdmin(result.user, profile)) {
      toast(saludo(profile.genero, 'bienvenidoSocial'), 'success');
    }
  } catch(e) {
    if(document.getElementById('st-login-err'))
      document.getElementById('st-login-err').textContent = e.message;
  }
}
async function loginWithMicrosoft() {
  try {
    const result  = await signInWithPopup(auth, microsoftProvider);
    const profile = await ensureProfile(result.user);
    closeStudentModal();
    if (!isAdmin(result.user, profile)) {
      toast(saludo(profile.genero, 'bienvenidoSocial').replace('Google', 'Microsoft'), 'success');
    }
  } catch(e) {
    if(document.getElementById('st-login-err'))
      document.getElementById('st-login-err').textContent = e.message;
  }
}
async function loginWithApple() {
  try {
    const result  = await signInWithPopup(auth, appleProvider);
    const profile = await ensureProfile(result.user);
    closeStudentModal();
    if (!isAdmin(result.user, profile)) {
      toast(saludo(profile.genero, 'bienvenidoSocial').replace('Google', 'Apple'), 'success');
    }
  } catch(e) {
    if(document.getElementById('st-login-err'))
      document.getElementById('st-login-err').textContent = e.message;
  }
}
function showPhonePane() {
  ['pane-login','pane-reg','pane-phone-otp'].forEach(id => {
    const el = document.getElementById(id); if(el) el.style.display = 'none';
  });
  if(document.getElementById('pane-phone')) document.getElementById('pane-phone').style.display = 'block';
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
    if(document.getElementById('pane-phone'))     document.getElementById('pane-phone').style.display = 'none';
    if(document.getElementById('pane-phone-otp')) document.getElementById('pane-phone-otp').style.display = 'block';
    err.textContent = '';
  } catch(e) { err.textContent = e.message; }
}
async function verifyPhoneOTP() {
  const code = document.getElementById('phone-otp').value.trim();
  const err  = document.getElementById('phone-otp-err');
  try {
    const result  = await confirmationResult.confirm(code);
    const profile = await ensureProfile(result.user);
    closeStudentModal();
    toast(saludo(profile.genero, 'bienvenidoSocial'), 'success');
  } catch(e) { err.textContent = 'Código incorrecto.'; }
}
async function doForgotPassword() {
  const email = document.getElementById('st-email').value.trim();
  const err   = document.getElementById('st-login-err');
  if (!email) { err.textContent = 'Escribe tu correo arriba primero.'; err.style.color = '#e67e22'; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    err.textContent = '✓ Correo de recuperación enviado.'; err.style.color = '#1a7a4a';
  } catch(e) { err.textContent = 'No se encontró ese correo.'; err.style.color = '#c0392b'; }
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
  if(document.getElementById('perfil-menu-dropdown'))
    document.getElementById('perfil-menu-dropdown').style.display = 'none';
}
function renderPerfilView() {
  // Volver al tamaño compacto en vista normal
  const box = document.getElementById('perfil-modal-box');
  if (box) { box.style.maxWidth = '420px'; box.style.width = ''; }
  const av = getAvatar(userProfile.avatarId || 1);
  document.getElementById('perfil-avatar-display').textContent      = av.emoji;
  document.getElementById('perfil-avatar-display').style.background = av.bg;
  document.getElementById('perfil-nombre').textContent = userProfile.nombre + ' ' + userProfile.apellido;
  document.getElementById('perfil-email').textContent  = userProfile.email || '';
  document.getElementById('perfil-desde').textContent  = userProfile.creadoEn
    ? 'Desde ' + new Date(userProfile.creadoEn).toLocaleDateString('es-CO', {year:'numeric', month:'long'}) : '';
  // Mostrar vista normal, ocultar edición
  document.getElementById('perfil-view').style.display = 'block';
  document.getElementById('perfil-edit').style.display = 'none';
}
function enterEditMode() {
  // Ampliar modal para layout horizontal de edición
  const box = document.getElementById('perfil-modal-box');
  if (box) { box.style.maxWidth = '640px'; box.style.width = '95vw'; }
  tempAvatarId = userProfile.avatarId || 1;
  document.getElementById('edit-nombre').value   = userProfile.nombre   || '';
  document.getElementById('edit-apellido').value = userProfile.apellido || '';
  document.getElementById('edit-email').value    = userProfile.email    || '';
  document.getElementById('edit-genero').value   = userProfile.genero   || 'NR';

  // Actualizar preview grande con el avatar actual
  const currentAv = getAvatar(tempAvatarId);
  const editPreview = document.getElementById('edit-avatar-preview');
  if (editPreview) {
    editPreview.textContent = currentAv.emoji;
    editPreview.style.background   = currentAv.bg;
    editPreview.style.borderColor  = currentAv.color;
  }

  document.getElementById('edit-avatar-picker').innerHTML = renderAvatarPicker(tempAvatarId);
  document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('av-selected'); b.style.borderColor = 'transparent';
      });
      btn.classList.add('av-selected'); btn.style.borderColor = btn.dataset.color;
      tempAvatarId = parseInt(btn.dataset.id);
      const av = getAvatar(tempAvatarId);
      // Actualizar preview del editor Y la tarjeta de perfil
      if (editPreview) {
        editPreview.textContent = av.emoji;
        editPreview.style.background  = av.bg;
        editPreview.style.borderColor = av.color;
      }
      document.getElementById('perfil-avatar-display').textContent      = av.emoji;
      document.getElementById('perfil-avatar-display').style.background = av.bg;
    });
  });

  document.getElementById('perfil-view').style.display = 'none';
  document.getElementById('perfil-edit').style.display = 'block';
}
async function saveProfileChanges() {
  const nombre   = document.getElementById('edit-nombre').value.trim();
  const apellido = document.getElementById('edit-apellido').value.trim();
  const email    = document.getElementById('edit-email').value.trim();
  const genero   = document.getElementById('edit-genero').value;
  const errEl    = document.getElementById('perfil-edit-err');
  if (!nombre || !apellido) { errEl.textContent = 'El nombre y apellido no pueden estar vacíos.'; return; }
  const btn = document.getElementById('btn-guardar-cambios');
  btn.textContent = 'Guardando...'; btn.disabled = true; errEl.textContent = '';
  try {
    // Guardar nombre, apellido, avatar y género en Firestore (no requiere reautenticación)
    await saveProfile(currentUser.uid, { nombre, apellido, avatarId: tempAvatarId, genero });
    userProfile.nombre = nombre; userProfile.apellido = apellido;
    userProfile.avatarId = tempAvatarId; userProfile.genero = genero;

    // Cambio de correo — requiere reautenticación reciente
    if (email && email !== currentUser.email) {
      try {
        await updateEmail(currentUser, email);
        await saveProfile(currentUser.uid, { email });
        userProfile.email = email;
      } catch(emailErr) {
        if (emailErr.code === 'auth/requires-recent-login' || emailErr.code === 'auth/user-token-expired') {
          // Mostrar modal de reautenticación para cambio de correo
          errEl.textContent = '';
          renderPerfilView();
          updateNav(currentUser, userProfile);
          toast('✓ Datos guardados. Para cambiar el correo debes verificar tu contraseña.', 'success');
          openReauthModal(email);
          return;
        }
        throw emailErr;
      }
    }

    renderPerfilView();
    updateNav(currentUser, userProfile);
    toast('✓ Perfil actualizado', 'success');
  } catch(e) {
    if (e.code === 'auth/requires-recent-login' || e.code === 'auth/user-token-expired') {
      errEl.textContent = 'Tu sesión expiró. Cierra sesión, vuelve a ingresar e intenta de nuevo.';
    } else {
      errEl.textContent = e.message;
    }
  } finally { btn.textContent = 'Guardar cambios'; btn.disabled = false; }
}

// Modal de reautenticación para cambio de correo
function openReauthModal(newEmail) {
  document.getElementById('reauth-new-email').value = newEmail || '';
  document.getElementById('reauth-modal').classList.add('open');
  document.getElementById('reauth-err').textContent = '';
  document.getElementById('reauth-pass').value = '';
  setTimeout(() => document.getElementById('reauth-pass')?.focus(), 100);
}
function closeReauthModal() {
  document.getElementById('reauth-modal').classList.remove('open');
}
async function doReauth() {
  const pass     = document.getElementById('reauth-pass').value;
  const newEmail = document.getElementById('reauth-new-email').value;
  const errEl    = document.getElementById('reauth-err');
  const btn      = document.getElementById('btn-reauth-confirm');
  if (!pass) { errEl.textContent = 'Ingresa tu contraseña.'; return; }
  btn.textContent = 'Verificando...'; btn.disabled = true;
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, pass);
    await reauthenticateWithCredential(currentUser, credential);
    await updateEmail(currentUser, newEmail);
    await saveProfile(currentUser.uid, { email: newEmail });
    userProfile.email = newEmail;
    closeReauthModal();
    updateNav(currentUser, userProfile);
    toast('✓ Correo actualizado correctamente', 'success');
  } catch(e) {
    errEl.textContent = (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      ? 'Contraseña incorrecta.' : e.message;
  } finally { btn.textContent = 'Confirmar'; btn.disabled = false; }
}
async function doLogout() {
  await signOut(auth);
  closePerfilModal();
  toast('Sesión cerrada');
}

// ─── BORRAR CUENTA ────────────────────────────────────────
function openDeleteModal() {
  if(document.getElementById('perfil-menu-dropdown'))
    document.getElementById('perfil-menu-dropdown').style.display = 'none';
  document.getElementById('delete-modal').classList.add('open');
  if(document.getElementById('delete-pass')) document.getElementById('delete-pass').value = '';
  if(document.getElementById('delete-err'))  document.getElementById('delete-err').textContent = '';
  setTimeout(() => document.getElementById('delete-pass')?.focus(), 100);
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
    toast('Cuenta eliminada.');
  } catch(e) {
    errEl.textContent = (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      ? 'Contraseña incorrecta.' : e.message;
  } finally { btn.textContent = 'Sí, eliminar mi cuenta'; btn.disabled = false; }
}
async function forgotPasswordDelete() {
  const email = currentUser?.email;
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    document.getElementById('delete-err').textContent = '✓ Correo enviado.';
    document.getElementById('delete-err').style.color = '#1a7a4a';
  } catch(e) { document.getElementById('delete-err').textContent = e.message; }
}

// ─── INYECTAR HTML ────────────────────────────────────────
function injectModals() {
  const DIVIDER = `<div style="display:flex;align-items:center;gap:.75rem;margin:1rem 0"><div style="flex:1;height:1px;background:var(--border)"></div><span style="font-size:.75rem;color:var(--muted)">o continúa con</span><div style="flex:1;height:1px;background:var(--border)"></div></div>`;
    const SOCIAL  = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:.5rem">
    <button onclick="loginWithMicrosoft()" class="social-btn">
      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
      Microsoft
    </button>
    <button onclick="showPhonePane()" class="social-btn">📱 Teléfono</button>
    <button onclick="loginWithGoogle()" class="social-btn" style="grid-column:1/3">
      <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Google
    </button>
  </div>`;
  const GENERO = `<div class="form-group"><label>Género</label><select id="st-genero" style="width:100%;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:.65rem .9rem;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;"><option value="M">Masculino</option><option value="F">Femenino</option><option value="NB">No binario</option><option value="NR">Prefiero no responder</option></select></div>`;

  const html = `
  <div id="recaptcha-container"></div>

  <!-- MODAL ESTUDIANTE -->
  <div class="modal-overlay" id="student-modal">
    <div class="modal" id="student-modal-box" style="max-width:600px;max-height:92vh;overflow-y:auto">
      <div style="display:flex;gap:0;margin-bottom:1.5rem;border-bottom:2px solid var(--border);position:sticky;top:0;background:var(--bg2);z-index:1;padding-top:.25rem">
        <button id="tab-login" class="tab-btn active" onclick="showStudentTab('login')">Ingresar</button>
        <button id="tab-reg"   class="tab-btn"        onclick="showStudentTab('reg')">Registrarse</button>
        <button onclick="closeStudentModal()" style="margin-left:auto;background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;padding:.5rem;">✕</button>
      </div>

      <!-- LOGIN -->
      <div id="pane-login">
        <div class="form-group"><label>Correo</label><input type="email" id="st-email" placeholder="tucorreo@gmail.com" inputmode="email"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="st-pass" placeholder="••••••••" inputmode="none"></div>
        <p style="font-size:.82rem;min-height:1.2em" id="st-login-err"></p>
        <button class="btn-submit" onclick="doStudentLogin()">Ingresar</button>
        <p style="text-align:center;margin-top:.75rem"><button onclick="doForgotPassword()" style="background:none;border:none;color:var(--muted);font-size:.8rem;cursor:pointer;text-decoration:underline;">¿Olvidaste tu contraseña?</button></p>
        ${DIVIDER}${SOCIAL}
      </div>

      <!-- TELÉFONO -->
      <div id="pane-phone" style="display:none">
        <button onclick="showStudentTab('login')" style="background:none;border:none;color:var(--muted);font-size:.82rem;cursor:pointer;margin-bottom:1rem;">← Volver</button>
        <div class="form-group"><label>Número de teléfono</label><input type="tel" id="phone-number" placeholder="+57 300 000 0000"></div>
        <p style="color:#c0392b;font-size:.82rem;min-height:1.2em" id="phone-err"></p>
        <button class="btn-submit" onclick="sendPhoneOTP()">Enviar código</button>
      </div>
      <div id="pane-phone-otp" style="display:none">
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:1rem">Ingresa el código de 6 dígitos enviado a tu número.</p>
        <div class="form-group"><label>Código</label><input type="text" id="phone-otp" placeholder="123456" maxlength="6"></div>
        <p style="color:#c0392b;font-size:.82rem;min-height:1.2em" id="phone-otp-err"></p>
        <button class="btn-submit" onclick="verifyPhoneOTP()">Verificar</button>
      </div>

      <!-- REGISTRO HORIZONTAL -->
      <div id="pane-reg" style="display:none">
        <div class="reg-layout">
          <!-- Columna izquierda: avatar preview grande -->
          <div class="reg-avatar-col">
            <div id="reg-avatar-preview" style="font-size:4rem;width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg3);border:2px solid var(--border);transition:all .3s;">🦁</div>
            <p style="font-size:.75rem;color:var(--muted);margin-top:.5rem;text-align:center;">Tu avatar</p>
          </div>
          <!-- Columna centro: campos -->
          <div class="reg-fields-col">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
              <div class="form-group"><label>Nombre</label><input type="text" id="st-nombre" placeholder="Joaquín"></div>
              <div class="form-group"><label>Apellido</label><input type="text" id="st-apellido" placeholder="Cortés"></div>
            </div>
            <div class="form-group"><label>Correo</label><input type="email" id="st-remail" placeholder="tucorreo@gmail.com"></div>
            <div class="form-group"><label>Contraseña</label><input type="password" id="st-rpass" placeholder="Mínimo 6 caracteres"></div>
            <div class="form-group"><label>Género</label>
              <select id="st-genero" style="width:100%;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:.65rem .9rem;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;">
                <option value="M">Masculino</option><option value="F">Femenino</option>
                <option value="NB">No binario</option><option value="NR">Prefiero no responder</option>
              </select>
            </div>
          </div>
          <!-- Columna derecha: picker de avatares -->
          <div class="reg-picker-col">
            <p style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Elige tu avatar</p>
            <div id="reg-avatar-picker" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;"></div>
          </div>
        </div>
        <!-- Botón debajo de todo -->
        <p style="color:#c0392b;font-size:.82rem;min-height:1.2em;margin-top:.75rem" id="st-reg-err"></p>
        <button class="btn-submit" onclick="doStudentRegister()">Crear cuenta</button>
      </div>
    </div>
  </div>

  <!-- MODAL AVANCE --><!-- MODAL AVANCE -->
  <div class="modal-overlay" id="avance-modal">
    <div class="modal" style="max-width:480px;max-height:85vh;overflow-y:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;position:sticky;top:0;background:var(--bg2);padding-top:.25rem">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Mi avance</h2>
        <button onclick="closeAvanceModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <div style="background:var(--bg3);border-radius:100px;height:10px;margin-bottom:.5rem;overflow:hidden">
        <div id="avance-progress-bar" style="height:100%;background:var(--accent2);border-radius:100px;transition:width .4s;width:0%"></div>
      </div>
      <p id="avance-progress-text" style="font-size:.82rem;color:var(--muted);margin-bottom:1.25rem"></p>
      <div id="avance-list" style="display:flex;flex-direction:column;gap:.4rem"></div>
    </div>
  </div>

  <!-- MODAL PERFIL -->
  <div class="modal-overlay" id="perfil-modal">
    <div class="modal" id="perfil-modal-box" style="max-width:420px;max-height:92vh;overflow-y:auto;transition:max-width .28s cubic-bezier(.4,0,.2,1);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;position:sticky;top:0;background:var(--bg2);padding-top:.25rem">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Mi perfil</h2>
        <div style="display:flex;align-items:center;gap:.5rem">
          <div style="position:relative">
            <button id="perfil-menu-btn" style="background:none;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;padding:.1rem .4rem;border-radius:6px;line-height:1;">⋮</button>
            <div id="perfil-menu-dropdown" style="display:none;position:absolute;right:0;top:110%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:165px;z-index:10;overflow:hidden">
              <button onclick="openDeleteModal()" style="width:100%;padding:.65rem 1rem;background:none;border:none;color:#c0392b;font-family:'DM Sans',sans-serif;font-size:.88rem;text-align:left;cursor:pointer;" onmouseover="this.style.background='#fdecea'" onmouseout="this.style.background='none'">🗑 Borrar cuenta</button>
            </div>
          </div>
          <button onclick="closePerfilModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;padding:1rem;background:var(--bg3);border-radius:14px">
        <div id="perfil-avatar-display" style="width:64px;height:64px;border-radius:50%;font-size:2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
        <div>
          <div id="perfil-nombre" style="font-weight:600;font-size:1.05rem;color:var(--accent)"></div>
          <div id="perfil-email"  style="font-size:.82rem;color:var(--muted)"></div>
          <div id="perfil-desde"  style="font-size:.78rem;color:var(--muted);margin-top:.2rem"></div>
        </div>
      </div>
      <!-- VISTA NORMAL: solo botones -->
      <div id="perfil-view" style="display:flex;flex-direction:column;gap:.6rem;margin-top:.5rem">
        <button class="btn-submit" style="background:var(--accent2)" onclick="enterEditMode()">Realizar cambios</button>
        <button class="btn-submit" style="background:#e74c3c" onclick="doLogout()">Cerrar sesión</button>
      </div>

      <!-- VISTA EDICIÓN: layout horizontal igual al registro -->
      <div id="perfil-edit" style="display:none">
        <div class="reg-layout">
          <!-- Columna izquierda: avatar preview grande -->
          <div class="reg-avatar-col">
            <div id="edit-avatar-preview" style="font-size:4rem;width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg3);border:2px solid var(--border);transition:all .3s;">🦁</div>
            <p style="font-size:.75rem;color:var(--muted);margin-top:.5rem;text-align:center;">Tu avatar</p>
          </div>
          <!-- Columna centro: campos -->
          <div class="reg-fields-col">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem">
              <div class="form-group"><label>Nombre</label><input type="text" id="edit-nombre" inputmode="text"></div>
              <div class="form-group"><label>Apellido</label><input type="text" id="edit-apellido" inputmode="text"></div>
            </div>
            <div class="form-group"><label>Correo</label><input type="email" id="edit-email" inputmode="email"></div>
            <div class="form-group"><label>Género</label>
              <select id="edit-genero" style="width:100%;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;padding:.65rem .9rem;color:var(--text);font-family:'DM Sans',sans-serif;font-size:.9rem;outline:none;">
                <option value="M">Masculino</option><option value="F">Femenino</option>
                <option value="NB">No binario</option><option value="NR">Prefiero no responder</option>
              </select>
            </div>
          </div>
          <!-- Columna derecha: picker de avatares -->
          <div class="reg-picker-col">
            <p style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Elige tu avatar</p>
            <div id="edit-avatar-picker" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;"></div>
          </div>
        </div>
        <p style="font-size:.82rem;min-height:1.2em;margin-top:.5rem" id="perfil-edit-err"></p>
      </div>
    </div>
  </div>

  <!-- MODAL REAUTENTICACIÓN (cambio de correo) -->
  <div class="modal-overlay" id="reauth-modal">
    <div class="modal" style="max-width:360px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Verificar identidad</h2>
        <button onclick="closeReauthModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <p style="color:var(--muted);font-size:.88rem;margin-bottom:1.25rem">Para cambiar tu correo necesitamos verificar tu identidad.</p>
      <input type="hidden" id="reauth-new-email">
      <div class="form-group"><label>Tu contraseña actual</label><input type="password" id="reauth-pass" placeholder="••••••••"></div>
      <p style="color:#c0392b;font-size:.82rem;min-height:1.2em" id="reauth-err"></p>
      <button id="btn-reauth-confirm" class="btn-submit" onclick="doReauth()">Confirmar cambio de correo</button>
    </div>
  </div>

  <!-- MODAL BORRAR CUENTA -->
  <div class="modal-overlay" id="delete-modal">
    <div class="modal" style="max-width:380px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
        <h2 style="font-family:'Fraunces',serif;color:#c0392b">Borrar cuenta</h2>
        <button onclick="closeDeleteModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <p style="color:var(--muted);font-size:.88rem;margin-bottom:1.25rem">Esta acción eliminará tu cuenta y todos tus datos para siempre.</p>
      <div class="form-group"><label>Confirma tu contraseña</label><input type="password" id="delete-pass" placeholder="••••••••"></div>
      <p style="font-size:.82rem;min-height:1.2em" id="delete-err"></p>
      <button id="btn-confirm-delete" class="btn-submit" style="background:#c0392b" onclick="doDeleteAccount()">Sí, eliminar mi cuenta</button>
      <p style="text-align:center;margin-top:.75rem"><button onclick="forgotPasswordDelete()" style="background:none;border:none;color:var(--muted);font-size:.8rem;cursor:pointer;text-decoration:underline;">¿Olvidaste tu contraseña?</button></p>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Avatar picker registro — también actualiza el preview grande
  document.getElementById('reg-avatar-picker').innerHTML = renderAvatarPicker(1);
  function initRegPicker() {
    document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(b => {
          b.classList.remove('av-selected'); b.style.borderColor = 'transparent';
        });
        btn.classList.add('av-selected'); btn.style.borderColor = btn.dataset.color;
        // Actualizar preview grande
        const preview = document.getElementById('reg-avatar-preview');
        if (preview) {
          preview.textContent = btn.textContent.trim();
          preview.style.background = btn.dataset.bg;
          preview.style.borderColor = btn.dataset.color;
        }
      });
    });
  }
  initRegPicker();
  const first = document.querySelector('#reg-avatar-picker .avatar-opt');
  if (first) {
    first.classList.add('av-selected');
    first.style.borderColor = first.dataset.color;
    const preview = document.getElementById('reg-avatar-preview');
    if (preview) { preview.style.background = first.dataset.bg; preview.style.borderColor = first.dataset.color; }
  }

  // Menú tres puntos
  document.getElementById('perfil-menu-btn').onclick = () => {
    const d = document.getElementById('perfil-menu-dropdown');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('mousedown', e => {
    const d = document.getElementById('perfil-menu-dropdown');
    const b = document.getElementById('perfil-menu-btn');
    if (d && d.style.display === 'block' && !d.contains(e.target) && e.target !== b)
      d.style.display = 'none';
  });

  // Enter
  document.getElementById('st-pass')?.addEventListener('keydown',     e => { if(e.key==='Enter') doStudentLogin(); });
  document.getElementById('delete-pass')?.addEventListener('keydown', e => { if(e.key==='Enter') doDeleteAccount(); if(e.key==='Escape') closeDeleteModal(); });
  document.getElementById('phone-otp')?.addEventListener('keydown',   e => { if(e.key==='Enter') verifyPhoneOTP(); });

  // Cerrar modales con mousedown en overlay
  ['student-modal','avance-modal','perfil-modal','delete-modal','reauth-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('mousedown', e => {
      if (e.target.id === id) {
        if (id==='student-modal') closeStudentModal();
        if (id==='avance-modal')  closeAvanceModal();
        if (id==='perfil-modal')  closePerfilModal();
        if (id==='delete-modal')  closeDeleteModal();
        if (id==='reauth-modal')   closeReauthModal();
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
    .social-btn{display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.55rem;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;color:var(--text);transition:background .2s;width:100%}
    .social-btn:hover{background:var(--bg3)}
    #btn-student-login{background:none;border:1.5px solid var(--border);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.8rem;padding:.4rem .85rem;border-radius:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:.35rem;white-space:nowrap;max-width:140px;overflow:hidden}
    #btn-student-login:hover{border-color:var(--accent2);color:var(--accent2)}
    #btn-avance,#btn-perfil{background:none;border:1.5px solid var(--border);color:var(--muted);font-family:'DM Sans',sans-serif;font-size:.8rem;padding:.4rem .85rem;border-radius:20px;cursor:pointer;transition:all .2s;white-space:nowrap}
    #btn-avance:hover,#btn-perfil:hover{border-color:var(--accent2);color:var(--accent2)}
    @media(max-width:600px){
      .modal{padding:1.25rem;border-radius:14px 14px 0 0;position:fixed;bottom:0;left:0;right:0;max-width:100%!important;max-height:92vh;overflow-y:auto}
      .modal-overlay{align-items:flex-end}
      .nav-links{display:none}
      #btn-student-login{max-width:110px;font-size:.75rem;padding:.35rem .6rem}
      #btn-avance,#btn-perfil{font-size:.75rem;padding:.35rem .6rem}
    }
  `;
  document.head.appendChild(s);
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  injectModals();

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
      userProfile = await ensureProfile(user);
      // Si es estudiante normal (no admin), mostrar saludo al cargar
      if (!isAdmin(user, userProfile)) {
        toast(saludo(userProfile.genero, 'bienvenido'), 'success');
      }
    } else {
      userProfile = null;
    }
    updateNav(user, userProfile);
  });

  // Admin modal listeners
  document.getElementById('admin-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doAdminLogin();
    if (e.key === 'Escape') closeAdminModal();
  });
  document.getElementById('admin-submit')?.addEventListener('click', doAdminLogin);
  document.getElementById('admin-modal')?.addEventListener('mousedown', e => {
    if (e.target.id === 'admin-modal') closeAdminModal();
  });
  document.getElementById('admin-logout-modal')?.addEventListener('mousedown', e => {
    if (e.target.id === 'admin-logout-modal') closeAdminLogoutModal();
  });
});

window.openAdminModal        = openAdminModal;
window.closeAdminModal       = closeAdminModal;
window.doAdminLogin          = doAdminLogin;
window.confirmAdminLogout    = confirmAdminLogout;
window.closeAdminLogoutModal = closeAdminLogoutModal;
window.doAdminLogout         = doAdminLogout;
window.adminForgotPassword   = adminForgotPassword;
window.openStudentModal      = openStudentModal;
window.closeStudentModal     = closeStudentModal;
window.showStudentTab        = showStudentTab;
window.doStudentLogin        = doStudentLogin;
window.doStudentRegister     = doStudentRegister;
window.doForgotPassword      = doForgotPassword;
window.loginWithGoogle       = loginWithGoogle;
window.loginWithMicrosoft    = loginWithMicrosoft;
window.loginWithApple        = loginWithApple;
window.showPhonePane         = showPhonePane;
window.sendPhoneOTP          = sendPhoneOTP;
window.verifyPhoneOTP        = verifyPhoneOTP;
window.openAvanceModal       = openAvanceModal;
window.closeAvanceModal      = closeAvanceModal;
window.openPerfilModal       = openPerfilModal;
window.closePerfilModal      = closePerfilModal;
window.enterEditMode         = enterEditMode;
window.saveProfileChanges    = saveProfileChanges;
window.doLogout              = doLogout;
window.openDeleteModal       = openDeleteModal;
window.closeDeleteModal      = closeDeleteModal;
window.doDeleteAccount       = doDeleteAccount;
window.forgotPasswordDelete  = forgotPasswordDelete;
window.openReauthModal       = openReauthModal;
window.closeReauthModal      = closeReauthModal;
window.doReauth              = doReauth;
