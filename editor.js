// ─── URL del Cloudflare Worker ────────────────────────────
// Reemplaza esto con la URL de tu Worker cuando lo tengas
const WORKER_URL = 'https://sinpresupuesto-save01.jocortesca.workers.dev';

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

function activateEditor() {
  const eb = document.getElementById('entry-body');
  if (eb) {
    window._editorOriginalContent = eb.innerHTML;
    eb.setAttribute('contenteditable', 'true');
    document.getElementById('editor-bar')?.classList.add('active');
    document.getElementById('editing-badge')?.classList.add('show');
  }
}

function deactivateEditor() {
  const eb = document.getElementById('entry-body');
  if (eb) eb.removeAttribute('contenteditable');
  document.getElementById('editor-bar')?.classList.remove('active');
  document.getElementById('editing-badge')?.classList.remove('show');
}

function cancelEdit() {
  const eb = document.getElementById('entry-body');
  if (eb && window._editorOriginalContent) {
    eb.innerHTML = window._editorOriginalContent;
    showToast('Cambios descartados');
  }
}

function getFileName() {
  const parts = location.pathname.split('/');
  let file = parts[parts.length - 1];
  // GitHub Pages puede servir con o sin .html
  if (!file || file === '') return 'index.html';
  if (!file.includes('.')) file = file + '.html';
  return file;
}

async function saveToGitHub() {
  const eb = document.getElementById('entry-body');
  if (!eb) return;
  const saveBtn = document.querySelector('.save-btn');
  if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }
  showToast('⏳ Subiendo cambios...', 10000);
  try {
    const fullHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: getFileName(), content: fullHTML })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido');
    showToast('✓ Guardado — visible en ~1 minuto', 3000, 'success');
  } catch(err) {
    showToast('✗ Error: ' + err.message, 4000, 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = 'Guardar ✓'; saveBtn.disabled = false; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.save-btn')?.addEventListener('click', saveToGitHub);
  document.querySelector('.cancel-btn')?.addEventListener('click', cancelEdit);
});

window.activateEditor   = activateEditor;
window.deactivateEditor = deactivateEditor;
window.showToast        = showToast;
