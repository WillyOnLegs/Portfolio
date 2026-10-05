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
  var abStage = document.querySelector('.ab-stage');
  var ctWrap = document.querySelector('.ct-wrap');
  var ctStage = document.querySelector('.ct-stage');
  var ctCard = document.querySelector('.ct-card');
  var ctInner = document.querySelector('.ct-inner');
  var ctPreview = document.querySelector('.ct-preview');

  /* ---------- Bento : noir -> blanc ---------- */
  function majFond() {
    if (!abWrap || !abStage) return;
    var r = abWrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var tt;
    if (MQ_DESKTOP.matches) {
      var zone = abWrap.offsetHeight - vh;
      // petit temps d'arrêt sur le noir, puis le blanc monte, puis on garde le blanc
      tt = zone > 0 ? clamp01((-r.top - zone * 0.12) / (zone * 0.7)) : 1;
    } else {
      tt = clamp01((vh * 0.65 - r.top) / (r.height * 0.75));
    }
    abStage.style.setProperty('--t', (REDUCED ? (tt > 0.5 ? 1 : 0) : tt).toFixed(4));
  }

  /* ---------- Contact : la carte grandit ---------- */
  var ouvert = null;
  function setOuvert(on) {
    if (on === ouvert) return;
    ouvert = on;
    ctWrap.classList.toggle('is-open', on);
    if ('inert' in ctInner) ctInner.inert = !on;
  }

  function majContact() {
    if (!ctWrap || !ctCard || !ctInner) return;
    if (!MQ_DESKTOP.matches) {
      ctCard.removeAttribute('style');
      ctInner.removeAttribute('style');
      ctWrap.style.removeProperty('--ct-p');
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
    ctCard.style.left = x + 'px';
    ctCard.style.top = y + 'px';
    ctCard.style.width = (w0 + (W - w0) * e) + 'px';
    ctCard.style.height = (h0 + (H - h0) * e) + 'px';
    ctCard.style.setProperty('--ct-r', (20 * (1 - e)).toFixed(2) + 'px');
    // le contenu reste fixe à l'écran, la carte le dévoile comme une fenêtre
    ctInner.style.left = (-x) + 'px';
    ctInner.style.top = (-y) + 'px';
    ctWrap.style.setProperty('--ct-p', e.toFixed(4));
    setOuvert(e > 0.97);
  }

  if (ctPreview) {
    ctPreview.addEventListener('click', function () {
      var fin = ctWrap.getBoundingClientRect().top + window.scrollY + ctWrap.offsetHeight - window.innerHeight;
      if (window.__lenis && typeof window.__lenis.scrollTo === 'function') window.__lenis.scrollTo(fin, { duration: 1.6 });
      else window.scrollTo({ top: fin, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  }

  var raf = null;
  function maj() { raf = null; majFond(); majContact(); }
  function onScroll() { if (!raf) raf = requestAnimationFrame(maj); }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (MQ_DESKTOP.addEventListener) MQ_DESKTOP.addEventListener('change', onScroll);
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
