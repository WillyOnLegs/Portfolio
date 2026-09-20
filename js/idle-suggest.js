/* ==========================================================================
   Idle Suggest — éventail de suggestions ancré au curseur
   Desktop only, page d'accueil uniquement.
   - Démo automatique une seule fois (tout premier passage, via localStorage)
   - Ensuite : appui maintenu sur la touche W n'importe où sur la page
   ========================================================================== */
(function () {
  'use strict';

  if (!document.body.classList.contains('page-accueil')) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var SEUIL_HOLD = 550;   // ms de maintien de W avant activation
  var DELAI_DEMO = 4000;  // ms avant la démo automatique au tout premier passage
  var CLE_VU = 'wol-suggest-vu';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var curX = window.innerWidth / 2;
  var curY = window.innerHeight * 0.55;
  function onMove(e) {
    curX = e.clientX;
    curY = e.clientY;
  }
  document.addEventListener('mousemove', onMove, { passive: true });

  function estChampSaisie(el) {
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  }

  function texteCaption() {
    var fr = document.documentElement.lang === 'fr';
    return fr ? 'Que veux-tu voir\u00a0?' : 'What do you want to see?';
  }

  var widgetActuel = null;

  function creerWidget(x, y) {
    var wrap = document.createElement('div');
    wrap.className = 'idle-suggest';
    wrap.style.setProperty('--is-x', x + 'px');
    wrap.style.setProperty('--is-y', y + 'px');
    wrap.innerHTML =
      '<p class="idle-suggest-label">' + texteCaption() + '</p>' +
      '<div class="idle-suggest-fan" role="menu" aria-label="Suggestions de navigation">' +
        '<button type="button" class="idle-suggest-pastille" data-cible="showreel" role="menuitem"><span>Showreel</span></button>' +
        '<button type="button" class="idle-suggest-pastille" data-cible="motion" role="menuitem"><span>Motion</span></button>' +
        '<button type="button" class="idle-suggest-pastille" data-cible="graphic" role="menuitem"><span>Graphic</span></button>' +
      '</div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  function agir(cible) {
    if (cible === 'showreel') {
      var carte = document.querySelector('.showreel-card');
      if (!carte) return;
      carte.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () {
        carte.click();
      }, 550);
      return;
    }
    var typesParPage = { motion: 'motion-2d,motion-3d', graphic: 'graphic-design,branding' };
    window.location.href = '/work?type=' + typesParPage[cible];
  }

  function onKeyFermer(e) {
    if (e.key === 'Escape') fermerWidget();
  }
  function onClicExterieur(e) {
    if (widgetActuel && !widgetActuel.contains(e.target)) fermerWidget();
  }

  function fermerWidget() {
    if (!widgetActuel) return;
    var wrap = widgetActuel;
    widgetActuel = null;
    wrap.classList.remove('idle-suggest--visible');
    document.removeEventListener('keydown', onKeyFermer);
    document.removeEventListener('click', onClicExterieur, true);
    setTimeout(function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, 400);
  }

  function ouvrirEventail(x, y) {
    if (widgetActuel) return; // déjà ouvert, on ne double pas

    var wrap = creerWidget(x, y);
    widgetActuel = wrap;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('idle-suggest--visible');
      });
    });

    document.addEventListener('keydown', onKeyFermer);
    document.addEventListener('click', onClicExterieur, true);
    window.addEventListener('scroll', fermerWidget, { once: true, passive: true });

    Array.prototype.forEach.call(wrap.querySelectorAll('.idle-suggest-pastille'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cible = btn.dataset.cible;
        fermerWidget();
        agir(cible);
      });
    });
  }

  /* -- Déclencheur clavier : maintenir W --------------------------------- */
  var wTimer = null;
  var wEnCours = false;

  document.addEventListener('keydown', function (e) {
    if (wEnCours) return; // ignore la répétition auto du keydown pendant le maintien
    if (!e.key || e.key.toLowerCase() !== 'w') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // laisse passer Ctrl/Cmd+W etc.
    if (estChampSaisie(document.activeElement)) return;
    wEnCours = true;
    wTimer = setTimeout(function () {
      ouvrirEventail(curX, curY);
    }, reduceMotion ? 0 : SEUIL_HOLD);
  });

  document.addEventListener('keyup', function (e) {
    if (!e.key || e.key.toLowerCase() !== 'w') return;
    wEnCours = false;
    if (wTimer) {
      clearTimeout(wTimer);
      wTimer = null;
    }
  });

  /* -- Démo automatique, une seule fois au tout premier passage ---------- */
  if (!localStorage.getItem(CLE_VU)) {
    localStorage.setItem(CLE_VU, '1');
    setTimeout(function () {
      ouvrirEventail(curX, curY);
    }, reduceMotion ? 300 : DELAI_DEMO);
  }
})();
