/* ==============================================================
   WillyOL — Pages projets (composition bento)
   --------------------------------------------------------------
   - Construit la page d'un projet à partir de PROJETS (projets-data.js)
   - Composition centrée : grand titre, vidéo principale (toute la
     largeur de la grille), infos + description qui se remplit au
     scroll, puis la grille : blocs "full" et "trio"
   - Fin de page : la carte du projet suivant part du bas à droite et
     grandit jusqu'à remplir la zone de droite, son nom apparaît à gauche.
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
      // chargée seulement à l'approche de l'écran (initVideos) ;
      // l'image d'aperçu s'affiche en attendant
      media = el('video', 'pp-media', {
        muted: true, loop: true, playsinline: true, preload: 'none',
        poster: src.replace(/\.mp4$/i, '.poster.webp'),
        disablepictureinpicture: true, disableremoteplayback: true,
        controlslist: 'nofullscreen nodownload noremoteplayback',
        'aria-label': m.alt || null
      });
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.appendChild(el('source', null, { src: src, type: 'video/mp4' }));
      fig.appendChild(media);

      // Boutons en bas à droite : [son] [pause]
      var ctrls = el('div', 'pp-cell-ctrls');
      if (m.son) {
        fig.classList.add('pp-cell--son', 'is-muted');
        var son = el('button', 'pp-cell-ctrl pp-cell-son', { type: 'button', 'aria-label': t('pp.son.on', 'Activer le son'), 'aria-pressed': 'false', 'data-curseur': true });
        son.innerHTML =
          '<svg class="pp-ico-muet" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
          '<svg class="pp-ico-son" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
        ctrls.appendChild(son);
      }
      var ctrl = el('button', 'pp-cell-ctrl pp-cell-pause', { type: 'button', 'aria-label': 'Pause', 'data-curseur': true });
      ctrl.innerHTML =
        '<svg class="pp-ico-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="3.2" height="14" rx="1"/><rect x="13.8" y="5" width="3.2" height="14" rx="1"/></svg>' +
        '<svg class="pp-ico-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
      ctrls.appendChild(ctrl);
      fig.appendChild(ctrls);
    } else {
      media = el('img', 'pp-media', { src: src, alt: m.alt || '', loading: 'lazy', decoding: 'async' });
      fig.appendChild(media);
    }
    if (m.fit === 'contain') {
      fig.classList.add('pp-cell--contain');
      if (m.pad) media.style.padding = m.pad;
    }
    if (m.pos) media.style.objectPosition = m.pos;
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
    } else if (b.type === 'duo') {
      // 2 contenus côte à côte, même format que les horizontaux du trio
      bloc = el('div', 'pp-bloc pp-bloc--duo');
      (b.medias || []).slice(0, 2).forEach(function (m) {
        bloc.appendChild(buildCell(resolve(m), 'pp-cell--h'));
      });
    } else {
      bloc = el('div', 'pp-bloc pp-bloc--full');
      bloc.appendChild(buildCell(resolve(b.media)));
    }
    // format imposé (ex. '1 / 1', '3508 / 4961') : les cases prennent la
    // proportion de l'image au lieu du format habituel, rien n'est recadré
    if (b.ratio) {
      bloc.classList.add('pp-bloc--ratio');
      bloc.querySelectorAll('.pp-cell').forEach(function (c) { c.style.aspectRatio = b.ratio; });
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

    var shell = opts.into || el('main');
    shell.className = 'proj-page-shell pp';
    shell.setAttribute('data-slug', slug);
    shell.innerHTML = '';

    // Composition centrée :
    // 1. titre (animation d'arrivée : grand au centre, puis se pose)
    // 2. vidéo principale (largeur de la grille), dévoilée de bas en haut
    // 3. infos + description (le texte se remplit au scroll)
    // 4. le reste de la grille
    // 5. projet suivant (la carte reste à droite et grandit)
    var layout = el('div', 'pp-layout');
    shell.appendChild(layout);

    /* ----- 1 et 2. Titre + vidéo principale ----- */
    // Le titre au-dessus de la vidéo (largeur de la grille).
    // À l'arrivée, une animation les met en place (initIntro).
    var intro = el('section', 'pp-intro');
    var stageIntro = el('div', 'pp-intro-stage');
    var h1 = el('h1', 'pp-titre');
    h1.textContent = projet.nom;
    stageIntro.appendChild(h1);
    var heroBloc = null;
    if (sections.length && sections[0].blocs && sections[0].blocs.length) {
      heroBloc = buildBloc(sections[0].blocs[0], resolve);
      heroBloc.classList.add('pp-bloc--hero');
      // la vidéo principale est visible tout de suite : elle se charge en priorité
      var hvid = heroBloc.querySelector('video');
      if (hvid) hvid.preload = 'auto';
      var himg = heroBloc.querySelector('img');
      if (himg) { himg.loading = 'eager'; himg.setAttribute('fetchpriority', 'high'); }
      stageIntro.appendChild(heroBloc);
    }
    intro.appendChild(stageIntro);
    layout.appendChild(intro);

    /* ----- 3 et 4. Infos, description, grille centrée ----- */
    var content = el('div', 'pp-content');
    layout.appendChild(content);

    // Infos + description
    var info = el('div', 'pp-info');
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
    info.appendChild(dl);

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
    info.appendChild(desc);
    content.appendChild(info);

    // Le reste de la grille
    sections.forEach(function (s, i) {
      var blocs = (s.blocs || []).slice(i === 0 && heroBloc ? 1 : 0);
      var sec = el('section', 'pp-section', { id: 'pp-s-' + i, 'data-idx': i });
      var key = 'pp.' + slug + '.s' + i;
      registerI18n(key, s.titre || { en: 'Part ' + (i + 1), fr: 'Partie ' + (i + 1) });
      var st = el('h2', 'pp-section-titre', { 'data-i18n': key });
      st.textContent = t(key);
      sec.appendChild(st);
      blocs.forEach(function (b) { sec.appendChild(buildBloc(b, resolve)); });
      if (blocs.length) content.appendChild(sec);
    });

    /* ----- 5. Projet suivant ----- */
    var hasNext = next && next.slug !== slug;
    if (hasNext) {
      var outro = el('section', 'pp-outro', { 'aria-label': t('projet.suivant', 'Next project') });
      var stage = el('div', 'pp-outro-stage');

      // Nom du projet suivant + liens, à gauche (révélés à la fin)
      var gauche = el('div', 'pp-outro-gauche');
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
      gauche.appendChild(nx);
      stage.appendChild(gauche);

      // La carte : part du bas à droite et grandit
      var card = el('a', 'pp-outro-card', { href: next.href, 'data-curseur': true, 'aria-label': next.nom });
      var cover = rebase(next.cover);
      if (next.coverIsVideo) {
        var v = el('video', 'pp-media', { muted: true, loop: true, playsinline: true, preload: 'none', poster: cover.replace(/\.mp4$/i, '.poster.webp'), 'aria-hidden': 'true' });
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
      layout.appendChild(outro);
    } else {
      layout.appendChild(el('div', 'pp-fin'));
    }

    // Le hero reprend la vidéo là où en était le clone (transition SPA)
    if (opts.videoStartTime > 0) {
      var hv = shell.querySelector('.pp-bloc--hero video');
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
      '<div class="pp-layout"><section class="pp-intro"><div class="pp-intro-stage"><h1 class="pp-titre">x</h1>' +
      '<div class="pp-bloc pp-bloc--full pp-bloc--hero"><figure class="pp-cell"></figure></div>' +
      '</div></section></div>';
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

  /* ---------- Vidéos : lecture dans le champ, pause, son ---------- */
  // Pas de plein écran : les vidéos restent toujours dans leur case.
  // Son coupé par défaut ; une seule vidéo peut avoir le son à la fois.

  function initVideos(root, scroller, cleanups) {
    var cells = root.querySelectorAll('.pp-cell--video, .pp-outro-card');
    if (!cells.length) return;

    registerI18n('pp.son.on', { fr: 'Activer le son', en: 'Turn sound on' });
    registerI18n('pp.son.off', { fr: 'Couper le son', en: 'Mute' });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var cell = e.target;
        var v = cell.querySelector('video');
        if (!v) return;
        if (e.isIntersecting && e.intersectionRatio >= 0.25) {
          if (cell.dataset.userPaused === '1') return;
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!e.isIntersecting || e.intersectionRatio < 0.05) {
          try { v.pause(); } catch (_) {}
        }
      });
    }, { root: scroller.ioRoot, threshold: [0, 0.05, 0.25, 0.6] });

    // préchargement : une vidéo commence à se charger ~1 écran avant d'apparaître
    var pre = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var v = e.target.querySelector('video');
        if (v && v.preload === 'none') v.preload = 'auto';
        pre.unobserve(e.target);
      });
    }, { root: scroller.ioRoot, rootMargin: '100% 0px' });
    cleanups.push(function () { pre.disconnect(); });

    function setSon(cell, on) {
      var v = cell.querySelector('video');
      var btn = cell.querySelector('.pp-cell-son');
      if (!v || !btn) return;
      v.muted = !on;
      cell.classList.toggle('is-muted', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', t(on ? 'pp.son.off' : 'pp.son.on'));
    }

    cells.forEach(function (cell) {
      io.observe(cell);
      pre.observe(cell);
      if (!cell.classList.contains('pp-cell--video')) return;
      var v = cell.querySelector('video');
      var ctrl = cell.querySelector('.pp-cell-pause');
      var son = cell.querySelector('.pp-cell-son');

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

      if (son) {
        son.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var on = v.muted;
          if (on) {
            // une seule vidéo sonore à la fois
            root.querySelectorAll('.pp-cell--son').forEach(function (c) { if (c !== cell) setSon(c, false); });
          }
          setSon(cell, on);
          if (on && v.paused) {
            cell.dataset.userPaused = '0';
            cell.classList.remove('is-paused');
            if (ctrl) ctrl.setAttribute('aria-label', 'Pause');
            v.play().catch(function () {});
          }
        });
      }
    });

    cleanups.push(function () {
      io.disconnect();
      root.querySelectorAll('video').forEach(function (v) { try { v.muted = true; v.pause(); } catch (_) {} });
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

  /* ---------- Haut de page : animation d'ouverture ---------- */
  // Joue tout seul à l'arrivée sur la page (pas au scroll) :
  // 1. le titre apparaît en très grand au centre de l'écran (lettres qui montent)
  // 2. il rétrécit et monte se poser à sa place, au-dessus de la vidéo
  // 3. la vidéo, déjà à sa place, se dévoile de bas en haut (léger recul de l'image)
  // 4. le reste de la page apparaît en fondu
  // Pas d'animation si on arrive par le zoom depuis l'accueil, si la page
  // est déjà scrollée, ou avec « réduire les animations ».

  var COURBE = 'cubic-bezier(.76, 0, .24, 1)';

  function initIntro(root, scroller, cleanups, opts) {
    var titre = root.querySelector('.pp-titre');
    var cell = root.querySelector('.pp-intro .pp-bloc--hero .pp-cell');
    if (!titre || !cell || REDUCED || (opts && opts.spa)) return;
    if (typeof titre.animate !== 'function') return;
    var haut = scroller.injected ? root.scrollTop : (window.scrollY || window.pageYOffset);
    if (haut > 10) return;

    var vh = scroller.injected ? root.clientHeight : window.innerHeight;
    var r = titre.getBoundingClientRect();
    if (!r.width) return;
    var echelle = Math.min(1.8, (window.innerWidth * 0.9) / r.width);
    var dy = vh / 2 - (r.top + r.height / 2);
    var depart = 'translateY(' + dy.toFixed(1) + 'px) scale(' + echelle.toFixed(3) + ')';
    var rayon = parseFloat(getComputedStyle(cell).borderTopLeftRadius) || 0;
    var cache = 'inset(100% 0% 0% 0% round ' + rayon + 'px)';
    var visible = 'inset(0% 0% 0% 0% round ' + rayon + 'px)';
    var media = cell.querySelector('.pp-media');

    // le reste de la page (infos, description, grille) arrive après la vidéo
    var suite = root.querySelector('.pp-content');

    // état de départ, avant le premier affichage
    titre.style.transform = depart;
    cell.style.clipPath = cache;
    if (suite) suite.style.opacity = '0';

    var anims = [];
    var minuteurs = [];
    // 2. le titre se pose (après l'arrivée des lettres)
    minuteurs.push(setTimeout(function () {
      var a = titre.animate([{ transform: depart }, { transform: 'none' }], { duration: 1300, easing: COURBE, fill: 'forwards' });
      a.onfinish = function () { titre.style.transform = ''; a.cancel(); };
      anims.push(a);
    }, 1050));
    // 3. la vidéo se dévoile de bas en haut
    minuteurs.push(setTimeout(function () {
      var a = cell.animate([{ clipPath: cache }, { clipPath: visible }], { duration: 1400, easing: COURBE, fill: 'forwards' });
      a.onfinish = function () { cell.style.clipPath = ''; a.cancel(); };
      anims.push(a);
      if (media) anims.push(media.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 1700, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
    }, 1250));
    // 4. la suite de la page apparaît en fondu
    minuteurs.push(setTimeout(function () {
      if (!suite) return;
      var a = suite.animate([{ opacity: 0, transform: 'translateY(1.5rem)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      suite.style.opacity = '';
      anims.push(a);
    }, 2100));

    cleanups.push(function () {
      minuteurs.forEach(clearTimeout);
      anims.forEach(function (a) { try { a.cancel(); } catch (_) {} });
      titre.style.transform = '';
      cell.style.clipPath = '';
      if (suite) suite.style.opacity = '';
    });
  }

  /* ---------- Description : le texte se remplit au scroll ---------- */
  // Chaque mot part en gris clair et passe à la couleur pleine, dans
  // l'ordre de lecture, à mesure que le texte monte dans l'écran.
  // En remontant, les mots repassent en gris.

  function initDescFill(root, scroller, cleanups) {
    var desc = root.querySelector('.pp-desc');
    if (!desc) return;
    var mots = [];
    var etats = [];
    var DOUX = 6;           // nombre de mots sur lesquels se fait le dégradé

    function decouper() {
      mo.disconnect();
      var walker = document.createTreeWalker(desc, NodeFilter.SHOW_TEXT, null);
      var noeuds = [];
      while (walker.nextNode()) noeuds.push(walker.currentNode);
      noeuds.forEach(function (n) {
        if (n.parentNode && n.parentNode.classList && n.parentNode.classList.contains('pp-mot')) return;
        var morceaux = n.textContent.split(/(\s+)/);
        if (morceaux.length < 2 && !morceaux[0].trim()) return;
        var frag = document.createDocumentFragment();
        morceaux.forEach(function (m) {
          if (!m) return;
          if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(m)); return; }
          var sp = document.createElement('span');
          sp.className = 'pp-mot';
          sp.textContent = m;
          frag.appendChild(sp);
        });
        n.parentNode.replaceChild(frag, n);
      });
      mots = Array.prototype.slice.call(desc.querySelectorAll('.pp-mot'));
      etats = mots.map(function () { return -1; });
      mo.observe(desc, { childList: true, subtree: true });
      maj();
    }

    function maj() {
      if (!mots.length) return;
      if (REDUCED) {
        mots.forEach(function (m) { m.style.opacity = ''; m.classList.add('is-plein'); });
        return;
      }
      var vh = window.innerHeight || 1;
      var r = desc.getBoundingClientRect();
      // commence quand le haut du texte est à 85 % de l'écran,
      // finit quand le bas du texte arrive vers 50 %
      var p = clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      var x = p * (mots.length + DOUX);
      for (var i = 0; i < mots.length; i++) {
        var v = Math.round(clamp01((x - i) / DOUX) * 50) / 50;
        if (v !== etats[i]) {
          etats[i] = v;
          mots[i].style.opacity = (0.2 + 0.8 * v).toFixed(2);
        }
      }
    }

    var raf = null;
    function onScroll() { if (!raf) raf = requestAnimationFrame(function () { raf = null; maj(); }); }
    // le texte change quand on passe en FR / EN : on redécoupe
    var mo = new MutationObserver(function () { decouper(); });
    decouper();
    scroller.target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    cleanups.push(function () {
      mo.disconnect();
      scroller.target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });
  }

  function initOutro(root, scroller, cleanups) {
    var outro = root.querySelector('.pp-outro');
    var stage = root.querySelector('.pp-outro-stage');
    var card = root.querySelector('.pp-outro-card');
    var nextBlock = root.querySelector('.pp-side-next');
    if (!outro || !stage || !card) return;
    var inner = outro;

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
      var padL = parseFloat(cs.paddingLeft) || 0;
      var padR = parseFloat(cs.paddingRight) || 0;
      var W = stage.clientWidth - padL - padR;
      var H = stage.clientHeight - padT - padB;

      var e = REDUCED ? (p > 0.5 ? 1 : 0) : easeInOutCubic(p);
      var w0 = Math.min(W * 0.36, 520);
      var h0 = w0 * 9 / 16;
      var x0 = W - w0;
      var y0 = H - h0;

      card.style.left = (padL + x0 * (1 - e)) + 'px';
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
    initIntro(root, scroller, cleanups, opts);
    initDescFill(root, scroller, cleanups);
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
