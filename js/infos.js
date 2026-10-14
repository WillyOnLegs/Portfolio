/* ==============================================================
   WillyOL — Pages À propos et Contact (voir css/infos.css)
   - Textes FR / EN propres à ces pages
   - Titre : arrive en grand au centre de l'écran puis se pose
   - La fin de la phrase sous le titre change toute seule
   - Texte qui se remplit au scroll (comme les pages projets)
   - Lettres qui roulent au survol des liens
   - Envoi du formulaire (Formspree)
   ============================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = window.traductions || (window.traductions = {});

  function ajout(cle, en, fr) { if (!T[cle]) T[cle] = { en: en, fr: fr }; }
  ajout('pi.base', 'Based in', 'Basé en');
  ajout('pi.base.v', 'France', 'France');
  ajout('pi.statut', 'Status', 'Statut');
  ajout('pi.langues', 'Languages', 'Langues');
  ajout('pi.langues.v', 'French · English', 'Français · Anglais');
  ajout('pi.contact', 'Contact', 'Contact');
  ajout('pi.services', 'Services', 'Ce que je fais');
  ajout('pi.outils', 'Tools', 'Outils');
  ajout('pi.parcours', 'Experience', 'Parcours');
  ajout('pi.s1', 'Motion design 2D', 'Motion design 2D');
  ajout('pi.s2', 'Motion design 3D', 'Motion design 3D');
  ajout('pi.s3', 'Brand identity', 'Identité de marque');
  ajout('pi.s4', 'Art direction', 'Direction artistique');
  ajout('pi.p1', 'Internship · Branding & motion', 'Stage · Branding & motion');
  ajout('pi.p2', 'Bachelor Création & Design', 'Bachelor Création & Design');
  ajout('pi.p2.d', 'In progress', 'En cours');
  ajout('pi.chiffres', 'In numbers', 'En chiffres');
  ajout('pi.appel.label', 'Got a project?', 'Un projet ?');
  ajout('pi.reseaux', 'Socials', 'Réseaux');
  ajout('pi.email', 'Email', 'Email');
  ajout('pi.ecrire', 'Write me.', 'Écrivez-moi.');
  ajout('pi.ab.titre', 'Nathan Colin', 'Nathan Colin');
  ajout('pi.ct.titre', "Let's work<br>together.", 'Travaillons<br>ensemble.');

  function langue() { return window.langueActuelle || (function () { try { return localStorage.getItem('langue'); } catch (_) { return null; } })() || 'en'; }
  function t(cle, defaut) { var e = T[cle]; return (e && e[langue()]) || defaut || ''; }
  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- Titre découpé en lettres ---------- */
  var titre = document.querySelector('.pi-titre');
  function construireTitre() {
    if (!titre) return;
    var html = t(titre.getAttribute('data-pi-cle'), titre.textContent);
    var lignes = html.split(/<br\s*\/?>/i);
    var brut = lignes.join(' ').replace(/<[^>]+>/g, '');
    titre.setAttribute('aria-label', brut);
    titre.innerHTML = '';
    var plusLongue = 0, k = 0;
    lignes.forEach(function (l) {
      var txt = l.replace(/<[^>]+>/g, '').trim();
      plusLongue = Math.max(plusLongue, txt.length);
      var ligne = document.createElement('span');
      ligne.className = 'pi-titre-ligne';
      ligne.setAttribute('aria-hidden', 'true');
      Array.from(txt).forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'ltr';
        s.textContent = ch === ' ' ? ' ' : ch;
        s.style.setProperty('--ad', (0.15 + k++ * 0.035) + 's');
        ligne.appendChild(s);
      });
      titre.appendChild(ligne);
    });
    titre.style.setProperty('--len', Math.max(4, plusLongue));
  }

  /* ---------- Lettres qui roulent ---------- */
  function rouler(el, texte) {
    var r = document.createElement('span');
    r.className = 'pi-roll';
    r.setAttribute('aria-hidden', 'true');
    Array.from(texte).forEach(function (c, i) {
      var l = document.createElement('span');
      l.className = 'pi-l';
      l.style.setProperty('--i', i);
      l.textContent = c;
      r.appendChild(l);
    });
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', texte);
    el.innerHTML = '';
    el.appendChild(r);
  }
  function construireRolls() {
    document.querySelectorAll('[data-pi-roll]').forEach(function (el) {
      var cle = el.getAttribute('data-pi-cle');
      var txt = cle ? t(cle).replace(/<br\s*\/?>/gi, ' ') : (el.getAttribute('data-pi-txt') || el.textContent.trim());
      if (!cle && !el.getAttribute('data-pi-txt')) el.setAttribute('data-pi-txt', txt);
      if (cle) el.setAttribute('aria-label', txt);
      rouler(el, txt);
    });
  }

  /* ---------- Fin de phrase qui change toute seule ---------- */
  function initRoue() {
    var roue = document.querySelector('.pi-roue');
    if (!roue) return;
    // le dernier mot est une copie du premier : la roue tourne toujours
    // dans le même sens, puis revient au début sans que ça se voie
    var mots = roue.children.length, i = 0;
    if (REDUCED || mots < 2) return;
    setInterval(function () {
      i++;
      roue.style.transition = '';
      roue.style.transform = 'translateY(' + (-i * 1.3) + 'em)';
      if (i === mots - 1) {
        setTimeout(function () {
          roue.style.transition = 'none';
          roue.style.transform = 'translateY(0)';
          i = 0;
        }, 900);
      }
    }, 2400);
  }

  /* ---------- Animation d'arrivée ---------- */
  // 1. les lettres montent, le titre est en grand au centre de l'écran
  // 2. il rétrécit et se pose ; 3. la suite de la page apparaît
  function initIntro() {
    if (!titre) return;
    var suite = document.querySelectorAll('[data-pi-suite]');
    requestAnimationFrame(function () { requestAnimationFrame(function () { document.body.classList.add('pi-pret'); }); });
    var haut = window.scrollY || window.pageYOffset;
    if (REDUCED || haut > 10 || typeof titre.animate !== 'function') return;
    var r = titre.getBoundingClientRect();
    if (!r.width) return;
    var echelle = Math.min(1.7, (window.innerWidth * 0.9) / r.width);
    var dy = window.innerHeight / 2 - (r.top + r.height / 2);
    var depart = 'translateY(' + dy.toFixed(1) + 'px) scale(' + echelle.toFixed(3) + ')';
    titre.style.transform = depart;
    suite.forEach(function (el) { el.style.opacity = '0'; });
    setTimeout(function () {
      var a = titre.animate([{ transform: depart }, { transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.76, 0, .24, 1)', fill: 'forwards' });
      a.onfinish = function () { titre.style.transform = ''; a.cancel(); };
    }, 1150);
    setTimeout(function () {
      suite.forEach(function (el, k) {
        el.animate([{ opacity: 0, transform: 'translateY(1.5rem)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: k * 120, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
        el.style.opacity = '';
      });
    }, 1900);
  }

  /* ---------- Portrait : se dévoile de bas en haut ---------- */
  function initPortrait() {
    var fig = document.querySelector('.pi-portrait');
    if (!fig || REDUCED || !('IntersectionObserver' in window) || typeof fig.animate !== 'function') return;
    fig.style.clipPath = 'inset(100% 0 0 0)';
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      var a = fig.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }], { duration: 1400, easing: 'cubic-bezier(.76, 0, .24, 1)', fill: 'forwards' });
      a.onfinish = function () { fig.style.clipPath = ''; a.cancel(); };
      var img = fig.querySelector('img');
      if (img) img.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 1700, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }, { threshold: 0.15 });
    // on observe la ligne entière : le portrait masqué ne compte pas comme visible
    io.observe(fig.parentElement);
  }

  /* ---------- Texte qui se remplit au scroll ---------- */
  function initRemplissage() {
    var blocs = Array.prototype.slice.call(document.querySelectorAll('.pi-texte'));
    if (!blocs.length) return;
    var DOUX = 6;
    var etats = [];
    function decouper(bloc, mo) {
      mo.disconnect();
      var walker = document.createTreeWalker(bloc, NodeFilter.SHOW_TEXT, null);
      var noeuds = [];
      while (walker.nextNode()) noeuds.push(walker.currentNode);
      noeuds.forEach(function (n) {
        if (n.parentNode.classList && n.parentNode.classList.contains('pi-mot')) return;
        var morceaux = n.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        morceaux.forEach(function (m) {
          if (!m) return;
          if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(m)); return; }
          var sp = document.createElement('span');
          sp.className = 'pi-mot';
          sp.textContent = m;
          frag.appendChild(sp);
        });
        n.parentNode.replaceChild(frag, n);
      });
      bloc._mots = Array.prototype.slice.call(bloc.querySelectorAll('.pi-mot'));
      bloc._etats = bloc._mots.map(function () { return -1; });
      mo.observe(bloc, { childList: true, subtree: true });
    }
    blocs.forEach(function (b) {
      var mo = new MutationObserver(function () { decouper(b, mo); maj(); });
      decouper(b, mo);
    });
    function maj() {
      var vh = window.innerHeight || 1;
      blocs.forEach(function (b) {
        var mots = b._mots || [];
        if (REDUCED) { mots.forEach(function (m) { m.style.opacity = '1'; }); return; }
        var r = b.getBoundingClientRect();
        var p = c01((vh * 0.85 - r.top) / (r.height + vh * 0.35));
        var x = p * (mots.length + DOUX);
        for (var i = 0; i < mots.length; i++) {
          var v = Math.round(c01((x - i) / DOUX) * 50) / 50;
          if (v !== b._etats[i]) { b._etats[i] = v; mots[i].style.opacity = (0.2 + 0.8 * v).toFixed(2); }
        }
      });
    }
    var raf = null;
    function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = null; maj(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    maj();
  }

  /* ---------- Formulaire ---------- */
  function initForm() {
    var form = document.querySelector('.pi-form form, form.pi-form');
    if (!form) return;
    var feedback = form.querySelector('[data-pi-feedback]');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('[data-i18n]') : null;
    function setFeedback(msg) { if (feedback) feedback.textContent = msg || ''; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      btn.setAttribute('disabled', '');
      if (label) label.textContent = t('form.feedback.sending', 'Sending…');
      setFeedback('');
      fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('Submit failed');
          setFeedback(t('form.feedback.success', 'Message sent — thanks!'));
          form.reset();
          if (label) label.textContent = t('form.feedback.sent', 'Sent ✓');
          setTimeout(function () { btn.removeAttribute('disabled'); if (label) label.textContent = t('form.submit', 'Send message'); }, 3000);
        })
        .catch(function () {
          setFeedback(t('form.feedback.error', 'Oops, something went wrong. Try again.'));
          btn.removeAttribute('disabled');
          if (label) label.textContent = t('form.submit', 'Send message');
        });
    });
  }

  /* ---------- Nombre de projets ---------- */
  function initChiffres() {
    var n = document.querySelector('[data-pi-nb-projets]');
    if (n && window.PROJETS && window.PROJETS.length) n.textContent = window.PROJETS.length;
  }

  function init() {
    construireTitre();
    construireRolls();
    initChiffres();
    initIntro();
    initRoue();
    initPortrait();
    initRemplissage();
    initForm();
    // FR / EN : le titre et les liens animés sont reconstruits
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.btn-langue')) return;
      setTimeout(function () { construireTitre(); construireRolls(); }, 60);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
