// ─── CONFIGURACIÓN ───────────────────────────────────────
const PASS_HASH   = 'b5225f58be400470ea03729ba17ebf10e4ce131b1c228fdd183ef9083a60ecec';
const SESSION_KEY = 'sinpre_auth';
const ADMIN_EMAIL = 'sinpreun@gmail.com';
const ADMIN_PASS_HASH = 'b5225f58be400470ea03729ba17ebf10e4ce131b1c228fdd183ef9083a60ecec';

// ─── UTILIDADES ──────────────────────────────────────────
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function isLogged() { return sessionStorage.getItem(SESSION_KEY) === 'ok'; }

function showToast(msg, duration, type) {
  duration = duration || 2500;
  type = type || 'default';
  document.querySelectorAll('.toast').forEach(function(t) { t.remove(); });
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  if (type === 'success') t.style.background = '#1a7a4a';
  if (type === 'error')   t.style.background = '#c0392b';
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, duration);
}

// ─── AUTH EDITOR ─────────────────────────────────────────
function openModal() {
  // Ya no se usa - login admin reemplaza esto
}
function closeModal() {}

function updateLoginBtn() {
  var btn = document.getElementById('btn-login');
  if (!btn) return;
  if (isLogged()) {
    btn.textContent = '\u2736 Editor activo';
    btn.classList.add('logged');
    btn.onclick = confirmAdminLogout;
  } else {
    btn.innerHTML = '&#128274; Ingresar';
    btn.classList.remove('logged');
    btn.onclick = openAdminModal;
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  deactivateEditor();
  updateLoginBtn();
}

// ─── ADMIN MODAL ──────────────────────────────────────────
function openAdminModal() {
  var modal = document.getElementById('admin-modal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(function() {
      var el = document.getElementById('admin-email');
      if (el) el.focus();
    }, 100);
  }
}

function closeAdminModal() {
  var modal = document.getElementById('admin-modal');
  if (modal) modal.classList.remove('open');
  var err = document.getElementById('admin-err');
  if (err) err.textContent = '';
}

async function doAdminLogin() {
  var email = document.getElementById('admin-email').value.trim();
  var pass  = document.getElementById('admin-pass').value;
  var err   = document.getElementById('admin-err');

  if (email !== ADMIN_EMAIL) { err.textContent = 'Correo no autorizado.'; return; }
  var hash = await sha256(pass);
  if (hash !== ADMIN_PASS_HASH) { err.textContent = 'Contraseña incorrecta.'; return; }

  sessionStorage.setItem(SESSION_KEY, 'ok');
  closeAdminModal();
  activateEditor();
  updateLoginBtn();
  showToast('✓ Bienvenido, Joaquín. Modo edición activo.', 3000, 'success');
}

function confirmAdminLogout() {
  // Modal de confirmación para salir
  document.getElementById('admin-logout-modal').classList.add('open');
}
function closeAdminLogoutModal() {
  document.getElementById('admin-logout-modal').classList.remove('open');
}
function doAdminLogout() {
  closeAdminLogoutModal();
  logout();
  showToast('Sesión de administrador cerrada.', 2500);
}

function adminForgotPassword() {
  // Abrir Gmail para recuperar contraseña
  window.open('https://accounts.google.com/signin/recovery', '_blank');
}

// ─── EDITOR ──────────────────────────────────────────────
var originalContent = '';

function activateEditor() {
  var eb = document.getElementById('entry-body');
  if (!eb) return;
  originalContent = eb.innerHTML;
  eb.setAttribute('contenteditable', 'true');
  eb.focus();
  var bar   = document.getElementById('editor-bar');
  var badge = document.getElementById('editing-badge');
  if (bar)   bar.classList.add('active');
  if (badge) badge.classList.add('show');
}

function deactivateEditor() {
  var eb = document.getElementById('entry-body');
  if (eb) eb.removeAttribute('contenteditable');
  var bar   = document.getElementById('editor-bar');
  var badge = document.getElementById('editing-badge');
  if (bar)   bar.classList.remove('active');
  if (badge) badge.classList.remove('show');
}

function cancelEdit() {
  var eb = document.getElementById('entry-body');
  if (eb && originalContent) {
    eb.innerHTML = originalContent;
    showToast('Cambios descartados');
  }
}

function getFileName() {
  var parts = location.pathname.split('/');
  var file  = parts[parts.length - 1];
  if (!file || file === '') return 'index.html';
  if (!file.includes('.')) file = file + '.html';
  return file;
}

async function saveToGitHub() {
  var eb = document.getElementById('entry-body');
  if (!eb) return;
  var filename = getFileName();
  var saveBtn  = document.querySelector('.save-btn');
  if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }
  showToast('\u23f3 Subiendo cambios...', 10000);
  try {
    var fullHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    var res = await fetch('/.netlify/functions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, content: fullHTML })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido');
    showToast('\u2713 Guardado en GitHub \u2014 visible en ~1 minuto', 3000, 'success');
  } catch(err) {
    showToast('\u2717 Error: ' + err.message, 4000, 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Guardar \u2713'; saveBtn.disabled = false; }
  }
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  updateLoginBtn();
  if (isLogged()) activateEditor();

  document.getElementById('btn-submit')?.addEventListener('click', doAdminLogin);
  document.querySelector('.save-btn')?.addEventListener('click', saveToGitHub);
  document.querySelector('.cancel-btn')?.addEventListener('click', cancelEdit);

  document.getElementById('inp-pass')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  doAdminLogin();
    if (e.key === 'Escape') closeAdminModal();
  });

  var adminPass = document.getElementById('admin-pass');
  if (adminPass) adminPass.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  doAdminLogin();
    if (e.key === 'Escape') closeAdminModal();
  });
  var adminSub = document.getElementById('admin-submit');
  if (adminSub) adminSub.addEventListener('click', doAdminLogin);

  var adminModal = document.getElementById('admin-modal');
  if (adminModal) adminModal.addEventListener('click', function(e) {
    if (e.target === adminModal) closeAdminModal();
  });
  var logoutModal = document.getElementById('admin-logout-modal');
  if (logoutModal) logoutModal.addEventListener('click', function(e) {
    if (e.target === logoutModal) closeAdminLogoutModal();
  });
});

window.openAdminModal       = openAdminModal;
window.closeAdminModal      = closeAdminModal;
window.doAdminLogin         = doAdminLogin;
window.confirmAdminLogout   = confirmAdminLogout;
window.closeAdminLogoutModal = closeAdminLogoutModal;
window.doAdminLogout        = doAdminLogout;
window.adminForgotPassword  = adminForgotPassword;
