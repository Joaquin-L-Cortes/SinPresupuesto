// ─── CONFIGURACIÓN ───────────────────────────────────────
const PASS_HASH  = 'b5225f58be400470ea03729ba17ebf10e4ce131b1c228fdd183ef9083a60ecec';
const SESSION_KEY = 'sinpre_auth';
// El token ya NO está aquí — vive seguro en el servidor de Netlify

// ─── UTILIDADES ──────────────────────────────────────────
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function isLogged() { return sessionStorage.getItem(SESSION_KEY) === 'ok'; }

function showToast(msg, duration) {
  duration = duration || 2500;
  document.querySelectorAll('.toast').forEach(function(t) { t.remove(); });
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, duration);
}

// ─── AUTH ─────────────────────────────────────────────────
function openModal() {
  document.getElementById('login-modal').classList.add('open');
  setTimeout(function() { document.getElementById('inp-pass').focus(); }, 100);
}

function closeModal() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('inp-pass').value = '';
}

async function doLogin() {
  var pass = document.getElementById('inp-pass').value;
  if (!pass) return;
  var hash = await sha256(pass);
  if (hash === PASS_HASH) {
    sessionStorage.setItem(SESSION_KEY, 'ok');
    closeModal();
    activateEditor();
    updateLoginBtn();
  } else {
    document.getElementById('login-error').style.display = 'block';
    document.getElementById('inp-pass').select();
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  deactivateEditor();
  updateLoginBtn();
  showToast('Sesión cerrada');
}

function updateLoginBtn() {
  var btn = document.getElementById('btn-login');
  if (!btn) return;
  if (isLogged()) {
    btn.textContent = '\u2736 Editor activo';
    btn.classList.add('logged');
    btn.onclick = logout;
  } else {
    btn.innerHTML = '&#128274; Ingresar';
    btn.classList.remove('logged');
    btn.onclick = openModal;
  }
}

// ─── GUARDAR VÍA NETLIFY FUNCTION (seguro) ───────────────
function getFileName() {
  var parts = location.pathname.split('/');
  var file = parts[parts.length - 1];
  if (!file || file === '') file = 'index.html';
  return file;
}

async function saveToGitHub() {
  var eb = document.getElementById('entry-body');
  if (!eb) return;

  var filename = getFileName();
  var saveBtn = document.querySelector('.save-btn');

  if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }
  showToast('\u23f3 Subiendo cambios...', 10000);

  try {
    // Construir HTML completo de la página con los cambios
    var fullHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    // Llamar a la función serverless de Netlify (el token vive allá, no aquí)
    var res = await fetch('/.netlify/functions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, content: fullHTML })
    });

    var data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error desconocido');

    showToast('\u2713 Guardado en GitHub \u2014 visible en ~1 minuto');
  } catch(err) {
    showToast('\u2717 Error: ' + err.message, 4000);
    console.error('Error al guardar:', err);
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Guardar \u2713'; saveBtn.disabled = false; }
  }
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
  showToast('\u2736 Modo edición activo \u2014 haz clic en el texto para editar');
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

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  updateLoginBtn();
  if (isLogged()) activateEditor();

  var btnLogin = document.getElementById('btn-login');
  if (btnLogin && !isLogged()) btnLogin.onclick = openModal;

  document.getElementById('btn-submit')?.addEventListener('click', doLogin);
  document.querySelector('.save-btn')?.addEventListener('click', saveToGitHub);
  document.querySelector('.cancel-btn')?.addEventListener('click', cancelEdit);

  document.getElementById('inp-pass')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter')  doLogin();
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('login-modal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeModal();
  });
});
