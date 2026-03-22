// ─── FIREBASE CONFIG ─────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhlQr5ulNvGqPXMX0wEgc63KjdtvVzcpo",
  authDomain: "sinpresupuesto-f0151.firebaseapp.com",
  projectId: "sinpresupuesto-f0151",
  storageBucket: "sinpresupuesto-f0151.firebasestorage.app",
  messagingSenderId: "263855838882",
  appId: "1:263855838882:web:1a15d6faafe60c5006e9fb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── AVATARES (15 dibujitos SVG con colores) ──────────────
const AVATARS = [
  { id: 1,  color: '#e74c3c', bg: '#fdecea', emoji: '🦁' },
  { id: 2,  color: '#e67e22', bg: '#fef0e6', emoji: '🐯' },
  { id: 3,  color: '#f1c40f', bg: '#fefbe6', emoji: '🐻' },
  { id: 4,  color: '#2ecc71', bg: '#e8f8f0', emoji: '🐸' },
  { id: 5,  color: '#1abc9c', bg: '#e6f9f5', emoji: '🐢' },
  { id: 6,  color: '#3498db', bg: '#e8f4fd', emoji: '🐬' },
  { id: 7,  color: '#2980b9', bg: '#e3f0fa', emoji: '🦋' },
  { id: 8,  color: '#9b59b6', bg: '#f5eefa', emoji: '🦄' },
  { id: 9,  color: '#8e44ad', bg: '#f0e8f8', emoji: '🐙' },
  { id: 10, color: '#e91e63', bg: '#fde8f1', emoji: '🦊' },
  { id: 11, color: '#ff5722', bg: '#feeee8', emoji: '🐺' },
  { id: 12, color: '#009688', bg: '#e6f5f3', emoji: '🦜' },
  { id: 13, color: '#607d8b', bg: '#edf1f3', emoji: '🐧' },
  { id: 14, color: '#795548', bg: '#f0ebe8', emoji: '🦔' },
  { id: 15, color: '#1a3a6b', bg: '#e8edf5', emoji: '🦅' },
];

// ─── MATERIALES (para lista de avance) ───────────────────
const MATERIALES = [
  { id: 'motivacion-guia',     label: 'I. Motivación/Guía' },
  { id: 'clases-sin-pre',      label: 'II. Clases Sin-Pre' },
  { id: 'temarios',            label: 'III. Temarios' },
  { id: 'admision-y-examenes', label: 'IV. Admisión y Exámenes' },
  { id: 'clases-preu-s-i',     label: 'V. Clases PreU\'s I' },
  { id: 'clases-preu-s-ii',    label: 'VI. Clases PreU\'s II (Libres)' },
  { id: 'recursos-udea',       label: 'VII. Recursos UdeA' },
  { id: 'diapositivas',        label: 'VIII. Diapositivas con TODO' },
  { id: 'apuntes',             label: 'IX. Apuntes Estudio' },
  { id: 'textos',              label: 'X. Textos Varios' },
  { id: 'modulos-teoricos',    label: 'XI. Módulos Teóricos' },
  { id: 'modulos-especiales',  label: 'XII. Módulos Especiales' },
  { id: 'ejercicios',          label: 'XIII. Ejercicios Prácticas' },
  { id: 'simulacros',          label: 'XIV. Simulacros' },
  { id: 'simulacros-cal',      label: 'XV. Simulacros Calificados' },
  { id: 'apps',                label: 'XVI. App\'s Estudio (Android)' },
  { id: 'clases-vivo',         label: 'Clases en vivo/grabadas' },
  { id: 'donativos',           label: 'Donativos' },
  { id: 'formulario',          label: 'Formulario Económico' },
  { id: 'medios',              label: 'Medios de Sin-Presupuesto' },
  { id: 'tomos',               label: 'Tomos' },
];

// ─── ESTADO GLOBAL ────────────────────────────────────────
let currentUser = null;
let userProfile = null;

// ─── FIRESTORE HELPERS ────────────────────────────────────
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

// ─── RENDER AVATARES ─────────────────────────────────────
function renderAvatarPicker(selectedId, onSelect) {
  return AVATARS.map(a => {
    const sel = a.id === selectedId ? 'ring: 3px solid ' + a.color : '';
    return `<button class="avatar-opt ${a.id === selectedId ? 'selected' : ''}" 
      data-id="${a.id}" data-color="${a.color}" data-bg="${a.bg}"
      style="background:${a.bg};border:2px solid ${a.id === selectedId ? a.color : 'transparent'};width:52px;height:52px;border-radius:50%;font-size:1.6rem;cursor:pointer;transition:all .2s;"
      title="Avatar ${a.id}">${a.emoji}</button>`;
  }).join('');
}

function getAvatar(id) {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}

// ─── UI: BARRA NAV ESTUDIANTE ─────────────────────────────
function updateStudentNav(user, profile) {
  const btnIn  = document.getElementById('btn-student-login');
  const btnAv  = document.getElementById('btn-avance');
  const btnPer = document.getElementById('btn-perfil');
  if (!btnIn) return;

  if (user && profile) {
    const av = getAvatar(profile.avatarId || 1);
    btnIn.innerHTML = `<span style="font-size:1.1rem">${av.emoji}</span> ${profile.nombre}`;
    btnIn.style.background = av.bg;
    btnIn.style.borderColor = av.color;
    btnIn.style.color = av.color;
    btnIn.onclick = openPerfilModal;
    if (btnAv)  btnAv.style.display = 'flex';
    if (btnPer) btnPer.style.display = 'flex';
  } else {
    btnIn.innerHTML = '👤 Ingresar';
    btnIn.style.background = '';
    btnIn.style.borderColor = '';
    btnIn.style.color = '';
    btnIn.onclick = openStudentModal;
    if (btnAv)  btnAv.style.display = 'none';
    if (btnPer) btnPer.style.display = 'none';
  }
}

// ─── MODAL ESTUDIANTE (login / registro) ──────────────────
function openStudentModal() {
  document.getElementById('student-modal').classList.add('open');
  showStudentTab('login');
  setTimeout(() => document.getElementById('st-email').focus(), 100);
}
function closeStudentModal() {
  document.getElementById('student-modal').classList.remove('open');
  clearStudentErrors();
}
function showStudentTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active', tab === 'reg');
  document.getElementById('pane-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('pane-reg').style.display   = tab === 'reg'   ? 'block' : 'none';
}
function clearStudentErrors() {
  ['st-login-err','st-reg-err'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

async function doStudentLogin() {
  const email = document.getElementById('st-email').value.trim();
  const pass  = document.getElementById('st-pass').value;
  const err   = document.getElementById('st-login-err');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeStudentModal();
  } catch(e) {
    err.textContent = e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos.' : e.message;
  }
}

async function doStudentRegister() {
  const nombre   = document.getElementById('st-nombre').value.trim();
  const apellido = document.getElementById('st-apellido').value.trim();
  const email    = document.getElementById('st-remail').value.trim();
  const pass     = document.getElementById('st-rpass').value;
  const avatarId = parseInt(document.querySelector('.avatar-opt.selected')?.dataset.id || '1');
  const err      = document.getElementById('st-reg-err');

  if (!nombre || !apellido) { err.textContent = 'Escribe tu nombre y apellido.'; return; }
  if (pass.length < 6)      { err.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const avance = {};
    MATERIALES.forEach(m => avance[m.id] = false);
    await saveProfile(cred.user.uid, {
      nombre, apellido, email, avatarId,
      avance, creadoEn: new Date().toISOString()
    });
    closeStudentModal();
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

  const items = MATERIALES.map(m => `
    <label class="avance-item ${avance[m.id] ? 'done' : ''}">
      <input type="checkbox" data-id="${m.id}" ${avance[m.id] ? 'checked' : ''}>
      <span>${m.label}</span>
    </label>`).join('');

  document.getElementById('avance-progress-bar').style.width = pct + '%';
  document.getElementById('avance-progress-text').textContent = `${hechos} de ${total} completados (${pct}%)`;
  document.getElementById('avance-list').innerHTML = items;
  document.getElementById('avance-modal').classList.add('open');

  document.querySelectorAll('.avance-item input').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      userProfile.avance[id] = cb.checked;
      cb.closest('.avance-item').classList.toggle('done', cb.checked);
      const hechos2 = MATERIALES.filter(m => userProfile.avance[m.id]).length;
      const pct2 = Math.round((hechos2 / total) * 100);
      document.getElementById('avance-progress-bar').style.width = pct2 + '%';
      document.getElementById('avance-progress-text').textContent = `${hechos2} de ${total} completados (${pct2}%)`;
      await saveAvance(currentUser.uid, userProfile.avance);
    });
  });
}
function closeAvanceModal() {
  document.getElementById('avance-modal').classList.remove('open');
}

// ─── MODAL PERFIL ─────────────────────────────────────────
function openPerfilModal() {
  if (!userProfile) return;
  const av = getAvatar(userProfile.avatarId || 1);
  document.getElementById('perfil-avatar-display').textContent = av.emoji;
  document.getElementById('perfil-avatar-display').style.background = av.bg;
  document.getElementById('perfil-nombre').textContent = userProfile.nombre + ' ' + userProfile.apellido;
  document.getElementById('perfil-email').textContent  = userProfile.email;
  document.getElementById('perfil-desde').textContent  = userProfile.creadoEn ? new Date(userProfile.creadoEn).toLocaleDateString('es-CO', {year:'numeric',month:'long'}) : '';

  // Picker de avatar en perfil
  document.getElementById('perfil-avatar-picker').innerHTML = renderAvatarPicker(userProfile.avatarId || 1);
  document.querySelectorAll('#perfil-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('#perfil-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('selected');
        b.style.borderColor = 'transparent';
      });
      btn.classList.add('selected');
      btn.style.borderColor = btn.dataset.color;
      const newId = parseInt(btn.dataset.id);
      userProfile.avatarId = newId;
      const newAv = getAvatar(newId);
      document.getElementById('perfil-avatar-display').textContent = newAv.emoji;
      document.getElementById('perfil-avatar-display').style.background = newAv.bg;
      await saveProfile(currentUser.uid, { avatarId: newId });
      updateStudentNav(currentUser, userProfile);
    });
  });

  document.getElementById('perfil-modal').classList.add('open');
}
function closePerfilModal() {
  document.getElementById('perfil-modal').classList.remove('open');
}

async function doLogout() {
  await signOut(auth);
  closePerfilModal();
}

// ─── INYECTAR HTML MODALES ────────────────────────────────
function injectModals() {
  const html = `
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
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="st-login-err"></p>
        <button class="btn-submit" onclick="doStudentLogin()">Ingresar</button>
      </div>
      <!-- REGISTRO -->
      <div id="pane-reg" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          <div class="form-group"><label>Nombre</label><input type="text" id="st-nombre" placeholder="Juan"></div>
          <div class="form-group"><label>Apellido</label><input type="text" id="st-apellido" placeholder="Pérez"></div>
        </div>
        <div class="form-group"><label>Correo</label><input type="email" id="st-remail" placeholder="tucorreo@gmail.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="st-rpass" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group">
          <label>Elige tu avatar</label>
          <div id="reg-avatar-picker" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.3rem">
            ${renderAvatarPicker(1)}
          </div>
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <h2 style="font-family:'Fraunces',serif;color:var(--accent)">Mi perfil</h2>
        <button onclick="closePerfilModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
      </div>
      <!-- Tarjeta de presentación -->
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:var(--bg3);border-radius:14px">
        <div id="perfil-avatar-display" style="width:64px;height:64px;border-radius:50%;font-size:2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
        <div>
          <div id="perfil-nombre" style="font-weight:600;font-size:1.05rem;color:var(--accent)"></div>
          <div id="perfil-email"  style="font-size:0.82rem;color:var(--muted)"></div>
          <div id="perfil-desde" style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem"></div>
        </div>
      </div>
      <!-- Cambiar avatar -->
      <div class="form-group">
        <label>Cambiar avatar</label>
        <div id="perfil-avatar-picker" style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.3rem"></div>
      </div>
      <button class="btn-submit" style="background:#e74c3c;margin-top:1rem" onclick="doLogout()">Cerrar sesión</button>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Picker de avatar en registro
  document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#reg-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('selected');
        b.style.borderColor = 'transparent';
      });
      btn.classList.add('selected');
      btn.style.borderColor = btn.dataset.color;
    });
  });

  // Enter en login
  document.getElementById('st-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doStudentLogin();
  });
}

// ─── CSS EXTRA ────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .tab-btn { background:none; border:none; padding:0.6rem 1.1rem; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .2s; }
    .tab-btn.active { color:var(--accent2); border-bottom-color:var(--accent2); font-weight:600; }
    .avance-item { display:flex; align-items:center; gap:0.75rem; padding:0.55rem 0.75rem; border-radius:10px; cursor:pointer; transition:background .15s; border:1.5px solid var(--border); background:var(--bg2); }
    .avance-item:hover { background:var(--bg3); }
    .avance-item.done { background:rgba(46,111,196,0.07); border-color:var(--accent3); }
    .avance-item input { width:18px; height:18px; accent-color:var(--accent2); cursor:pointer; flex-shrink:0; }
    .avance-item span { font-size:0.88rem; color:var(--text); }
    .avance-item.done span { color:var(--accent2); }
    #btn-student-login { background:none; border:1.5px solid var(--border); color:var(--muted); font-family:'DM Sans',sans-serif; font-size:0.8rem; padding:0.4rem 0.85rem; border-radius:20px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:0.35rem; }
    #btn-student-login:hover { border-color:var(--accent2); color:var(--accent2); }
    #btn-avance, #btn-perfil { background:none; border:1.5px solid var(--border); color:var(--muted); font-family:'DM Sans',sans-serif; font-size:0.8rem; padding:0.4rem 0.85rem; border-radius:20px; cursor:pointer; transition:all .2s; align-items:center; gap:0.35rem; }
    #btn-avance:hover, #btn-perfil:hover { border-color:var(--accent2); color:var(--accent2); }
  `;
  document.head.appendChild(style);
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  injectModals();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      userProfile = await loadProfile(user.uid);
      // Asegurar que avance existe
      if (userProfile && !userProfile.avance) {
        const avance = {};
        MATERIALES.forEach(m => avance[m.id] = false);
        await saveProfile(user.uid, { avance });
        userProfile.avance = avance;
      }
    } else {
      userProfile = null;
    }
    updateStudentNav(user, userProfile);
  });

  // Cerrar modales al click fuera
  ['student-modal','avance-modal','perfil-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) {
        if (id === 'student-modal') closeStudentModal();
        if (id === 'avance-modal')  closeAvanceModal();
        if (id === 'perfil-modal')  closePerfilModal();
      }
    });
  });
});

// Exponer globales
window.openStudentModal  = openStudentModal;
window.closeStudentModal = closeStudentModal;
window.showStudentTab    = showStudentTab;
window.doStudentLogin    = doStudentLogin;
window.doStudentRegister = doStudentRegister;
window.openAvanceModal   = openAvanceModal;
window.closeAvanceModal  = closeAvanceModal;
window.openPerfilModal   = openPerfilModal;
window.closePerfilModal  = closePerfilModal;
window.doLogout          = doLogout;
