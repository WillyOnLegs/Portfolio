/* ==============================================================
   WillyOL — Pages projets (composition bento)
   --------------------------------------------------------------
   - Construit la page d'un projet à partir de PROJETS (projets-data.js)
   - Colonne gauche collante : titre, infos, description, sections
   - Colonne droite : blocs "full" et "trio" (1 vertical + 2 horizontaux)
   - Fin de page : la carte du projet suivant grandit jusqu'à
     remplir la colonne, la colonne gauche bascule sur son nom.
   - Fonctionne en chargement direct (pages/projets/*.html)
     ET en injection SPA (projet-zoom.js, depuis l'accueil / la liste)
   ============================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var MQ_DESKTOP = window.matchMedia('(min-width: 901px)');

  /* ---------- Petits utilitaires ---------- */

  function lang() {
    return window.langueActuelle || localStorage.getItem('langue') || 'en';
  }

  function t(key, fallback) {
    var d = window.traductions && window.traductions[key];
    return (d && d[lang()]) || fallback || '';
  }

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] === false || attrs[k] == null) return;
        n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
      });
    }
    return n;
  }

  // '../../medias/x' ou '../medias/x' -> '/medias/x'
  function rebase(p) {
    if (!p) return p;
    if (/^(https?:|data:|blob:|\/)/i.test(p)) return p;
    return p.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  // Enregistre une traduction dynamique pour que le bouton FR/EN la mette à jour
  function registerI18n(key, value) {
    if (!window.traductions) return;
    window.traductions[key] = value;
  }

  /* ---------- Médias ---------- */

  // Résout un placeholder { ph:'h'|'v' } en image du site (même tirage à chaque visite)
  function makeResolver(slug) {
    var pools = window.PROJETS_PLACEHOLDERS || { h: [], v: [] };
    var used = {};
    var cursor = {
      h: hash(slug) % Math.max(1, pools.h.length),
      v: hash(slug + 'v') % Math.max(1, pools.v.length)
    };
    return function resolve(m) {
      if (!m) return null;
      if (m.src) { used[m.src] = true; return m; }
      var kind = m.ph === 'v' ? 'v' : 'h';
      var pool = pools[kind] || [];
      if (!pool.length) return null;
      var src = pool[cursor[kind] % pool.length];
      for (var i = 0; i < pool.length && used[src]; i++) {
        cursor[kind]++;
        src = pool[cursor[kind] % pool.length];
      }
      cursor[kind]++;
      used[src] = true;
      return { src: src, alt: '', placeholder: true };
    };
  }

  function buildCell(m, extraCls) {
    var fig = el('figure', 'pp-cell' + (extraCls ? ' ' + extraCls : ''));
    if (!m) { fig.classList.add('pp-cell--vide'); return fig; }
    if (m.placeholder) fig.setAttribute('data-placeholder', '');
    if (m.bg) fig.style.background = m.bg;

    var src = rebase(m.src);
    var media;
    if (m.video) {
      fig.classList.add('pp-cell--video');
      fig.setAttribute('data-curseur', '');
      media = el('video', 'pp-media', { muted: true, loop: true, playsinline: true, preload: 'metadata', 'aria-label': m.alt || null });
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.appendChild(el('source', null, { src: src, type: 'video/mp4' }));
      fig.appendChild(media);
      var ctrl = el('button', 'pp-cell-ctrl', { type: 'button', 'aria-label': 'Pause', 'data-curseur': true });
      ctrl.innerHTML =
        '<svg class="pp-ico-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="3.2" height="14" rx="1"/><rect x="13.8" y="5" width="3.2" height="14" rx="1"/></svg>' +
        '<svg class="pp-ico-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
      fig.appendChild(ctrl);
    } else {
      media = el('img', 'pp-media', { src: src, alt: m.alt || '', loading: 'lazy', decoding: 'async' });
      fig.appendChild(media);
    }
    if (m.fit === 'contain') {
      fig.classList.add('pp-cell--contain');
      if (m.pad) media.style.padding = m.pad;
    }
    return fig;
  }

  function buildBloc(b, resolve) {
    var bloc;
    if (b.type === 'trio') {
      bloc = el('div', 'pp-bloc pp-bloc--trio pp-bloc--v-' + (b.side === 'left' ? 'left' : 'right'));
      bloc.appendChild(buildCell(resolve(b.vertical), 'pp-cell--v'));
      (b.horizontals || []).slice(0, 2).forEach(function (h) {
        bloc.appendChild(buildCell(resolve(h), 'pp-cell--h'));
      });
    } else {
      bloc = el('div', 'pp-bloc pp-bloc--full');
      bloc.appendChild(buildCell(resolve(b.media)));
    }
    return bloc;
  }

  /* ---------- Construction de la page ---------- */

  function translateCredit(val) {
    if (val === 'Projet personnel' || val === 'Personal project') return { key: 'proj.credits.perso', txt: t('proj.credits.perso', val) };
    if (val === "Projet d'étude" || val === 'Student project') return { key: 'proj.credits.etude', txt: t('proj.credits.etude', val) };
    return { key: null, txt: val };
  }

  function nextProjet(projet) {
    var list = window.PROJETS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === projet.slug) return list[(i + 1) % list.length];
    }
    return list[0] || null;
  }

  function buildTagline(node, projet, i18nKey) {
    if (window.traductions && window.traductions[i18nKey]) {
      node.setAttribute('data-i18n', i18nKey);
      node.innerHTML = window.traductions[i18nKey][lang()];
      return;
    }
    node.textContent = projet.tagline || '';
  }

  function buildPage(projet, opts) {
    opts = opts || {};
    var slug = projet.slug;
    var sections = projet.sections || [];
    var resolve = makeResolver(slug);
    var next = nextProjet(projet);

    registerI18n('pp.more', { fr: 'Lire la suite', en: 'Read more' });
    registerI18n('pp.less', { fr: 'Réduire', en: 'Show less' });
    registerI18n('pp.sections', { fr: 'Sections du projet', en: 'Project sections' });

    var shell = opts.into || el('main');
    shell.className = 'proj-page-shell pp';
    shell.setAttribute('data-slug', slug);
    shell.innerHTML = '';

    var layout = el('div', 'pp-layout');
    shell.appendChild(layout);

    /* ----- Colonne gauche ----- */
    var side = el('aside', 'pp-side');
    var inner = el('div', 'pp-side-inner');
    side.appendChild(inner);

    var main = el('div', 'pp-side-main');
    inner.appendChild(main);

    var head = el('header', 'pp-head');
    var h1 = el('h1', 'pp-titre');
    h1.textContent = projet.nom;
    head.appendChild(h1);
    main.appendChild(head);

    var cr = projet.credits || {};
    var dl = el('dl', 'pp-credits');
    [
      ['proj.credits.client', 'Client', cr.client],
      ['proj.credits.year', 'Year', cr.year],
      ['proj.credits.type', 'Type', cr.type],
      ['proj.credits.tools', 'Tools', cr.tools]
    ].forEach(function (r) {
      if (!r[2]) return;
      var row = el('div');
      var dt = el('dt', null, { 'data-i18n': r[0] });
      dt.textContent = t(r[0], r[1]);
      var tr = translateCredit(r[2]);
      var dd = el('dd', null, { 'data-i18n': tr.key });
      dd.textContent = tr.txt;
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });
    main.appendChild(dl);

    var descWrap = el('div', 'pp-desc-wrap');
    var desc = el('div', 'pp-desc');
    var descKey = 'proj.' + slug + '.intro';
    if (window.traductions && window.traductions[descKey]) {
      desc.setAttribute('data-i18n', descKey);
      desc.innerHTML = window.traductions[descKey][lang()];
    } else {
      var p = el('p');
      p.textContent = projet.description || '';
      desc.appendChild(p);
    }
    descWrap.appendChild(desc);
    main.appendChild(descWrap);

    var toggle = el('button', 'pp-desc-toggle', { type: 'button', 'data-i18n': 'pp.more', 'aria-expanded': 'false', 'data-curseur': true, hidden: true });
    toggle.textContent = t('pp.more', 'Read more');
    main.appendChild(toggle);

    if (sections.length) {
      var nav = el('div', 'pp-secnav', { role: 'navigation', 'aria-label': t('pp.sections', 'Project sections') });
      sections.forEach(function (s, i) {
        var key = 'pp.' + slug + '.s' + i;
        registerI18n(key, s.titre || { en: 'Part ' + (i + 1), fr: 'Partie ' + (i + 1) });
        var item = el('button', 'pp-secnav-item', { type: 'button', 'data-idx': i, 'data-curseur': true });
        var tt = el('span', 'pp-secnav-titre', { 'data-i18n': key });
        tt.textContent = t(key);
        var num = el('span', 'pp-secnav-num', { 'aria-hidden': 'true' });
        num.textContent = String(i + 1).padStart(2, '0');
        item.appendChild(tt);
        item.appendChild(num);
        nav.appendChild(item);
      });
      main.appendChild(nav);
    }

    // Bloc « projet suivant », révélé à la fin de la page
    var hasNext = next && next.slug !== slug;
    if (hasNext) {
      var nx = el('div', 'pp-side-next', { 'aria-hidden': 'true' });
      var nxLabel = el('p', 'pp-next-label', { 'data-i18n': 'projet.suivant' });
      nxLabel.textContent = t('projet.suivant', 'Next project');
      var nxName = el('a', 'pp-next-nom', { href: next.href, 'data-curseur': true, tabindex: '-1' });
      nxName.textContent = next.nom;
      nxName.style.setProperty('--len', Math.max(4, next.nom.length));
      var nxLinks = el('div', 'pp-next-liens');
      var all = el('a', 'pp-next-lien', { href: '/pages/projets.html' /* CLEAN-URL: '/work' */, 'data-curseur': true, tabindex: '-1' });
      var allTxt = el('span', null, { 'data-i18n': 'home.viewall' });
      allTxt.textContent = t('home.viewall', 'View all work');
      all.appendChild(allTxt);
      var contact = el('a', 'pp-next-lien', { href: '/pages/contact.html' /* CLEAN-URL: '/contact' */, 'data-curseur': true, tabindex: '-1' });
      var ctTxt = el('span', null, { 'data-i18n': 'nav.contact' });
      ctTxt.textContent = t('nav.contact', 'Contact');
      contact.appendChild(ctTxt);
      nxLinks.appendChild(all);
      nxLinks.appendChild(contact);
      nx.appendChild(nxLabel);
      nx.appendChild(nxName);
      nx.appendChild(nxLinks);
      inner.appendChild(nx);
    }

    layout.appendChild(side);

    /* ----- Colonne droite ----- */
    var content = el('div', 'pp-content');
    var first = true;
    sections.forEach(function (s, i) {
      var sec = el('section', 'pp-section', { id: 'pp-s-' + i, 'data-idx': i });
      var st = el('h2', 'pp-section-titre', { 'data-i18n': 'pp.' + slug + '.s' + i });
      st.textContent = t('pp.' + slug + '.s' + i);
      sec.appendChild(st);
      (s.blocs || []).forEach(function (b) {
        var bloc = buildBloc(b, resolve);
        if (first) {
          bloc.classList.add('pp-bloc--hero');
          first = false;
        }
        sec.appendChild(bloc);
      });
      content.appendChild(sec);
    });

    if (hasNext) {
      var outro = el('section', 'pp-outro', { 'aria-label': t('projet.suivant', 'Next project') });
      var stage = el('div', 'pp-outro-stage');
      var card = el('a', 'pp-outro-card', { href: next.href, 'data-curseur': true, 'aria-label': next.nom });
      var cover = rebase(next.cover);
      if (next.coverIsVideo) {
        var v = el('video', 'pp-media', { muted: true, loop: true, playsinline: true, preload: 'metadata', 'aria-hidden': 'true' });
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.appendChild(el('source', null, { src: cover, type: 'video/mp4' }));
        card.appendChild(v);
      } else {
        card.appendChild(el('img', 'pp-media', { src: cover, alt: '', loading: 'lazy' }));
      }
      var cap = el('span', 'pp-outro-cap');
      var capLabel = el('span', 'pp-outro-cap-label', { 'data-i18n': 'projet.suivant' });
      capLabel.textContent = t('projet.suivant', 'Next project');
      var capNom = el('span', 'pp-outro-cap-nom');
      capNom.textContent = next.nom;
      cap.appendChild(capLabel);
      cap.appendChild(capNom);
      card.appendChild(cap);
      var cta = el('span', 'pp-outro-cta', { 'aria-hidden': 'true' });
      var ctaTxt = el('span', null, { 'data-i18n': 'projet.next.cta' });
      ctaTxt.textContent = t('projet.next.cta', 'View project');
      cta.appendChild(ctaTxt);
      cta.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M4 12 12 4M5.5 4H12v6.5"/></svg>');
      card.appendChild(cta);
      stage.appendChild(card);
      outro.appendChild(stage);
      content.appendChild(outro);
    } else {
      content.appendChild(el('div', 'pp-fin'));
    }

    layout.appendChild(content);

    // Le hero reprend la vidéo là où en était le clone (transition SPA)
    if (opts.videoStartTime > 0) {
      var hv = content.querySelector('.pp-bloc--hero video');
      if (hv) {
        hv.addEventListener('loadedmetadata', function () {
          try { hv.currentTime = opts.videoStartTime; } catch (_) {}
        }, { once: true });
      }
    }

    var theme = projet.theme || { bg: '#0a0a0a', texte: '#ffffff', accent: '#ffffff' };
    return { shell: shell, theme: theme };
  }

  /* ---------- Mesure du hero (cible de l'animation de zoom SPA) ---------- */

  function measureHeroRect() {
    var probe = el('main', 'proj-page-shell pp pp--probe', { 'aria-hidden': 'true' });
    probe.innerHTML =
      '<div class="pp-layout"><aside class="pp-side"><div class="pp-side-inner"></div></aside>' +
      '<div class="pp-content"><section class="pp-section"><h2 class="pp-section-titre">x</h2>' +
      '<div class="pp-bloc pp-bloc--full pp-bloc--hero"><figure class="pp-cell"></figure></div>' +
      '</section></div></div>';
    document.body.appendChild(probe);
    var fig = probe.querySelector('.pp-cell');
    var r = fig.getBoundingClientRect();
    var radius = parseFloat(getComputedStyle(fig).borderTopLeftRadius) || 0;
    document.body.removeChild(probe);
    return { top: r.top, left: r.left, width: r.width, height: r.height, radius: radius };
  }

  /* ---------- Défilement (fenêtre ou shell injecté) ---------- */

  function makeScroller(root) {
    var injected = root.classList.contains('proj-page-shell--injected');
    var lenis = null;

    if (injected) {
      // Le Lenis global de la page d'origine ignore ce conteneur
      root.setAttribute('data-lenis-prevent', '');
      if (FINE_POINTER && typeof window.Lenis === 'function' && !REDUCED) {
        try {
          lenis = new window.Lenis({
            wrapper: root,
            content: root.firstElementChild,
            lerp: 0.12,
            smoothWheel: true,
            autoRaf: true
          });
        } catch (_) { lenis = null; }
      }
    }

    function currentLenis() {
      return injected ? lenis : window.__lenis;
    }

    return {
      injected: injected,
      target: injected ? root : window,
      ioRoot: injected ? root : null,
      scrollToEl: function (node, offset) {
        var l = currentLenis();
        if (l && typeof l.scrollTo === 'function') {
          l.scrollTo(node, { offset: -offset, duration: 1.2 });
          return;
        }
        var y = node.getBoundingClientRect().top - offset;
        (injected ? root : window).scrollBy({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
      },
      destroy: function () {
        if (lenis) { try { lenis.destroy(); } catch (_) {} lenis = null; }
      }
    };
  }

  /* ---------- Titre : lettres qui montent ---------- */

  function splitTitle(root) {
    var h = root.querySelector('.pp-titre');
    if (!h || h.dataset.split === '1') return;
    h.dataset.split = '1';
    var txt = h.textContent;
    h.setAttribute('aria-label', txt);
    h.style.setProperty('--len', Math.max(4, txt.length));
    h.innerHTML = '';
    var wrap = el('span', 'pp-titre-ligne', { 'aria-hidden': 'true' });
    Array.from(txt).forEach(function (ch, i) {
      var s = el('span', 'ltr');
      s.textContent = ch === ' ' ? '\u00A0' : ch;
      s.style.setProperty('--ad', (0.15 + i * 0.04) + 's');
      wrap.appendChild(s);
    });
    h.appendChild(wrap);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add('pp-ready'); });
    });
  }

  /* ---------- Vidéos : lecture dans le champ, pause, plein écran ---------- */

  function initVideos(root, scroller, cleanups) {
    var cells = root.querySelectorAll('.pp-cell--video, .pp-outro-card');
    if (!cells.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var cell = e.target;
        var v = cell.querySelector('video');
        if (!v) return;
        if (e.isIntersecting && e.intersectionRatio >= 0.25) {
          if (cell.dataset.userPaused === '1') return;
          if (!document.fullscreenElement) v.muted = true;
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!e.isIntersecting || e.intersectionRatio < 0.05) {
          try { v.pause(); } catch (_) {}
        }
      });
    }, { root: scroller.ioRoot, threshold: [0, 0.05, 0.25, 0.6] });

    cells.forEach(function (cell) {
      io.observe(cell);
      if (!cell.classList.contains('pp-cell--video')) return;
      var v = cell.querySelector('video');
      var ctrl = cell.querySelector('.pp-cell-ctrl');

      if (ctrl) {
        ctrl.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (v.paused) {
            cell.dataset.userPaused = '0';
            v.play().catch(function () {});
            cell.classList.remove('is-paused');
            ctrl.setAttribute('aria-label', 'Pause');
          } else {
            cell.dataset.userPaused = '1';
            v.pause();
            cell.classList.add('is-paused');
            ctrl.setAttribute('aria-label', 'Play');
          }
        });
      }

      // Clic sur la vidéo : plein écran avec le son (selon la préférence son du site)
      cell.addEventListener('click', function (e) {
        if (e.target.closest('.pp-cell-ctrl')) return;
        var req = v.requestFullscreen || v.webkitRequestFullscreen || v.webkitEnterFullscreen;
        if (!req) return;
        var sonOff = (typeof sonActuel !== 'undefined' && sonActuel === 'off');
        try { v.currentTime = 0; } catch (_) {}
        v.muted = sonOff;
        v.setAttribute('controls', '');
        var res = req.call(v);
        v.play().catch(function () {});
        if (res && res.catch) res.catch(function () { v.muted = true; v.removeAttribute('controls'); });
      });
    });

    function onFsChange() {
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      root.querySelectorAll('.pp-cell--video video').forEach(function (v) {
        v.removeAttribute('controls');
        v.muted = true;
        v.loop = true;
      });
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);

    cleanups.push(function () {
      io.disconnect();
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      root.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (_) {} });
    });
  }

  /* ---------- Apparition douce des médias ---------- */

  function initReveal(root, scroller, cleanups) {
    var cells = root.querySelectorAll('.pp-cell');
    if (REDUCED || !('IntersectionObserver' in window)) {
      cells.forEach(function (c) { c.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { root: scroller.ioRoot, rootMargin: '0px 0px -6% 0px', threshold: 0.02 });
    cells.forEach(function (c) {
      if (c.closest('.pp-bloc--hero')) { c.classList.add('is-in'); return; }
      io.observe(c);
    });
    cleanups.push(function () { io.disconnect(); });
  }

  /* ---------- Description : « Lire la suite » si elle déborde ---------- */

  function initDesc(root, cleanups) {
    var wrap = root.querySelector('.pp-desc-wrap');
    var desc = root.querySelector('.pp-desc');
    var btn = root.querySelector('.pp-desc-toggle');
    var inner = root.querySelector('.pp-side-inner');
    if (!wrap || !desc || !btn || !inner) return;

    function check() {
      if (inner.classList.contains('is-desc-open')) return;
      var over = MQ_DESKTOP.matches && desc.scrollHeight > wrap.clientHeight + 2;
      wrap.classList.toggle('is-clamped', over);
      btn.hidden = !over;
    }

    btn.addEventListener('click', function () {
      var open = !inner.classList.contains('is-desc-open');
      inner.classList.toggle('is-desc-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('data-i18n', open ? 'pp.less' : 'pp.more');
      btn.textContent = t(open ? 'pp.less' : 'pp.more');
      if (open) {
        wrap.classList.remove('is-clamped');
        wrap.setAttribute('data-lenis-prevent', '');
      } else {
        wrap.removeAttribute('data-lenis-prevent');
        wrap.scrollTop = 0;
        requestAnimationFrame(check);
      }
    });

    var ro = ('ResizeObserver' in window) ? new ResizeObserver(check) : null;
    if (ro) { ro.observe(wrap); ro.observe(desc); }
    window.addEventListener('resize', check);
    check();
    var tm = setTimeout(check, 400);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(check);
    cleanups.push(function () {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', check);
      clearTimeout(tm);
    });
  }

  /* ---------- Sections : titre actif + clic ---------- */

  function initSecNav(root, scroller, cleanups) {
    var items = Array.prototype.slice.call(root.querySelectorAll('.pp-secnav-item'));
    var secs = Array.prototype.slice.call(root.querySelectorAll('.pp-section'));
    var outro = root.querySelector('.pp-outro');
    if (!items.length || !secs.length) return;
    var actif = -1;
    var timer = null;

    function topOffset() {
      var c = root.querySelector('.pp-content');
      return c ? parseFloat(getComputedStyle(c).paddingTop) || 0 : 0;
    }

    // Même logique que la page Projets : l'ancien s'efface, puis le nouveau s'allume
    function activer(idx) {
      if (idx === actif) return;
      actif = idx;
      items.forEach(function (it) {
        it.style.transition = it.classList.contains('actif') ? 'opacity 0.3s ease' : 'none';
        it.classList.remove('actif');
        it.removeAttribute('aria-current');
      });
      clearTimeout(timer);
      timer = setTimeout(function () {
        items.forEach(function (it) { it.style.transition = ''; });
        if (items[idx]) {
          items[idx].classList.add('actif');
          items[idx].setAttribute('aria-current', 'true');
        }
      }, 300);
    }

    function update() {
      var ligne = window.innerHeight * 0.45;
      var idx = 0;
      secs.forEach(function (s, i) {
        if (s.getBoundingClientRect().top <= ligne) idx = i;
      });
      activer(idx);
    }

    items.forEach(function (it, i) {
      it.addEventListener('click', function () {
        if (secs[i]) scroller.scrollToEl(secs[i], topOffset());
      });
    });

    var raf = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; update(); });
    }
    scroller.target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    cleanups.push(function () {
      scroller.target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(timer);
    });
  }

  /* ---------- Fin de page : la carte du projet suivant grandit ---------- */

  function initOutro(root, scroller, cleanups) {
    var outro = root.querySelector('.pp-outro');
    var stage = root.querySelector('.pp-outro-stage');
    var card = root.querySelector('.pp-outro-card');
    var inner = root.querySelector('.pp-side-inner');
    var nextBlock = root.querySelector('.pp-side-next');
    if (!outro || !stage || !card) return;

    var lastP = -1;

    function setNextFocusable(on) {
      if (!nextBlock) return;
      nextBlock.setAttribute('aria-hidden', on ? 'false' : 'true');
      nextBlock.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    }

    function apply(p) {
      if (!MQ_DESKTOP.matches) {
        card.removeAttribute('style');
        card.classList.remove('is-full');
        root.style.removeProperty('--pp-outro');
        if (inner) inner.classList.remove('is-outro');
        setNextFocusable(false);
        return;
      }
      var cs = getComputedStyle(stage);
      var padT = parseFloat(cs.paddingTop) || 0;
      var padB = parseFloat(cs.paddingBottom) || 0;
      var W = stage.clientWidth;
      var H = stage.clientHeight - padT - padB;

      var e = REDUCED ? (p > 0.5 ? 1 : 0) : easeInOutCubic(p);
      var w0 = Math.min(W * 0.36, 520);
      var h0 = w0 * 9 / 16;
      var x0 = W - w0;
      var y0 = H - h0;

      card.style.left = (x0 * (1 - e)) + 'px';
      card.style.top = (padT + y0 * (1 - e)) + 'px';
      card.style.width = (w0 + (W - w0) * e) + 'px';
      card.style.height = (h0 + (H - h0) * e) + 'px';
      root.style.setProperty('--pp-outro', e.toFixed(4));
      card.classList.toggle('is-full', e > 0.92);

      var on = e > 0.5;
      if (inner) inner.classList.toggle('is-outro', on);
      setNextFocusable(on);
    }

    function update() {
      var r = outro.getBoundingClientRect();
      var range = outro.offsetHeight - window.innerHeight;
      var p = range > 0 ? clamp01(-r.top / range) : 0;
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;
      apply(p);
    }

    var raf = null;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = null; update(); });
    }
    function onResize() { lastP = -1; onScroll(); }

    scroller.target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (MQ_DESKTOP.addEventListener) MQ_DESKTOP.addEventListener('change', onResize);
    update();
    cleanups.push(function () {
      scroller.target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (MQ_DESKTOP.removeEventListener) MQ_DESKTOP.removeEventListener('change', onResize);
    });
  }

  /* ---------- Barre de progression (shell injecté) ---------- */

  function initProgressBar(root, scroller, cleanups) {
    if (!scroller.injected) return;
    var barre = document.getElementById('scroll-progress');
    if (!barre) return;
    var raf = null;
    function update() {
      raf = null;
      var max = root.scrollHeight - root.clientHeight;
      barre.style.setProperty('--progress', max > 0 ? root.scrollTop / max : 0);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
    root.addEventListener('scroll', onScroll, { passive: true });
    update();
    cleanups.push(function () { root.removeEventListener('scroll', onScroll); });
  }

  /* ---------- Point d'entrée ---------- */

  function initProjetSingle(root, opts) {
    opts = opts || {};
    if (!root || root === document) root = document.querySelector('.pp');
    if (!root || root._ppInit) return;
    root._ppInit = true;

    var cleanups = [];
    var scroller = makeScroller(root);
    cleanups.push(scroller.destroy);

    splitTitle(root);
    initReveal(root, scroller, cleanups);
    initVideos(root, scroller, cleanups);
    initDesc(root, cleanups);
    initSecNav(root, scroller, cleanups);
    initOutro(root, scroller, cleanups);
    initProgressBar(root, scroller, cleanups);

    root._ppDestroy = function () {
      cleanups.forEach(function (fn) { try { fn(); } catch (_) {} });
      cleanups = [];
    };
  }

  window.ppBuildPage = buildPage;
  window.ppMeasureHeroRect = measureHeroRect;
  window.initProjetSingle = initProjetSingle;

  /* ---------- Chargement direct d'une page projet ---------- */

  function boot() {
    if (!document.body.classList.contains('page-projet-single')) return;
    var main = document.querySelector('main.pp[data-slug]');
    if (!main || main.dataset.spa === '1') return;
    var projet = typeof window.getProjetBySlug === 'function' ? window.getProjetBySlug(main.dataset.slug) : null;
    if (!projet) {
      console.warn('[projet] Aucune donnée pour « ' + main.dataset.slug + ' » dans projets-data.js');
      return;
    }
    var built = buildPage(projet, { into: main });
    var th = built.theme;
    document.body.style.setProperty('--projet-bg', th.bg);
    document.body.style.setProperty('--projet-texte', th.texte);
    document.body.style.setProperty('--projet-accent', th.accent);
    document.title = 'Willyol - ' + projet.nom;
    initProjetSingle(main, { spa: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
