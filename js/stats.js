/* ==============================================================
   WillyOL — Statistiques de visite (GoatCounter)
   Sans cookie, sans adresse IP conservée : pas besoin de bandeau.
   Compte : https://willyol.goatcounter.com (code « willyol »).
   Si le code change, ne modifier que GC_CODE ci-dessous.
   ============================================================== */
(function () {
  'use strict';
  var GC_CODE = 'willyol';

  var h = location.hostname;
  // pas de stats en local (tests) ni quand le visiteur refuse le suivi
  if (!h || h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h)) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  var dernier = location.pathname;

  // l'accueil et les projets changent d'URL sans recharger la page :
  // on compte aussi ces changements
  function compter() {
    var p = location.pathname;
    if (p === dernier) return;
    dernier = p;
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: p, title: document.title, event: false });
    }
  }
  var push = history.pushState;
  history.pushState = function () {
    var r = push.apply(this, arguments);
    setTimeout(compter, 60);
    return r;
  };
  window.addEventListener('popstate', function () { setTimeout(compter, 60); });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', 'https://' + GC_CODE + '.goatcounter.com/count');
  document.head.appendChild(s);
})();
