/* ==============================================================
   WillyOL — Vidéos qui ne jouent qu'à l'écran
   Toutes les vidéos marquées data-vue (accueil, liste des projets) :
   - ne se chargent qu'en approchant de l'écran (preload="none"
     jusque-là, avec une image d'aperçu en attendant),
   - jouent quand elles sont visibles,
   - se mettent en pause dès qu'elles sortent de l'écran.
   Moins de données téléchargées, moins de vidéos décodées en même
   temps : la page reste fluide.
   ============================================================== */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('video[data-vue]').forEach(function (v) { v.autoplay = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); });
    return;
  }

  var io = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        if (v.dataset.pauseManuelle === '1') return;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!v.paused && !document.fullscreenElement) {
        try { v.pause(); } catch (_) {}
      }
    });
  }, { rootMargin: '200px 0px' });

  function suivre(racine) {
    (racine || document).querySelectorAll('video[data-vue]').forEach(function (v) {
      if (v._vue) return;
      v._vue = true;
      io.observe(v);
    });
  }

  // les listes construites en JS (Selected work, page Projets) arrivent après
  var mo = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) { suivre(document); return; }
    }
  });

  function init() {
    suivre(document);
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
