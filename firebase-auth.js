import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
  { id:18, color:'#6c3483', bg:'#f0e8f8', emoji:'🦋' },
];

const MATERIALES = [
  { id:'motivacion-guia',     label:'I. Motivación/Guía' },
  { id:'clases-sin-pre',      label:'II. Clases Sin-Pre' },
  { id:'temarios',            label:'III. Temarios' },
  { id:'admision-y-examenes', label:'IV. Admisión y Exámenes' },
  { id:'clases-preu-s-i',     label:'V. Clases PreU\'s I' },
  { id:'clases-preu-s-ii',    label:'VI. Clases PreU\'s II (Libres)' },
  { id:'recursos-udea',       label:'VII. Recursos UdeA' },
  { id:'diapositivas',        label:'VIII. Diapositivas con TODO' },
  { id:'apuntes',             label:'IX. Apuntes Estudio' },
  { id:'textos',              label:'X. Textos Varios' },
  { id:'modulos-teoricos',    label:'XI. Módulos Teóricos' },
  { id:'modulos-especiales',  label:'XII. Módulos Especiales' },
  { id:'ejercicios',          label:'XIII. Ejercicios Prácticas' },
  { id:'simulacros',          label:'XIV. Simulacros' },
  { id:'simulacros-cal',      label:'XV. Simulacros Calificados' },
  { id:'apps',                label:'XVI. App\'s Estudio (Android)' },
  { id:'clases-vivo',         label:'Clases en vivo/grabadas' },
  { id:'donativos',           label:'Donativos' },
  { id:'formulario',          label:'Formulario Económico' },
  { id:'medios',              label:'Medios de Sin-Presupuesto' },
  { id:'tomos',               label:'Tomos' },
];

let currentUser  = null;
let userProfile  = null;
let editMode     = false; // modo edición de perfil

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

// ─── NAV ──────────────────────────────────────────────────
function updateStudentNav(user, profile) {
  const btnIn  = document.getElementById('btn-student-login');
  const btnAv  = document.getElementById('btn-avance');
  const btnPer = document.getElementById('btn-perfil');
  if (!btnIn) return;
  if (user && profile) {
    const av = getAvatar(profile.avatarId || 1);
    btnIn.innerHTML = `<span style="font-size:1.1rem">${av.emoji}</span> ${profile.nombre}`;
    btnIn.style.cssText = `background:${av.bg};border:1.5px solid ${av.color};color:${av.color};font-family:'DM Sans',sans-serif;font-size:0.8rem;padding:0.4rem 0.85rem;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:0.35rem;`;
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
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-reg').classList.toggle('active',   tab === 'reg');
  document.getElementById('pane-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('pane-reg').style.display   = tab === 'reg'   ? 'block' : 'none';
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
let tempAvatarId = null;

function openPerfilModal() {
  if (!userProfile) return;
  editMode = false;
  tempAvatarId = userProfile.avatarId || 1;
  renderPerfilView();
  document.getElementById('perfil-modal').classList.add('open');
}
function closePerfilModal() {
  document.getElementById('perfil-modal').classList.remove('open');
  document.getElementById('perfil-menu-dropdown').style.display = 'none';
  editMode = false;
}

function renderPerfilView() {
  const av = getAvatar(userProfile.avatarId || 1);
  // Tarjeta
  document.getElementById('perfil-avatar-display').textContent      = av.emoji;
  document.getElementById('perfil-avatar-display').style.background = av.bg;
  document.getElementById('perfil-nombre').textContent = userProfile.nombre + ' ' + userProfile.apellido;
  document.getElementById('perfil-email').textContent  = userProfile.email;
  document.getElementById('perfil-desde').textContent  = userProfile.creadoEn
    ? 'Desde ' + new Date(userProfile.creadoEn).toLocaleDateString('es-CO', {year:'numeric', month:'long'}) : '';

  // Mostrar vista o edición
  document.getElementById('perfil-view').style.display = 'block';
  document.getElementById('perfil-edit').style.display = 'none';
  document.getElementById('btn-realizar-cambios').style.display = 'block';
  document.getElementById('btn-guardar-cambios').style.display  = 'none';
}

function enterEditMode() {
  editMode = true;
  tempAvatarId = userProfile.avatarId || 1;

  // Prellenar campos
  document.getElementById('edit-nombre').value   = userProfile.nombre   || '';
  document.getElementById('edit-apellido').value = userProfile.apellido || '';
  document.getElementById('edit-email').value    = userProfile.email    || '';

  // Avatar picker
  document.getElementById('edit-avatar-picker').innerHTML = renderAvatarPicker(tempAvatarId);
  document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#edit-avatar-picker .avatar-opt').forEach(b => {
        b.classList.remove('av-selected'); b.style.borderColor = 'transparent';
      });
      btn.classList.add('av-selected');
      btn.style.borderColor = btn.dataset.color;
      tempAvatarId = parseInt(btn.dataset.id);
      // Preview en tarjeta
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
  btn.textContent = 'Guardando...'; btn.disabled = true;
  errEl.textContent = '';

  try {
    // Actualizar Firestore
    await saveProfile(currentUser.uid, { nombre, apellido, avatarId: tempAvatarId });
    userProfile.nombre    = nombre;
    userProfile.apellido  = apellido;
    userProfile.avatarId  = tempAvatarId;

    // Actualizar email si cambió
    if (email !== currentUser.email) {
      await updateEmail(currentUser, email);
      await saveProfile(currentUser.uid, { email });
      userProfile.email = email;
    }

    editMode = false;
    renderPerfilView();
    updateStudentNav(currentUser, userProfile);
  } catch(e) {
    if (e.code === 'auth/requires-recent-login') {
      errEl.textContent = 'Para cambiar el correo debes cerrar sesión y volver a ingresar.';
    } else {
      errEl.textContent = e.message;
    }
  } finally {
    btn.textContent = 'Guardar cambios'; btn.disabled = false;
  }
}

async function doLogout() {
  await signOut(auth);
  closePerfilModal();
}

// ─── BORRAR CUENTA (modal propio) ─────────────────────────
function openDeleteModal() {
  document.getElementById('perfil-menu-dropdown').style.display = 'none';
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('delete-pass').value  = '';
  document.getElementById('delete-err').textContent = '';
  setTimeout(() => document.getElementById('delete-pass').focus(), 100);
}
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('open');
}
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
    closeDeleteModal();
    closePerfilModal();
  } catch(e) {
    errEl.textContent = (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')
      ? 'Contraseña incorrecta.' : e.message;
  } finally {
    btn.textContent = 'Sí, eliminar mi cuenta'; btn.disabled = false;
  }
}

// ─── INYECTAR HTML ────────────────────────────────────────
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
      <div id="pane-login">
        <div class="form-group"><label>Correo</label><input type="email" id="st-email" placeholder="tucorreo@gmail.com"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="st-pass" placeholder="••••••••"></div>
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="st-login-err"></p>
        <button class="btn-submit" onclick="doStudentLogin()">Ingresar</button>
      </div>
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
            <button id="perfil-menu-btn"
              style="background:none;border:none;color:var(--muted);font-size:1.4rem;cursor:pointer;padding:0.1rem 0.4rem;border-radius:6px;line-height:1;"
              title="Opciones">⋮</button>
            <div id="perfil-menu-dropdown"
              style="display:none;position:absolute;right:0;top:110%;background:var(--bg2);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);min-width:165px;z-index:10;overflow:hidden">
              <button onclick="openDeleteModal()"
                style="width:100%;padding:0.65rem 1rem;background:none;border:none;color:#c0392b;font-family:'DM Sans',sans-serif;font-size:0.88rem;text-align:left;cursor:pointer;transition:background .15s;"
                onmouseover="this.style.background='#fdecea'" onmouseout="this.style.background='none'">
                🗑 Borrar cuenta
              </button>
            </div>
          </div>
          <button onclick="closePerfilModal()" style="background:none;border:none;color:var(--muted);font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
      </div>

      <!-- Tarjeta fija siempre visible -->
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;padding:1rem;background:var(--bg3);border-radius:14px">
        <div id="perfil-avatar-display" style="width:64px;height:64px;border-radius:50%;font-size:2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
        <div>
          <div id="perfil-nombre" style="font-weight:600;font-size:1.05rem;color:var(--accent)"></div>
          <div id="perfil-email"  style="font-size:0.82rem;color:var(--muted)"></div>
          <div id="perfil-desde"  style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem"></div>
        </div>
      </div>

      <!-- VISTA NORMAL -->
      <div id="perfil-view"></div>

      <!-- VISTA EDICIÓN -->
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
        <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="perfil-edit-err"></p>
      </div>

      <!-- BOTONES -->
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
      <div class="form-group">
        <label>Confirma tu contraseña</label>
        <input type="password" id="delete-pass" placeholder="••••••••">
      </div>
      <p style="color:#c0392b;font-size:0.82rem;min-height:1.2em" id="delete-err"></p>
      <button id="btn-confirm-delete" class="btn-submit" style="background:#c0392b" onclick="doDeleteAccount()">Sí, eliminar mi cuenta</button>
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

  // Enter en campos
  document.getElementById('st-pass')?.addEventListener('keydown',    e => { if(e.key==='Enter') doStudentLogin(); });
  document.getElementById('delete-pass')?.addEventListener('keydown', e => { if(e.key==='Enter') doDeleteAccount(); if(e.key==='Escape') closeDeleteModal(); });

  // Cerrar modales al click fuera
  ['student-modal','avance-modal','perfil-modal','delete-modal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) {
        if (id==='student-modal') closeStudentModal();
        if (id==='avance-modal')  closeAvanceModal();
        if (id==='perfil-modal')  closePerfilModal();
        if (id==='delete-modal')  closeDeleteModal();
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
      userProfile = await loadProfile(user.uid);
      if (userProfile && !userProfile.avance) {
        const avance = {};
        MATERIALES.forEach(m => avance[m.id] = false);
        await saveProfile(user.uid, { avance });
        userProfile.avance = avance;
      }
    } else { userProfile = null; }
    updateStudentNav(user, userProfile);
  });
});

window.openStudentModal    = openStudentModal;
window.closeStudentModal   = closeStudentModal;
window.showStudentTab      = showStudentTab;
window.doStudentLogin      = doStudentLogin;
window.doStudentRegister   = doStudentRegister;
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
