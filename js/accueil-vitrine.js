/* ==============================================================
   Accueil — passage vitrine → showreel (version « D »)
   1. Des bandes blanches arrivent des côtés et referment la vitrine
      comme une fenêtre, pile au format de la vidéo (16:9)
   2. Le showreel prend le relais en fondu dans cette même fenêtre
   3. La fenêtre reste un instant, puis la page reprend son cours :
      le titre « Showreel » arrive juste en dessous
   Remplace l'ancienne animation de accueil.js (désactivée par le
   drapeau window.__vitrineD).
   ============================================================== */
window.__vitrineD = true;

(function () {
  'use strict';

  var REDUIT = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return c01((p - a) / (b - a)); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function init() {
    var scene = document.querySelector('.hero-scene');
    var hero = document.querySelector('.hero');
    var wrap = document.querySelector('.hero-video-wrap');
    var heroVid = document.querySelector('.hero-video');
    var srBloc = document.querySelector('.hero-showreel');
    var srVid = document.getElementById('showreel-video');
    var km27 = hero ? hero.querySelector('.hero-km27') : null;
    if (!scene || !hero || !wrap) return;

    // Bandes blanches gauche / droite (+ haut / bas pour fermer la fenêtre)
    var bandes = {};
    ['g', 'd'].forEach(function (k) {
      var b = document.createElement('div');
      b.className = 'hero-band-blanc hero-band-blanc--' + k;
      hero.appendChild(b);
      bandes[k] = b;
    });

    // Copies noires des titres, visibles seulement sur les bandes blanches
    var clones = [];
    if (km27) {
      ['g', 'd'].forEach(function (k) {
        var cl = km27.cloneNode(true);
        cl.classList.add('hero-km27--noir');
        cl.setAttribute('aria-hidden', 'true');
        cl.querySelectorAll('h1').forEach(function (h) {
          var p = document.createElement('p');
          p.className = h.className;
          p.innerHTML = h.innerHTML;
          h.replaceWith(p);
        });
        cl.querySelectorAll('.hero-km27-text').forEach(function (el) {
          el.style.animation = 'none';
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
        document.body.appendChild(cl);
        clones.push({ el: cl, cote: k });
      });
    }

    var srJoue = false;
    function lireShowreel(on) {
      if (!srVid || on === srJoue) return;
      srJoue = on;
      if (on) { var pr = srVid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else { try { srVid.pause(); } catch (_) {} }
    }

    function maj() {
      var r = scene.getBoundingClientRect();
      var zone = scene.offsetHeight - window.innerHeight;
      if (zone <= 0) return;
      var p = c01(-r.top / zone);
      if (REDUIT) p = p > 0.5 ? 1 : 0;

      // 1. Fermeture (0 → 0,55)
      var f = ease(seg(p, 0, 0.55));
      hero.style.setProperty('--hero-p', f.toFixed(4));
      clones.forEach(function (c) { c.el.style.setProperty('--hero-p', f.toFixed(4)); });

      var hR = hero.getBoundingClientRect();
      var wR = wrap.getBoundingClientRect();
      var L = wR.left - hR.left;
      var T = wR.top - hR.top;
      var R = hR.right - wR.right;
      var B = hR.bottom - wR.bottom;
      var rayon = parseFloat(getComputedStyle(wrap).borderTopLeftRadius) || 24;

      if (f > 0.001) {
        hero.style.clipPath = 'inset(' + (T * f).toFixed(1) + 'px ' + (R * f).toFixed(1) + 'px ' +
          (B * f).toFixed(1) + 'px ' + (L * f).toFixed(1) + 'px round ' + (rayon * f).toFixed(1) + 'px)';
      } else {
        hero.style.clipPath = '';
      }
      bandes.g.style.width = (L * f).toFixed(1) + 'px';
      bandes.d.style.width = (R * f).toFixed(1) + 'px';

      if (clones.length && km27) {
        var kR = km27.getBoundingClientRect();
        clones.forEach(function (c) {
          var s = c.el.style;
          s.top = kR.top + 'px';
          s.left = hR.left + 'px';
          s.width = hR.width + 'px';
          s.height = kR.height + 'px';
          var w = (c.cote === 'g' ? L : R) * f;
          s.clipPath = w > 0.5
            ? (c.cote === 'g' ? 'inset(0 ' + (hR.width - w).toFixed(1) + 'px 0 0)' : 'inset(0 0 0 ' + (hR.width - w).toFixed(1) + 'px)')
            : (c.cote === 'g' ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)');
        });
      }

      // 2. Le showreel prend le relais (0,57 → 0,78)
      var x = ease(seg(p, 0.57, 0.78));
      if (srBloc) srBloc.style.opacity = x.toFixed(4);
      lireShowreel(x > 0.01 && r.bottom > 0);
      if (heroVid) {
        if (x >= 1 && !heroVid.paused) { try { heroVid.pause(); } catch (_) {} }
        else if (x < 1 && heroVid.paused) { var pr = heroVid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      }
      wrap.classList.toggle('is-showreel', x > 0.5);
    }

    // Plein écran avec le son quand le showreel est affiché
    function pleinEcran() {
      if (!srVid) return;
      var req = srVid.requestFullscreen || srVid.webkitRequestFullscreen || srVid.webkitEnterFullscreen;
      if (!req) return;
      try { srVid.currentTime = 0; } catch (_) {}
      srVid.muted = (typeof sonActuel !== 'undefined' && sonActuel === 'off');
      srVid.setAttribute('controls', '');
      var res = req.call(srVid);
      var pr = srVid.play(); if (pr && pr.catch) pr.catch(function () {});
      if (res && res.catch) res.catch(function () { srVid.muted = true; srVid.removeAttribute('controls'); });
    }
    function sortiePleinEcran() {
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (!srVid) return;
      srVid.removeAttribute('controls');
      srVid.muted = true;
    }
    wrap.addEventListener('click', function () {
      if (wrap.classList.contains('is-showreel')) pleinEcran();
    });
    var cta = document.querySelector('.featured-cta');
    if (cta) cta.addEventListener('click', pleinEcran);
    document.addEventListener('fullscreenchange', sortiePleinEcran);
    document.addEventListener('webkitfullscreenchange', sortiePleinEcran);

    // Le titre « Showreel » vient se caler juste sous la fenêtre
    // (sans ça, il reste l'espace sous la vidéo de la vitrine, énorme sur mobile)
    var titre = document.querySelector('.section-featured--titre');
    function caler() {
      if (!titre) return;
      var hR = hero.getBoundingClientRect(), wR = wrap.getBoundingClientRect();
      titre.style.marginTop = (-(hR.bottom - wR.bottom)).toFixed(1) + 'px';
    }
    caler();
    window.addEventListener('resize', caler);
    window.addEventListener('load', caler);

    var raf = null;
    function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = null; maj(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    maj();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
