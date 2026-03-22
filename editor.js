// ─── CONFIGURACIÓN ───────────────────────────────────────
const PASS_HASH = 'b5225f58be400470ea03729ba17ebf10e4ce131b1c228fdd183ef9083a60ecec';
const SESSION_KEY = 'sinpre_auth';

const GITHUB_OWNER = 'Joaquin-L-Cortes';
const GITHUB_REPO  = 'SinPresupuesto';
const GITHUB_TOKEN = atob('Z2hwX1phQm81U0YzYjVGdXllTkNKQldaak5qRGQ3WTF6VzB6NXl3SA==');
const GITHUB_API   = 'https://api.github.com';

// ─── UTILIDADES ──────────────────────────────────────────
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isLogged() {
  return sessionStorage.getItem(SESSION_KEY) === 'ok';
}

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

// ─── GITHUB API ───────────────────────────────────────────
function getFileName() {
  var parts = location.pathname.split('/');
  var file = parts[parts.length - 1];
  if (!file || file === '') file = 'index.html';
  return file;
}

async function getFileSHA(filename) {
  var url = GITHUB_API + '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + filename;
  var res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!res.ok) return null;
  var data = await res.json();
  return data.sha;
}

async function saveToGitHub() {
  var eb = document.getElementById('entry-body');
  if (!eb) return;

  var filename = getFileName();
  var saveBtn = document.querySelector('.save-btn');

  if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }
  showToast('\u23f3 Subiendo cambios a GitHub...', 10000);

  try {
    var sha = await getFileSHA(filename);
    if (!sha) throw new Error('No se encontro el archivo en el repositorio');

    var fullHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    var encoded = btoa(unescape(encodeURIComponent(fullHTML)));

    var url = GITHUB_API + '/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + filename;
    var res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Actualizar ' + filename + ' desde editor web',
        content: encoded,
        sha: sha
      })
    });

    if (!res.ok) {
      var err = await res.json();
      throw new Error(err.message || 'Error al guardar');
    }

    showToast('\u2713 Guardado en GitHub \u2014 visible en ~1 minuto');
  } catch(err) {
    showToast('\u2717 Error: ' + err.message, 4000);
    console.error('GitHub API error:', err);
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
  var bar = document.getElementById('editor-bar');
  var badge = document.getElementById('editing-badge');
  if (bar) bar.classList.add('active');
  if (badge) badge.classList.add('show');
  showToast('\u2736 Modo edicion activo \u2014 haz clic en el texto para editar');
}

function deactivateEditor() {
  var eb = document.getElementById('entry-body');
  if (eb) eb.removeAttribute('contenteditable');
  var bar = document.getElementById('editor-bar');
  var badge = document.getElementById('editing-badge');
  if (bar) bar.classList.remove('active');
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

  var btnSubmit = document.getElementById('btn-submit');
  if (btnSubmit) btnSubmit.addEventListener('click', doLogin);

  var saveBtn = document.querySelector('.save-btn');
  var cancelBtn = document.querySelector('.cancel-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveToGitHub);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);

  var inp = document.getElementById('inp-pass');
  if (inp) inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doLogin();
    if (e.key === 'Escape') closeModal();
  });

  var modal = document.getElementById('login-modal');
  if (modal) modal.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeModal();
  });
});
