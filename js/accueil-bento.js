/* ==============================================================
   Accueil — fin de page
   - Bento à propos : le fond passe du noir au blanc au scroll
   - Contact : la carte grandit du coin bas-droit au plein écran
     (et rapetisse si on remonte)
   - Envoi du formulaire (Formspree) + effet sur l'e-mail
   ============================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MQ_DESKTOP = window.matchMedia('(min-width: 901px)');

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function t(key, fallback) {
    var lang = window.langueActuelle || localStorage.getItem('langue') || 'en';
    var d = window.traductions && window.traductions[key];
    return (d && d[lang]) || fallback;
  }

  var abWrap = document.querySelector('.ab-wrap');
  var ctWrap = document.querySelector('.ct-wrap');
  var ctStage = document.querySelector('.ct-stage');
  var ctCard = document.querySelector('.ct-card');
  var ctInner = document.querySelector('.ct-inner');
  var ctTitre = document.querySelector('.ct-titre');
  var ctPreview = document.querySelector('.ct-preview');

  /* ---------- Passage noir -> blanc (façon grapheine) ---------- */
  // Bascule en fondu quand le haut de la zone atteint le haut de l'écran,
  // retour au noir si on remonte (petite marge pour éviter les clignotements).
  var clair = false;
  function majFond() {
    if (!abWrap) return;
    var top = abWrap.getBoundingClientRect().top;
    var vh = window.innerHeight;
    var seuil = MQ_DESKTOP.matches ? vh * 0.08 : vh * 0.3;
    if (!clair && top <= seuil) clair = true;
    else if (clair && top > seuil + vh * 0.08) clair = false;
    abWrap.classList.toggle('is-clair', clair);
  }

  /* ---------- À propos : la roue de mots ---------- */
  // « Nathan Colin, » reste en place, la fin de la phrase change au scroll.
  // Chaque mot reste affiché un moment, puis la roue tourne d'un cran.
  var roueZone = document.querySelector('.ab-roue-zone');
  var roue = document.querySelector('.ab-roue');
  var points = document.querySelectorAll('.ab-points i');
  function majRoue() {
    if (!roueZone || !roue) return;
    var mots = roue.children, n = mots.length;
    if (!n) return;
    var r = roueZone.getBoundingClientRect();
    var zone = roueZone.offsetHeight - window.innerHeight;
    var p = zone > 0 ? clamp01(-r.top / zone) : 0;
    var pos = clamp01((p - 0.04) / 0.9) * (n - 1);
    var base = Math.floor(pos), fr = pos - base;
    var y = Math.min(n - 1, base + (REDUCED ? (fr > 0.5 ? 1 : 0) : ease(clamp01((fr - 0.5) / 0.5))));
    var h = mots[0].offsetHeight;
    roue.style.transform = 'translateY(' + (-y * h).toFixed(2) + 'px)';
    var actif = Math.round(y);
    for (var k = 0; k < points.length; k++) points[k].classList.toggle('on', k === actif);
    for (var m = 0; m < n; m++) mots[m].setAttribute('aria-hidden', m === actif ? 'false' : 'true');
  }

  /* ---------- Contact : la carte grandit ---------- */
  var ouvert = null;
  function setOuvert(on) {
    if (on === ouvert) return;
    ouvert = on;
    ctWrap.classList.toggle('is-open', on);
    if ('inert' in ctInner) ctInner.inert = !on;
  }

  // Position finale du titre (dans la mise en page plein écran)
  var fin = null;
  function mesurerTitre() {
    if (!ctTitre || !ctInner) return;
    var prev = ctTitre.style.transform;
    ctTitre.style.transform = 'none';
    var r = ctTitre.getBoundingClientRect();
    var ir = ctInner.getBoundingClientRect();
    fin = { x: r.left - ir.left, y: r.top - ir.top, w: r.width, h: r.height };
    ctTitre.style.transform = prev;
  }

  function majContact() {
    if (!ctWrap || !ctCard || !ctInner) return;
    if (!MQ_DESKTOP.matches) {
      ctCard.removeAttribute('style');
      ctInner.removeAttribute('style');
      if (ctTitre) ctTitre.style.transform = '';
      ctWrap.style.removeProperty('--ct-p');
      ctWrap.style.removeProperty('--ct-fade');
      setOuvert(true);
      return;
    }
    var r = ctWrap.getBoundingClientRect();
    var W = ctStage.clientWidth;
    var H = ctStage.clientHeight;
    var zone = ctWrap.offsetHeight - H;
    var p = zone > 0 ? clamp01(-r.top / zone) : 1;
    var e = REDUCED ? (p > 0.5 ? 1 : 0) : ease(p);

    var m = parseFloat(getComputedStyle(ctInner).paddingRight) || 24;
    var w0 = Math.min(W * 0.34, 500);
    var h0 = w0 * 0.62;
    var x0 = W - w0 - m;
    var y0 = H - h0 - m;

    var x = x0 * (1 - e);
    var y = y0 * (1 - e);
    var w = w0 + (W - w0) * e;
    var h = h0 + (H - h0) * e;
    ctCard.style.left = x + 'px';
    ctCard.style.top = y + 'px';
    ctCard.style.width = w + 'px';
    ctCard.style.height = h + 'px';
    ctCard.style.setProperty('--ct-r', (20 * (1 - e)).toFixed(2) + 'px');
    // le contenu reste fixe à l'écran, la carte le dévoile comme une fenêtre
    ctInner.style.left = (-x) + 'px';
    ctInner.style.top = (-y) + 'px';

    // Le titre part du coin bas-gauche de la petite carte et rejoint sa place
    if (ctTitre) {
      if (!fin) mesurerTitre();
      var pad = Math.max(16, Math.min(24, W * 0.016));
      var s0 = Math.min(1, (w0 * 0.62) / fin.w);
      var s = s0 + (1 - s0) * e;
      // ancré à la carte : il reste toujours dans sa fenêtre
      var px = x + pad + (fin.x - pad) * e;
      var py = y + (h - pad - fin.h * s) * (1 - e) + fin.y * e;
      ctTitre.style.transform = 'translate(' + (px - fin.x).toFixed(2) + 'px,' + (py - fin.y).toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }

    ctWrap.style.setProperty('--ct-p', e.toFixed(4));
    ctWrap.style.setProperty('--ct-fade', clamp01((e - 0.62) / 0.3).toFixed(4));
    setOuvert(e > 0.97);
  }

  if (ctPreview) {
    ctPreview.addEventListener('click', function () {
      var cible = ctWrap.getBoundingClientRect().top + window.scrollY + ctWrap.offsetHeight - window.innerHeight;
      if (window.__lenis && typeof window.__lenis.scrollTo === 'function') window.__lenis.scrollTo(cible, { duration: 1.6 });
      else window.scrollTo({ top: cible, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  var raf = null;
  function maj() { raf = null; majFond(); majRoue(); majContact(); }
  function onScroll() { if (!raf) raf = requestAnimationFrame(maj); }
  function onResize() { fin = null; onScroll(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  if (MQ_DESKTOP.addEventListener) MQ_DESKTOP.addEventListener('change', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  maj();

  /* ---------- Formulaire ---------- */
  var form = document.querySelector('.ct-wrap [data-cc-form]');
  if (form) {
    var feedback = form.querySelector('[data-cc-feedback]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('.bf-submit-label') : null;

    var setFeedback = function (msg, type) {
      if (!feedback) return;
      feedback.textContent = msg || '';
      feedback.classList.remove('is-error', 'is-success');
      if (type) feedback.classList.add(type);
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.setAttribute('disabled', '');
      if (label) label.textContent = t('form.feedback.sending', 'Sending…');
      setFeedback('');
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('Submit failed');
          setFeedback(t('form.feedback.success', 'Message sent — thanks!'), 'is-success');
          form.reset();
          if (label) label.textContent = t('form.feedback.sent', 'Sent ✓');
          setTimeout(function () {
            btn.removeAttribute('disabled');
            if (label) label.textContent = t('form.submit', 'Send message');
          }, 3000);
        })
        .catch(function () {
          setFeedback(t('form.feedback.error', 'Oops, something went wrong. Try again.'), 'is-error');
          btn.removeAttribute('disabled');
          if (label) label.textContent = t('form.submit', 'Send message');
        });
    });
  }

  /* ---------- E-mail : lettres qui se mélangent au survol ---------- */
  var mail = document.querySelector('.ct-email');
  var txt = mail ? mail.querySelector('.ct-email-txt') : null;
  if (mail && txt && !REDUCED) {
    var orig = txt.textContent;
    var pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var rafM = null;
    mail.addEventListener('mouseenter', function () {
      if (rafM) cancelAnimationFrame(rafM);
      var t0 = performance.now();
      (function go(now) {
        var p = Math.min(1, (now - t0) / 600);
        var rev = Math.floor(p * orig.length);
        txt.textContent = Array.from(orig).map(function (c, i) {
          return i < rev || c === '@' || c === '.' ? c : pool[Math.floor(Math.random() * pool.length)];
        }).join('');
        if (p < 1) rafM = requestAnimationFrame(go);
        else txt.textContent = orig;
      })(t0);
    });
  }
})();
