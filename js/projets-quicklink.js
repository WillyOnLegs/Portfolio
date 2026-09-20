/* ==========================================================================
   Projets Quicklink — pré-filtre la liste des projets via ?type=a,b dans l'URL
   Ne touche pas à la logique interne de projets.js : applique juste un filtre
   d'affichage par-dessus, une fois que la liste est rendue.
   ========================================================================== */
(function () {
  'use strict';

  if (!document.body.classList.contains('page-projets')) return;

  var params = new URLSearchParams(window.location.search);
  var typeParam = params.get('type');
  if (!typeParam) return;

  var typesVoulus = typeParam.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  if (!typesVoulus.length) return;

  var LABELS = { 'motion-2d,motion-3d': 'Motion', 'graphic-design,branding': 'Graphic' };

  function appliquer() {
    var articles = document.querySelectorAll('.projet-item');
    if (!articles.length) return false;

    articles.forEach(function (article) {
      var typesArticle = (article.dataset.type || '').split(' ');
      var visible = typesVoulus.some(function (t) { return typesArticle.indexOf(t) !== -1; });
      article.style.display = visible ? '' : 'none';
      article.style.opacity = visible ? '1' : '0';
    });

    var navItems = document.querySelectorAll('.split-nav-item');
    navItems.forEach(function (item, i) {
      var article = articles[i];
      if (!article) return;
      var visible = article.style.display !== 'none';
      item.style.opacity = visible ? '' : '0.05';
      item.style.pointerEvents = visible ? '' : 'none';
    });

    var valEl = document.querySelector('#filtre-type .filtre-dropdown-val');
    var btn = document.querySelector('#filtre-type .filtre-dropdown-btn');
    var label = LABELS[typeParam];
    if (valEl && label) valEl.textContent = label;
    if (btn && label) btn.classList.add('actif');

    return true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // La liste (et le split-nav en vue liste desktop) est injectée par
    // projets.js sur le même évènement ; comme ce script est chargé après,
    // son écouteur DOMContentLoaded s'exécute après le sien. On attend
    // deux frames de plus par sécurité pour laisser le split-nav se monter.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        appliquer();
      });
    });
  });
})();
