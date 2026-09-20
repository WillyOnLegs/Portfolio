/* ==========================================================================
   Idle Suggest — étiquette + éventail de suggestions autour du curseur
   Desktop only, page d'accueil uniquement, une seule fois par session.
   ========================================================================== */
(function () {
  'use strict';

  if (!document.body.classList.contains('page-accueil')) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (sessionStorage.getItem('wol-suggest-shown')) return;

  var DELAI_APPARITION = 4500; // ms avant que l'étiquette apparaisse
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var curX = window.innerWidth / 2;
  var curY = window.innerHeight * 0.55;
  var aBouge = false;

  function onMove(e) {
    curX = e.clientX;
    curY = e.clientY;
    aBouge = true;
  }
  document.addEventListener('mousemove', onMove, { passive: true });

  function creerWidget() {
    var wrap = document.createElement('div');
    wrap.className = 'idle-suggest';
    wrap.id = 'idle-suggest';
    wrap.innerHTML =
      '<button type="button" class="idle-suggest-label" id="idle-suggest-label" aria-expanded="false">' +
        '<span class="idle-suggest-label-txt">Envie de voir un truc&nbsp;?</span>' +
        '<span class="idle-suggest-arrow" aria-hidden="true">&rarr;</span>' +
      '</button>' +
      '<div class="idle-suggest-fan" id="idle-suggest-fan" role="menu" aria-label="Suggestions de navigation">' +
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

  function init() {
    document.removeEventListener('mousemove', onMove);
    sessionStorage.setItem('wol-suggest-shown', '1');

    var wrap = creerWidget();
    var label = wrap.querySelector('#idle-suggest-label');
    var fan = wrap.querySelector('#idle-suggest-fan');
    var ouvert = false;

    wrap.style.setProperty('--is-x', curX + 'px');
    wrap.style.setProperty('--is-y', curY + 'px');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add('idle-suggest--visible');
      });
    });

    function onKey(e) {
      if (e.key === 'Escape') fermer();
    }
    function onClicExterieur(e) {
      if (!wrap.contains(e.target)) fermer();
    }

    function ouvrir() {
      if (ouvert) return;
      ouvert = true;
      wrap.classList.add('idle-suggest--ouvert');
      label.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKey);
      document.addEventListener('click', onClicExterieur, true);
    }

    function fermer() {
      wrap.classList.remove('idle-suggest--visible', 'idle-suggest--ouvert');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClicExterieur, true);
      setTimeout(function () {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 400);
    }

    label.addEventListener('click', ouvrir);
    window.addEventListener('scroll', fermer, { once: true, passive: true });

    Array.prototype.forEach.call(fan.querySelectorAll('.idle-suggest-pastille'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cible = btn.dataset.cible;
        fermer();
        agir(cible);
      });
    });
  }

  setTimeout(function () {
    if (!aBouge) {
      curX = window.innerWidth / 2;
      curY = window.innerHeight * 0.55;
    }
    init();
  }, reduceMotion ? 300 : DELAI_APPARITION);
})();
