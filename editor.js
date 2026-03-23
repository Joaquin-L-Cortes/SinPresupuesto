// ─── URL del Cloudflare Worker ─────────────────────────────────────────────
const WORKER_URL = 'https://sinpresito-ai.jocortesca.workers.dev';

// ─── TOAST ─────────────────────────────────────────────────────────────────
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

// ─── UTILS ─────────────────────────────────────────────────────────────────
function getFileName() {
  const parts = location.pathname.split('/');
  let file = parts[parts.length - 1];
  if (!file || file === '') return 'index.html';
  if (!file.includes('.')) file += '.html';
  return file;
}

// ─── GUARDAR EN GITHUB ─────────────────────────────────────────────────────
async function saveToGitHub() {
  // Si la página tiene MODULES, serializar el estado actual antes de guardar
  if (typeof window.MODULES !== 'undefined' && window.MODULES) {
    _serializeModulesToHTML();
  }

  const saveBtn = document.getElementById('ed-save-btn');
  if (saveBtn) { saveBtn.textContent = '⏳ Guardando...'; saveBtn.disabled = true; }
  showToast('⏳ Subiendo cambios...', 10000);

  try {
    // Clonar el documento y limpiar artefactos del editor antes de guardar
    const clone = document.documentElement.cloneNode(true);
    // Quitar tooltips y estados temporales del editor
    clone.querySelectorAll('.ed-inline-input').forEach(el => {
      el.replaceWith(document.createTextNode(el.value));
    });
    clone.querySelectorAll('[data-ed-dirty]').forEach(el => {
      el.removeAttribute('data-ed-dirty');
    });

    const fullHTML = '<!DOCTYPE html>\n' + clone.outerHTML;
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: getFileName(), content: fullHTML })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido');
    showToast('✓ Guardado en GitHub — visible en ~1 min', 3500, 'success');
    window._editorDirty = false;
    _updateEditorBar();
  } catch(err) {
    showToast('✗ Error: ' + err.message, 4000, 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = '💾 Guardar'; saveBtn.disabled = false; }
  }
}

// ─── SERIALIZAR MODULES AL HTML ────────────────────────────────────────────
function _serializeModulesToHTML() {
  if (typeof window.MODULES === 'undefined') return;
  // Buscar el script que contiene const MODULES= y reemplazar su contenido
  const scripts = document.querySelectorAll('script:not([src])');
  for (const s of scripts) {
    if (s.textContent.includes('const MODULES=') || s.textContent.includes('const MODULES =')) {
      const newJSON = JSON.stringify(window.MODULES);
      s.textContent = s.textContent
        .replace(/const MODULES\s*=\s*\[[\s\S]*?\];/, `const MODULES=${newJSON};`);
      break;
    }
  }
}

// ─── BARRA DEL EDITOR ──────────────────────────────────────────────────────
function _buildEditorBar() {
  if (document.getElementById('ed-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'ed-bar';
  bar.innerHTML = `
    <span style="font-size:.75rem;opacity:.7;font-weight:600;letter-spacing:.05em">✦ MODO EDITOR</span>
    <div style="display:flex;gap:.5rem;margin-left:auto;align-items:center">
      <span id="ed-dirty-badge" style="font-size:.72rem;color:#fbbf24;display:none">● Cambios sin guardar</span>
      <button id="ed-save-btn" onclick="saveToGitHub()" style="background:#1a7a4a;color:#fff;border:none;border-radius:8px;padding:.35rem .9rem;font-size:.8rem;font-weight:600;cursor:pointer;">💾 Guardar</button>
      <button onclick="deactivateEditor()" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:.35rem .8rem;font-size:.8rem;cursor:pointer;">✕ Salir</button>
    </div>`;
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#1a3a6b;color:#fff;display:flex;align-items:center;padding:.5rem 1.25rem;gap:.75rem;box-shadow:0 2px 12px rgba(0,0,0,.35);font-family:"DM Sans",sans-serif;';
  document.body.prepend(bar);
  // Empujar el contenido hacia abajo
  document.body.style.paddingTop = '46px';
}

function _updateEditorBar() {
  const badge = document.getElementById('ed-dirty-badge');
  if (badge) badge.style.display = window._editorDirty ? 'block' : 'none';
}

function _markDirty() {
  window._editorDirty = true;
  _updateEditorBar();
}

// ─── ACTIVAR / DESACTIVAR EDITOR ───────────────────────────────────────────
function activateEditor() {
  window._editorActive = true;
  window._editorDirty = false;
  _buildEditorBar();

  // Páginas con MODULES: activar edición inline de módulos
  if (typeof window.MODULES !== 'undefined' && window.MODULES && window.MODULES.length > 0) {
    _activateModuleEditor();
  }

  // Página index / materiales: hacer títulos del hero editables
  const heroH1 = document.querySelector('.hero h1, .mat-hero h1');
  if (heroH1) _makeEditable(heroH1);

  // Textos del entry-body (index)
  const eb = document.getElementById('entry-body');
  if (eb) {
    window._editorOriginalContent = eb.innerHTML;
    eb.setAttribute('contenteditable', 'true');
    eb.style.outline = '2px dashed #2e6fc4';
    eb.style.outlineOffset = '6px';
    eb.addEventListener('input', _markDirty);
  }

  showToast('✦ Modo editor activo — doble clic para editar', 3000);
}

function deactivateEditor() {
  if (window._editorDirty) {
    if (!confirm('¿Salir sin guardar? Los cambios no guardados se perderán.')) return;
  }
  window._editorActive = false;
  window._editorDirty = false;

  // Quitar barra
  document.getElementById('ed-bar')?.remove();
  document.body.style.paddingTop = '';

  // Desactivar entry-body
  const eb = document.getElementById('entry-body');
  if (eb) {
    eb.removeAttribute('contenteditable');
    eb.style.outline = '';
  }

  // Quitar overlays del editor de módulos
  document.querySelectorAll('.ed-module-overlay, .ed-add-btn, .ed-file-controls').forEach(e => e.remove());
  document.querySelectorAll('[data-ed-editable]').forEach(el => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-ed-editable');
    el.style.outline = '';
  });


}

// ─── HACER ELEMENTO EDITABLE ───────────────────────────────────────────────
function _makeEditable(el, onSave) {
  el.setAttribute('contenteditable', 'true');
  el.setAttribute('data-ed-editable', '1');
  el.style.outline = '2px dashed rgba(46,111,196,.5)';
  el.style.outlineOffset = '2px';
  el.style.cursor = 'text';
  el.style.borderRadius = '4px';
  el.addEventListener('input', () => {
    _markDirty();
    onSave && onSave(el.textContent.trim());
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  });
}

// ─── EDITOR DE MÓDULOS ─────────────────────────────────────────────────────
function _activateModuleEditor() {
  // Escuchar cuando se renderiza el grid
  const origRenderGrid = window.renderGrid;
  if (origRenderGrid) {
    window.renderGrid = function() {
      origRenderGrid.apply(this, arguments);
      if (window._editorActive) {
        setTimeout(_attachModuleEditorUI, 50);
      }
    };
  }
  setTimeout(_attachModuleEditorUI, 100);
}

function _attachModuleEditorUI() {
  if (!window._editorActive) return;

  // Para cada module-card visible
  document.querySelectorAll('.module-card').forEach(card => {
    const mid = card.dataset.mid;
    const m = window.MODULES.find(x => x.id === mid);
    if (!m) return;

    // Evitar duplicar
    if (card.querySelector('.ed-module-overlay')) return;

    // ── Overlay de controles sobre mc-head ──
    const overlay = document.createElement('div');
    overlay.className = 'ed-module-overlay';
    overlay.style.cssText = 'position:absolute;top:4px;right:8px;display:flex;gap:4px;z-index:10;';

    // Botón editar título de módulo
    const btnEditTitle = _edBtn('✎', 'Editar título', () => {
      const titleEl = card.querySelector('.mc-title');
      if (!titleEl) return;
      const current = m.title;
      const newTitle = prompt('Título del módulo:', current);
      if (newTitle && newTitle.trim() && newTitle.trim() !== current) {
        m.title = newTitle.trim();
        m.desc  = newTitle.trim();
        _markDirty();
        window.renderGrid && window.renderGrid();
      }
    });

    // Botón editar emoji
    const btnEmoji = _edBtn('😀', 'Cambiar emoji', () => {
      const newEmoji = prompt('Emoji del módulo:', m.emoji);
      if (newEmoji && newEmoji.trim()) {
        m.emoji = newEmoji.trim();
        _markDirty();
        window.renderGrid && window.renderGrid();
      }
    });

    // Botón agregar archivo
    const btnAdd = _edBtn('＋ Archivo', 'Añadir archivo', () => _showAddFileDialog(m));
    btnAdd.style.fontSize = '.7rem';
    btnAdd.style.padding = '2px 6px';

    // Botón eliminar módulo
    const btnDel = _edBtn('🗑', 'Eliminar módulo', () => {
      if (!confirm(`¿Eliminar el módulo "${m.title}"? Esto no se puede deshacer.`)) return;
      const idx = window.MODULES.findIndex(x => x.id === mid);
      if (idx !== -1) {
        window.MODULES.splice(idx, 1);
        // También actualizar order
        if (window.order) {
          const oi = window.order.indexOf(mid);
          if (oi !== -1) window.order.splice(oi, 1);
        }
        _markDirty();
        window.renderGrid && window.renderGrid();
      }
    });
    btnDel.style.background = 'rgba(192,57,43,.8)';

    overlay.append(btnEditTitle, btnEmoji, btnAdd, btnDel);
    card.style.position = 'relative';
    card.prepend(overlay);

    // ── Controles en cada file-card ──
    card.querySelectorAll('.file-card').forEach(fc => {
      const fi = parseInt(fc.dataset.fi);
      const f  = m.files[fi];
      if (!f) return;
      if (fc.querySelector('.ed-file-controls')) return;

      const ctrl = document.createElement('div');
      ctrl.className = 'ed-file-controls';
      ctrl.style.cssText = 'display:flex;gap:3px;flex-shrink:0;margin-left:auto;align-items:center;';
      ctrl.addEventListener('pointerdown', e => e.stopPropagation());
      ctrl.addEventListener('click', e => e.stopPropagation());

      // Editar nombre
      const btnName = _edBtn('✎', 'Editar nombre', (e) => {
        e.stopPropagation();
        const newName = prompt('Nombre del archivo:', f.n);
        if (newName && newName.trim() && newName.trim() !== f.n) {
          f.n = newName.trim();
          _markDirty();
          window.renderGrid && window.renderGrid();
        }
      });

      // Editar URL
      const btnUrl = _edBtn('🔗', 'Editar URL', (e) => {
        e.stopPropagation();
        const newUrl = prompt('URL del archivo:', f.url);
        if (newUrl !== null && newUrl.trim() !== f.url) {
          f.url = newUrl.trim();
          // Detectar si es externo (no drive.google.com)
          f.ext = !newUrl.includes('drive.google.com') && newUrl !== '#';
          _markDirty();
          window.renderGrid && window.renderGrid();
        }
      });

      // Eliminar archivo
      const btnDelF = _edBtn('✕', 'Eliminar archivo', (e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar "${f.n}"?`)) return;
        m.files.splice(fi, 1);
        // Actualizar fileOrders
        if (window.fileOrders && window.fileOrders[mid]) {
          window.fileOrders[mid] = m.files.map((_, i) => i);
        }
        _markDirty();
        window.renderGrid && window.renderGrid();
      });
      btnDelF.style.background = 'rgba(192,57,43,.8)';

      ctrl.append(btnName, btnUrl, btnDelF);
      fc.appendChild(ctrl);
    });
  });

  // Botón "＋ Añadir módulo" al final del grid
  const grid = document.getElementById('modules-grid');
  if (grid && !document.getElementById('ed-add-module-btn')) {
    const addBtn = document.createElement('button');
    addBtn.id = 'ed-add-module-btn';
    addBtn.textContent = '＋ Añadir sección';
    addBtn.style.cssText = 'grid-column:1/-1;background:var(--bg3);border:2px dashed var(--border);color:var(--accent2);font-family:"DM Sans",sans-serif;font-size:.85rem;font-weight:600;border-radius:16px;padding:1rem;cursor:pointer;transition:all .2s;';
    addBtn.onmouseenter = () => addBtn.style.borderColor = 'var(--accent2)';
    addBtn.onmouseleave = () => addBtn.style.borderColor = 'var(--border)';
    addBtn.onclick = _showAddModuleDialog;
    grid.appendChild(addBtn);
  }
}

// ─── DIÁLOGOS ──────────────────────────────────────────────────────────────
function _showAddFileDialog(m) {
  const name = prompt('Nombre del archivo:');
  if (!name || !name.trim()) return;
  const url  = prompt('URL del archivo (o # si aún no tienes el link):', '#');
  if (url === null) return;
  const type = prompt('Tipo (PDF / Enlace / Video):', 'PDF') || 'PDF';
  const isDrive = url.includes('drive.google.com');
  m.files.push({
    n: name.trim(),
    url: url.trim(),
    type: type.trim(),
    ext: !isDrive && url.trim() !== '#'
  });
  if (window.fileOrders) window.fileOrders[m.id] = m.files.map((_, i) => i);
  _markDirty();
  window.renderGrid && window.renderGrid();
}

function _showAddModuleDialog() {
  const title = prompt('Título de la nueva sección:');
  if (!title || !title.trim()) return;
  const emoji = prompt('Emoji:', '📄') || '📄';
  const id = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) + '_' + Date.now();
  const newMod = { id, emoji, bg: '#e4ecf7', title: title.trim(), desc: title.trim(), files: [] };
  window.MODULES.push(newMod);
  if (window.order) window.order.push(id);
  if (window.fileOrders) window.fileOrders[id] = [];
  if (window.checked) window.checked[id] = {};
  _markDirty();
  window.renderGrid && window.renderGrid();
}

// ─── HELPER: crear botón del editor ────────────────────────────────────────
function _edBtn(label, title, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  b.title = title;
  b.style.cssText = 'background:rgba(26,58,107,.85);color:#fff;border:none;border-radius:6px;padding:3px 7px;font-size:.72rem;cursor:pointer;font-family:"DM Sans",sans-serif;white-space:nowrap;backdrop-filter:blur(4px);';
  b.addEventListener('click', onClick);
  b.addEventListener('pointerdown', e => e.stopPropagation());
  return b;
}

// ─── LEGACY (compatibilidad con firebase-auth.js) ──────────────────────────
function cancelEdit() {
  const eb = document.getElementById('entry-body');
  if (eb && window._editorOriginalContent) {
    eb.innerHTML = window._editorOriginalContent;
    showToast('Cambios descartados');
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.save-btn')?.addEventListener('click', saveToGitHub);
  document.querySelector('.cancel-btn')?.addEventListener('click', cancelEdit);
});

window.activateEditor   = activateEditor;
window.deactivateEditor = deactivateEditor;
window.saveToGitHub     = saveToGitHub;
window.showToast        = showToast;
