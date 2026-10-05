/* ==============================================================
   Accueil — bento à propos + contact
   - Envoi du formulaire (Formspree)
   - Lettres qui se mélangent au survol de l'e-mail
   ============================================================== */
(function () {
  'use strict';

  function t(key, fallback) {
    var lang = window.langueActuelle || localStorage.getItem('langue') || 'en';
    var d = window.traductions && window.traductions[key];
    return (d && d[lang]) || fallback;
  }

  /* ---------- Formulaire ---------- */
  var form = document.querySelector('.section-bento [data-cc-form]');
  if (form) {
    var feedback = form.querySelector('[data-cc-feedback]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('.bf-submit-label') : null;

    function setFeedback(msg, type) {
      if (!feedback) return;
      feedback.textContent = msg || '';
      feedback.classList.remove('is-error', 'is-success');
      if (type) feedback.classList.add(type);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var url = form.getAttribute('action');
      btn.setAttribute('disabled', '');
      if (label) label.textContent = t('form.feedback.sending', 'Sending…');
      setFeedback('');

      fetch(url, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
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
  var mail = document.querySelector('.bento-email');
  var txt = mail ? mail.querySelector('.bento-email-txt') : null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mail && txt && !reduced) {
    var orig = txt.textContent;
    var pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ@._0123456789';
    var raf = null;
    mail.addEventListener('mouseenter', function () {
      if (raf) cancelAnimationFrame(raf);
      var t0 = performance.now();
      (function go(now) {
        var p = Math.min(1, (now - t0) / 600);
        var rev = Math.floor(p * orig.length);
        txt.textContent = Array.from(orig).map(function (c, i) {
          return i < rev || c === '@' || c === '.' ? c : pool[Math.floor(Math.random() * pool.length)];
        }).join('');
        if (p < 1) raf = requestAnimationFrame(go);
        else txt.textContent = orig;
      })(t0);
    });
  }
})();
