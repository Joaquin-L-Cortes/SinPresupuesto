/* ── NAV-LOADER.JS ─────────────────────────────────────────
   Carga _data/nav.json y rellena:
     #nav-links-dynamic      → barra superior
     #drawer-nav-dynamic     → sección "Navegación" del drawer
     #drawer-secciones-dynamic → sección "Secciones de material" del drawer
   Se incluye en todas las páginas estáticas (index, clases,
   comunidad, materiales, redes). Las páginas generadas con
   modulo.njk ya usan Nunjucks directamente y no lo necesitan.
────────────────────────────────────────────────────────── */
(function () {
  var thisPage = location.pathname.split('/').pop() || 'index.html';
  if (thisPage === '') thisPage = 'index.html';

  /* Convierte "clases.html" → "/clases.html" para que los enlaces
     funcionen desde cualquier ruta, no solo desde la raíz */
  function abs(href) {
  if (!href) return '#';
  return href.startsWith('http') ? href : href;
}

  fetch('_data/nav.json')
    .then(function (r) { return r.json(); })
    .then(function (nav) {

      /* ── Barra superior ── */
      var ulTop = document.getElementById('nav-links-dynamic');
      if (ulTop) {
        ulTop.innerHTML = (nav.nav_principal || []).map(function (item) {
          var active = item.href === thisPage ? ' class="active"' : '';
          return '<li><a href="' + abs(item.href) + '"' + active + '>' + item.label + '</a></li>';
        }).join('');
      }

      /* ── Drawer: menú principal ── */
      var ulDrawerNav = document.getElementById('drawer-nav-dynamic');
      if (ulDrawerNav) {
        ulDrawerNav.innerHTML = (nav.nav_principal || []).map(function (item) {
          var active = item.href === thisPage ? ' class="active"' : '';
          return '<li><a href="' + abs(item.href) + '"' + active + '>'
            + '<span class="s-emoji">' + (item.emoji || '') + '</span>'
            + item.label + '</a></li>';
        }).join('');
      }

      /* ── Drawer: secciones de material ── */
      var ulDrawerSecs = document.getElementById('drawer-secciones-dynamic');
      if (ulDrawerSecs) {
        ulDrawerSecs.innerHTML = (nav.secciones_material || []).map(function (item) {
          return '<li><a href="' + abs(item.href) + '">'
            + '<span class="s-emoji">' + (item.emoji || '') + '</span>'
            + item.label + '</a></li>';
        }).join('');
      }
    })
    .catch(function () { /* sin conexión o archivo ausente: el nav queda vacío */ });
})();
