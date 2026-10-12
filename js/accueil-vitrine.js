/* ==============================================================
   Accueil — passage vitrine → showreel (version « M1 »,
   masque typographique)
   1. Les titres de la vitrine s'effacent, un écran blanc monte depuis
      le bas avec « SHOWREEL » en lettres géantes : le showreel joue
      à travers les lettres
   2. On zoome dans le mot (jambe gauche du O) jusqu'à ce que la vidéo
      remplisse l'écran
   3. Le showreel se range dans sa fenêtre, le titre « Showreel »
      arrive juste en dessous
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
  // Courbe « expo » : départ et arrivée très doux, milieu rapide
  function expo(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function init() {
    var scene = document.querySelector('.hero-scene');
    var hero = document.querySelector('.hero');
    var wrap = document.querySelector('.hero-video-wrap');
    var heroVid = document.querySelector('.hero-video');
    var srVid = document.getElementById('showreel-video');
    var cotes = hero ? hero.querySelectorAll('.hero-km27-gauche, .hero-km27-droite') : [];
    if (!scene || !hero || !wrap || !srVid) return;

    // Le panneau : showreel + masque blanc avec le mot en noir.
    // En mode « screen », le noir laisse voir la vidéo, le blanc reste blanc.
    var panneau = document.createElement('div');
    panneau.className = 'hero-m1';
    var masque = document.createElement('div');
    masque.className = 'hero-m1-masque';
    masque.setAttribute('aria-hidden', 'true');
    var mot = document.createElement('div');
    mot.className = 'hero-m1-mot';
    'SHOWREEL'.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.textContent = ch;
      mot.appendChild(s);
    });
    masque.appendChild(mot);
    panneau.appendChild(srVid);          // la vidéo du showreel passe dans le panneau
    panneau.appendChild(masque);
    hero.appendChild(panneau);
    var lettres = Array.prototype.slice.call(mot.children);

    // Taille du mot : environ 88 % de la largeur de l'écran
    var origine = null;
    function mesurer() {
      mot.style.transform = 'none';
      mot.style.fontSize = '100px';
      var w = mot.scrollWidth || 1;
      var t = Math.min(100 * hero.clientWidth * 0.88 / w, hero.clientHeight * 0.5);
      mot.style.fontSize = t + 'px';
      // point de zoom : jambe gauche du « O »
      var o = lettres[2];
      origine = ((o.offsetLeft - mot.offsetLeft + o.offsetWidth * 0.16) / (mot.offsetWidth || 1) * 100) + '% 50%';
      mot.style.transformOrigin = origine;
    }

    var srJoue = false;
    function lireShowreel(on) {
      if (on === srJoue) return;
      srJoue = on;
      if (on) { var pr = srVid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else { try { srVid.pause(); } catch (_) {} }
    }

    var etatFenetre = false;
    function maj() {
      var r = scene.getBoundingClientRect();
      var zone = scene.offsetHeight - window.innerHeight;
      if (zone <= 0) return;
      var p = c01(-r.top / zone);
      if (REDUIT) p = p > 0.5 ? 1 : 0;

      // 1. Les titres montent et s'effacent, la vidéo d'accueil avance un peu
      var a = ease(seg(p, 0, 0.18));
      for (var i = 0; i < cotes.length; i++) {
        cotes[i].style.transform = 'translateY(' + (-a * 18).toFixed(2) + 'vh)';
        cotes[i].style.opacity = (1 - a).toFixed(3);
      }
      if (heroVid) heroVid.style.transform = 'scale(' + (1 + 0.08 * ease(seg(p, 0, 0.32))).toFixed(4) + ')';

      // 2. L'écran blanc monte depuis le bas (0,10 → 0,32)
      var w = expo(seg(p, 0.1, 0.32));
      panneau.style.visibility = w > 0 ? 'visible' : 'hidden';
      panneau.style.clipPath = w < 1 ? 'inset(' + ((1 - w) * 100).toFixed(2) + '% 0 0 0)' : 'none';

      // Les lettres arrivent en cascade (0,18 → 0,40)
      var l = seg(p, 0.18, 0.4);
      lettres.forEach(function (s, k) {
        s.style.transform = 'translateY(' + ((1 - ease(c01((l - k * 0.06) / 0.5))) * 110).toFixed(1) + '%)';
      });

      // 3. Zoom dans le mot (0,42 → 0,66), le blanc s'efface à la fin
      var z = seg(p, 0.42, 0.66);
      mot.style.transform = z > 0 ? 'scale(' + Math.exp(Math.log(40) * Math.pow(z, 2.2)).toFixed(3) + ')' : 'none';
      masque.style.opacity = (1 - seg(z, 0.55, 0.9)).toFixed(3);
      masque.style.visibility = z >= 0.9 ? 'hidden' : 'visible';

      // Une fois le panneau monté, tout autour devient blanc
      var couvert = w >= 1;
      hero.classList.toggle('is-m1', couvert);

      // 4. Le showreel se range dans sa fenêtre (0,70 → 0,86)
      var s = expo(seg(p, 0.7, 0.86));
      var hR = hero.getBoundingClientRect(), wR = wrap.getBoundingClientRect();
      var rayon = parseFloat(getComputedStyle(wrap).borderTopLeftRadius) || 24;
      var st = panneau.style;
      st.left = lerp(0, wR.left - hR.left, s).toFixed(1) + 'px';
      st.top = lerp(0, wR.top - hR.top, s).toFixed(1) + 'px';
      st.width = lerp(hR.width, wR.width, s).toFixed(1) + 'px';
      st.height = lerp(hR.height, wR.height, s).toFixed(1) + 'px';
      st.borderRadius = (rayon * s).toFixed(1) + 'px';

      lireShowreel(w > 0 && r.bottom > 0);
      if (heroVid) {
        if (couvert && !heroVid.paused) { try { heroVid.pause(); } catch (_) {} }
        else if (!couvert && heroVid.paused) { var pr = heroVid.play(); if (pr && pr.catch) pr.catch(function () {}); }
      }
      var f = s > 0.5;
      if (f !== etatFenetre) {
        etatFenetre = f;
        panneau.classList.toggle('is-showreel', f);
        wrap.classList.toggle('is-showreel', f);
      }
    }

    // Plein écran avec le son quand le showreel est dans sa fenêtre
    function pleinEcran() {
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
      srVid.removeAttribute('controls');
      srVid.muted = true;
    }
    panneau.addEventListener('click', function () {
      if (panneau.classList.contains('is-showreel')) pleinEcran();
    });
    var cta = document.querySelector('.featured-cta');
    if (cta) cta.addEventListener('click', pleinEcran);
    document.addEventListener('fullscreenchange', sortiePleinEcran);
    document.addEventListener('webkitfullscreenchange', sortiePleinEcran);

    // Le titre « Showreel » vient se caler juste sous la fenêtre
    var titre = document.querySelector('.section-featured--titre');
    function caler() {
      if (!titre) return;
      var hR = hero.getBoundingClientRect(), wR = wrap.getBoundingClientRect();
      titre.style.marginTop = (-(hR.bottom - wR.bottom)).toFixed(1) + 'px';
    }

    function tout() { mesurer(); caler(); maj(); }
    var raf = null;
    function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = null; maj(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', tout);
    window.addEventListener('load', tout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(tout);
    tout();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
