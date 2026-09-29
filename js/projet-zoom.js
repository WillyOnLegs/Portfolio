(function() {
  'use strict';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.documentElement.classList.remove('projet-zoom-out');
  document.querySelectorAll('.projet-zoom-clone, .projet-zoom-bg').forEach(function(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
  var ZOOM_IN_DUR_MIN = 850;
  var ZOOM_IN_DUR_MAX = 1150;
  var ZOOM_OUT_DUR_MIN = 900;
  var ZOOM_OUT_DUR_MAX = 1200;
  var FADE_DUR = 240;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }
  var SS_KEY_RETURN = 'wol-zoom-return';

  function saveOrigin(url, scrollY) {
    try {
      sessionStorage.setItem(SS_KEY_RETURN, JSON.stringify({
        originUrl: url,
        scrollY: scrollY || 0,
        ts: Date.now(),
      }));
    } catch (_) {}
  }

  function clearOriginReturn() {
    try {
      sessionStorage.removeItem(SS_KEY_RETURN);
    } catch (_) {}
  }

  function isOriginPage() {
    return document.body.classList.contains('page-accueil') || document.body.classList.contains('page-projets');
  }

  function slugFromHref(href) {
    if (!href) return null;
    var m = href.match(/\/work\/([^/?#]+)\/?(?:[?#]|$)/i);
    if (m) return m[1];
    m = href.match(/projets\/([^.\/?#]+)\.html/i);
    return m ? m[1] : null;
  }

  function getInitialRadius(el) {
    var cs = getComputedStyle(el);
    var v = parseFloat(cs.borderTopLeftRadius);
    return isNaN(v) ? 0 : v;
  }

  function getHeroTargetRect() {
    // Nouvelle mise en page bento : on mesure le vrai 1er bloc
    if (typeof window.ppMeasureHeroRect === 'function') {
      try {
        var m = window.ppMeasureHeroRect();
        if (m && m.width > 0 && m.height > 0) return m;
      } catch (_) {}
    }
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var margePx = 24;
    try {
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;height:0;width:var(--marge-vitrine,var(--marge,9.5vw));';
      document.body.appendChild(probe);
      var pw = probe.getBoundingClientRect().width;
      if (pw > 0) margePx = pw;
      document.body.removeChild(probe);
    } catch (_) {}
    var width = Math.max(0, vw - 2 * margePx);
    var ratio = 16 / 9;
    var padTop, padBot;
    if (vw >= 1800) {
      var remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      padTop = Math.max(remPx * 5, Math.min(remPx * 7.5, vh * 0.09));
      padBot = Math.max(remPx * 3, Math.min(remPx * 5, vh * 0.05));
    } else {
      padTop = Math.max(112, Math.min(176, vh * 0.14));
      padBot = Math.max(64, Math.min(112, vh * 0.08));
    }
    var availH = vh - padTop - padBot;
    var h = width / ratio;
    var w = width;
    if (h > availH) {
      h = availH;
      w = h * ratio;
    }
    var left = (vw - w) / 2;
    var top = padTop + (availH - h) / 2;
    var rem2 = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    var radius = Math.max(rem2 * 1, Math.min(rem2 * 2.5, vw * 0.025));
    return {
      top: top,
      left: left,
      width: w,
      height: h,
      radius: radius
    };
  }

  function findCover(linkEl) {
    var article = linkEl.closest('.projet-item');
    if (article) {
      var cover = article.querySelector('.projet-cover');
      if (cover) return cover;
    }
    if (linkEl.classList.contains('selected-nav-item')) {
      var idx = linkEl.dataset.idx;
      if (idx != null) {
        var media = document.querySelector('.selected-media[data-idx="' + idx + '"]');
        if (media) return media;
      }
      return document.querySelector('.selected-media');
    }
    var selectedMedia = linkEl.closest('.selected-media');
    if (selectedMedia) return selectedMedia;
    return null;
  }

  function findCoverForSlug(slug) {
    if (!slug) return null;
    var articles = document.querySelectorAll('.projet-item');
    for (var i = 0; i < articles.length; i++) {
      var lien = articles[i].querySelector('a[href]');
      if (!lien) continue;
      if (slugFromHref(lien.getAttribute('href')) === slug) {
        var cover = articles[i].querySelector('.projet-cover');
        if (cover) return cover;
      }
    }
    var medias = document.querySelectorAll('.selected-media');
    for (var j = 0; j < medias.length; j++) {
      var lien2 = medias[j].querySelector('a[href]');
      if (!lien2) continue;
      if (slugFromHref(lien2.getAttribute('href')) === slug) return medias[j];
    }
    return null;
  }

  function rebasePath(p) {
    if (!p) return p;
    if (/^(https?:|data:|blob:|\/)/i.test(p)) return p;
    return p.replace(/^\.\.\/\.\.\//, '/').replace(/^\.\.\//, '/');
  }

  function buildProjetShell(projet, opts) {
    opts = opts || {};
    // La page est construite par projet-single.js (même rendu qu'en chargement direct)
    return window.ppBuildPage(projet, { videoStartTime: opts.videoStartTime || 0 });
  }

  function buildBlackBg(rect, radius) {
    var bg = document.createElement('div');
    bg.className = 'projet-zoom-bg';
    Object.assign(bg.style, {
      position: 'fixed',
      left: (rect.left + rect.width / 2) + 'px',
      top: (rect.top + rect.height / 2) + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      transform: 'translate(-50%, -50%)',
      background: '#0a0a0a',
      borderRadius: radius + 'px',
      zIndex: '99997',
      pointerEvents: 'none',
      willChange: 'width, height, border-radius',
      transition: 'none',
    });
    return bg;
  }

  function animateBlackBgIn(bg, startRect, startRadius, dur) {
    return new Promise(function(resolve) {
      var sW = startRect.width,
        sH = startRect.height;
      var eW = window.innerWidth * 1.4;
      var eH = window.innerHeight * 1.8;
      var sR = startRadius;
      var eR = 24;
      var t0 = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = easeInOutQuart(t);
        bg.style.width = (sW + (eW - sW) * e) + 'px';
        bg.style.height = (sH + (eH - sH) * e) + 'px';
        bg.style.borderRadius = (sR + (eR - sR) * e) + 'px';
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function animateBlackBgOut(bg, targetRect, targetRadius, dur) {
    return new Promise(function(resolve) {
      var sW = parseFloat(bg.style.width) || (window.innerWidth * 1.4);
      var sH = parseFloat(bg.style.height) || (window.innerHeight * 1.8);
      var sR = parseFloat(bg.style.borderRadius) || 24;
      var eW = targetRect.width,
        eH = targetRect.height;
      var eR = targetRadius;
      var t0 = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = easeInOutQuart(t);
        bg.style.width = (sW + (eW - sW) * e) + 'px';
        bg.style.height = (sH + (eH - sH) * e) + 'px';
        bg.style.borderRadius = (sR + (eR - sR) * e) + 'px';
        if (targetRect.cx != null) {
          var sx = parseFloat(bg.dataset.startCx);
          var sy = parseFloat(bg.dataset.startCy);
          if (!isNaN(sx) && !isNaN(sy)) {
            bg.style.left = (sx + (targetRect.cx - sx) * e) + 'px';
            bg.style.top = (sy + (targetRect.cy - sy) * e) + 'px';
          }
        }
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function buildCloneFromCover(cover, rect) {
    var radius = getInitialRadius(cover);
    var clone = cover.cloneNode(true);
    clone.classList.add('projet-zoom-clone');
    clone.removeAttribute('aria-hidden');
    var originalVideo = cover.querySelector('video');
    var startTime = 0;
    if (originalVideo) {
      try {
        startTime = originalVideo.currentTime || 0;
      } catch (_) {}
    }
    Object.assign(clone.style, {
      position: 'fixed',
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      maxWidth: 'none',
      maxHeight: 'none',
      minWidth: '0',
      minHeight: '0',
      aspectRatio: 'auto',
      margin: '0',
      padding: '0',
      zIndex: '99998',
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'transparent',
      borderRadius: radius + 'px',
      willChange: 'top, left, width, height, border-radius',
      transition: 'none',
      transform: 'translateZ(0)',
    });
    clone.querySelectorAll('img, video').forEach(function(m) {
      m.style.width = '100%';
      m.style.height = '100%';
      m.style.objectFit = 'cover';
      m.style.display = 'block';
      m.style.transition = 'none';
      m.style.transform = 'none';
    });
    clone.querySelectorAll('video').forEach(function(v) {
      v.muted = true;
      v.loop = true;
      var trySync = function() {
        try {
          v.currentTime = startTime;
        } catch (_) {}
      };
      if (v.readyState >= 1) trySync();
      else v.addEventListener('loadedmetadata', trySync, {
        once: true
      });
      try {
        v.play();
      } catch (_) {}
    });
    return {
      clone: clone,
      radius: radius,
      videoCurrentTime: startTime
    };
  }

  function buildCloneForReturn(shell) {
    // Le média le plus proche du centre de l'écran sert de point de départ
    var cells = shell.querySelectorAll('.pp-cell, .pp-outro-card');
    var vH = window.innerHeight;
    var best = null;
    var bestDist = Infinity;
    cells.forEach(function(c) {
      var r = c.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vH || r.width === 0) return;
      var dist = Math.abs(r.top + r.height / 2 - vH / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    });
    var mediaRect, sourceMedia, radius;
    if (best) {
      var br = best.getBoundingClientRect();
      mediaRect = {
        top: br.top,
        left: br.left,
        width: br.width,
        height: br.height
      };
      sourceMedia = best.querySelector('video, img');
      radius = getInitialRadius(best);
    } else {
      var t = getHeroTargetRect();
      mediaRect = {
        top: t.top,
        left: t.left,
        width: t.width,
        height: t.height
      };
      sourceMedia = null;
      radius = t.radius;
    }
    var wrapper = document.createElement('div');
    wrapper.className = 'projet-zoom-clone';
    Object.assign(wrapper.style, {
      position: 'fixed',
      top: mediaRect.top + 'px',
      left: mediaRect.left + 'px',
      width: mediaRect.width + 'px',
      height: mediaRect.height + 'px',
      maxWidth: 'none',
      maxHeight: 'none',
      minWidth: '0',
      minHeight: '0',
      aspectRatio: 'auto',
      margin: '0',
      padding: '0',
      zIndex: '99998',
      overflow: 'hidden',
      pointerEvents: 'none',
      background: 'transparent',
      borderRadius: radius + 'px',
      willChange: 'top, left, width, height, border-radius',
      transition: 'none',
      transform: 'translateZ(0)',
    });
    if (best) wrapper.style.background = getComputedStyle(best).backgroundColor;
    if (sourceMedia) {
      var sourceCurrentTime = 0;
      if (sourceMedia.tagName === 'VIDEO') {
        try {
          sourceCurrentTime = sourceMedia.currentTime || 0;
        } catch (_) {}
      }
      var mediaClone = sourceMedia.cloneNode(true);
      mediaClone.style.position = 'absolute';
      mediaClone.style.inset = '0';
      mediaClone.style.width = '100%';
      mediaClone.style.height = '100%';
      var srcCs = getComputedStyle(sourceMedia);
      mediaClone.style.objectFit = srcCs.objectFit || 'cover';
      mediaClone.style.display = 'block';
      mediaClone.style.margin = '0';
      mediaClone.style.padding = srcCs.padding || '0';
      mediaClone.style.transition = 'none';
      mediaClone.style.transform = 'none';
      if (mediaClone.tagName === 'VIDEO') {
        mediaClone.muted = true;
        mediaClone.loop = true;
        var doSyncReturn = function() {
          try {
            mediaClone.currentTime = sourceCurrentTime;
          } catch (_) {}
        };
        if (mediaClone.readyState >= 1) doSyncReturn();
        else mediaClone.addEventListener('loadedmetadata', doSyncReturn, {
          once: true
        });
        try {
          mediaClone.play();
        } catch (_) {}
      }
      wrapper.appendChild(mediaClone);
    }
    return {
      wrapper: wrapper,
      rect: mediaRect,
      radius: radius
    };
  }

  function animateZoomIn(clone, startRect, startRadius, dur) {
    return new Promise(function(resolve) {
      var target = getHeroTargetRect();
      var sT = startRect.top,
        sL = startRect.left,
        sW = startRect.width,
        sH = startRect.height;
      var eT = target.top,
        eL = target.left,
        eW = target.width,
        eH = target.height;
      var t0 = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = easeInOutQuart(t);
        clone.style.top = (sT + (eT - sT) * e) + 'px';
        clone.style.left = (sL + (eL - sL) * e) + 'px';
        clone.style.width = (sW + (eW - sW) * e) + 'px';
        clone.style.height = (sH + (eH - sH) * e) + 'px';
        clone.style.borderRadius = (startRadius + (target.radius - startRadius) * e) + 'px';
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function animateZoomOut(clone, startRect, startRadius, targetRect, targetRadius, dur) {
    return new Promise(function(resolve) {
      var sT = startRect.top,
        sL = startRect.left,
        sW = startRect.width,
        sH = startRect.height;
      var eT = targetRect.top,
        eL = targetRect.left,
        eW = targetRect.width,
        eH = targetRect.height;
      var t0 = performance.now();

      function tick(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = easeInOutQuart(t);
        clone.style.top = (sT + (eT - sT) * e) + 'px';
        clone.style.left = (sL + (eL - sL) * e) + 'px';
        clone.style.width = (sW + (eW - sW) * e) + 'px';
        clone.style.height = (sH + (eH - sH) * e) + 'px';
        clone.style.borderRadius = (startRadius + (targetRadius - startRadius) * e) + 'px';
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function injectShell(opts) {
    var projet = opts.projet;
    var built = buildProjetShell(projet, {
      videoStartTime: opts.heroVideoStartTime || 0,
    });
    var importedShell = built.shell;
    var theme = built.theme;
    var fromState = {
      url: opts.originUrl,
      scrollY: opts.originScrollY,
      bodyClass: document.body.className,
      bodyStyle: document.body.getAttribute('style') || '',
      title: document.title,
      slug: projet.slug,
      htmlClass: document.documentElement.className,
    };
    saveOrigin(opts.originUrl, opts.originScrollY);
    document.body.classList.add('proj-spa-shown');
    var hiddenEls = [];
    var preloader = document.getElementById('preloader');
    if (preloader) {
      hiddenEls.push({
        el: preloader,
        prev: preloader.style.display
      });
      preloader.style.display = 'none';
    }
    var fleche = document.querySelector('.retour-fleche');
    if (fleche && !fleche.closest('.proj-page-shell')) {
      hiddenEls.push({
        el: fleche,
        prev: fleche.style.display
      });
      fleche.style.display = 'none';
    }
    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }
    document.documentElement.style.overflow = 'hidden';
    importedShell.classList.add('proj-page-shell--injected');
    importedShell.dataset.spa = '1';
    document.body.appendChild(importedShell);
    document.body.classList.add('page-projet-single');
    document.body.style.setProperty('--projet-bg', theme.bg);
    document.body.style.setProperty('--projet-texte', theme.texte);
    document.body.style.setProperty('--projet-accent', theme.accent);
    document.title = 'Willyol - ' + projet.nom;
    history.pushState({
      spa: true,
      slug: projet.slug,
      fromState: fromState
    }, '', opts.targetURL);
    if (typeof window.initProjetSingle === 'function') {
      try {
        window.initProjetSingle(importedShell, {
          spa: true
        });
      } catch (_) {}
    }
    if (typeof window.appliquerLangue === 'function') {
      try {
        window.appliquerLangue(window.langueActuelle || localStorage.getItem('langue') || 'en');
      } catch (_) {}
    }
    return {
      shell: importedShell,
      fromState: fromState,
      hiddenEls: hiddenEls,
      slug: projet.slug
    };
  }

  function restoreOriginDom(state) {
    var shell = state.shell;
    var fromState = state.fromState;
    var hiddenEls = state.hiddenEls;
    if (typeof shell._ppDestroy === 'function') {
      try { shell._ppDestroy(); } catch (_) {}
    }
    if (shell.parentNode) shell.parentNode.removeChild(shell);
    document.body.className = fromState.bodyClass;
    if (fromState.htmlClass != null) {
      document.documentElement.className = fromState.htmlClass;
    }
    document.title = fromState.title;
    document.body.classList.remove('proj-spa-shown');
    if (fromState.bodyStyle) {
      document.body.setAttribute('style', fromState.bodyStyle);
    } else {
      document.body.removeAttribute('style');
    }
    hiddenEls.forEach(function(h) {
      if (h.el.id === 'preloader') {
        h.el.style.display = 'none';
        return;
      }
      h.el.style.display = h.prev || '';
    });
    clearOriginReturn();
  }

  function unfreezeOriginScroll(state) {
    var fromState = state.fromState;
    var targetScrollY = fromState.scrollY || 0;
    document.documentElement.style.overflow = '';
    document.documentElement.style.scrollBehavior = 'auto';
    if (Math.abs(window.scrollY - targetScrollY) > 1) {
      window.scrollTo(0, targetScrollY);
    }
    if (window.__lenis) {
      try {
        if (typeof window.__lenis.scrollTo === 'function') {
          window.__lenis.scrollTo(targetScrollY, {
            immediate: true,
            force: true,
            lock: false,
          });
        }
        if (typeof window.__lenis.start === 'function') {
          window.__lenis.start();
        }
      } catch (_) {}
    }
    try {
      window.dispatchEvent(new Event('scroll'));
    } catch (_) {}
    requestAnimationFrame(function() {
      document.documentElement.style.scrollBehavior = '';
    });
  }

  function restoreOrigin(state) {
    restoreOriginDom(state);
    unfreezeOriginScroll(state);
  }

  function teardownShellSimple(state) {
    if (!state || !state.shell) return Promise.resolve();
    var shell = state.shell;
    return new Promise(function(resolve) {
      shell.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
      requestAnimationFrame(function() {
        shell.style.opacity = '0';
      });
      setTimeout(function() {
        restoreOrigin(state);
        resolve();
      }, FADE_DUR + 20);
    });
  }

  function teardownShellWithZoomOut(state) {
    if (!state || !state.shell) return Promise.resolve();
    var shell = state.shell;
    var slug = state.slug;
    return new Promise(function(resolve) {
      var built = buildCloneForReturn(shell);
      var clone = built.wrapper;
      var startRect = built.rect;
      var startRadius = built.radius;
      var bgStartCx = startRect.left + startRect.width / 2;
      var bgStartCy = startRect.top + startRect.height / 2;
      var blackBg = document.createElement('div');
      blackBg.className = 'projet-zoom-bg';
      Object.assign(blackBg.style, {
        position: 'fixed',
        left: bgStartCx + 'px',
        top: bgStartCy + 'px',
        width: (window.innerWidth * 1.4) + 'px',
        height: (window.innerHeight * 1.8) + 'px',
        transform: 'translate(-50%, -50%)',
        background: '#0a0a0a',
        borderRadius: '24px',
        zIndex: '99997',
        pointerEvents: 'none',
        willChange: 'width, height, border-radius, left, top',
        transition: 'none',
      });
      blackBg.dataset.startCx = bgStartCx;
      blackBg.dataset.startCy = bgStartCy;
      document.body.appendChild(blackBg);
      document.body.appendChild(clone);
      void clone.offsetHeight;
      restoreOriginDom(state);
      var cover = findCoverForSlug(slug);
      if (!cover) {
        clone.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
        blackBg.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
        requestAnimationFrame(function() {
          clone.style.opacity = '0';
          blackBg.style.opacity = '0';
        });
        setTimeout(function() {
          if (clone.parentNode) clone.parentNode.removeChild(clone);
          if (blackBg.parentNode) blackBg.parentNode.removeChild(blackBg);
          unfreezeOriginScroll(state);
          resolve();
        }, FADE_DUR + 20);
        return;
      }
      var coverRect = cover.getBoundingClientRect();
      var vH = window.innerHeight;
      if (coverRect.bottom < 0 || coverRect.top > vH) {
        clone.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
        blackBg.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
        requestAnimationFrame(function() {
          clone.style.opacity = '0';
          blackBg.style.opacity = '0';
        });
        setTimeout(function() {
          if (clone.parentNode) clone.parentNode.removeChild(clone);
          if (blackBg.parentNode) blackBg.parentNode.removeChild(blackBg);
          unfreezeOriginScroll(state);
          resolve();
        }, FADE_DUR + 20);
        return;
      }
      var targetRadius = getInitialRadius(cover);
      var dx = (startRect.left + startRect.width / 2) - (coverRect.left + coverRect.width / 2);
      var dy = (startRect.top + startRect.height / 2) - (coverRect.top + coverRect.height / 2);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var maxDist = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
      var ratio = Math.min(1, dist / maxDist);
      var zoomDur = ZOOM_IN_DUR_MIN + (ZOOM_IN_DUR_MAX - ZOOM_IN_DUR_MIN) * ratio;
      var coverPrevVisibility = cover.style.visibility;
      cover.style.visibility = 'hidden';
      var bgTargetRect = {
        width: coverRect.width,
        height: coverRect.height,
        cx: coverRect.left + coverRect.width / 2,
        cy: coverRect.top + coverRect.height / 2,
      };
      requestAnimationFrame(function() {
        Promise.all([animateZoomOut(clone, startRect, startRadius, coverRect, targetRadius, zoomDur), animateBlackBgOut(blackBg, bgTargetRect, targetRadius, zoomDur), ]).then(function() {
          setTimeout(function() {
            cover.style.visibility = coverPrevVisibility || '';
            var T1_DUR = 600;
            var T1_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)';
            clone.style.transition = 'clip-path ' + T1_DUR + 'ms ' + T1_EASE;
            blackBg.style.transition = 'clip-path ' + T1_DUR + 'ms ' + T1_EASE;
            clone.style.clipPath = 'inset(0 0 0 0)';
            blackBg.style.clipPath = 'inset(0 0 0 0)';
            void clone.offsetHeight;
            requestAnimationFrame(function() {
              clone.style.clipPath = 'inset(100% 0 0 0)';
              blackBg.style.clipPath = 'inset(100% 0 0 0)';
            });
            setTimeout(function() {
              if (clone.parentNode) clone.parentNode.removeChild(clone);
              if (blackBg.parentNode) blackBg.parentNode.removeChild(blackBg);
              unfreezeOriginScroll(state);
              resolve();
            }, T1_DUR + 30);
          }, 300);
        });
      });
    });
  }
  var CURRENT_SPA = null;
  var TEARDOWN_IN_PROGRESS = false;
  var CLICK_IN_PROGRESS = false;

  function cleanupZoomState() {
    document.documentElement.classList.remove('projet-zoom-out');
    document.querySelectorAll('.projet-zoom-clone, .projet-zoom-bg').forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    CLICK_IN_PROGRESS = false;
  }
  async function onOriginClick(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    var lien = e.target.closest('a[href]');
    if (!lien) return;
    if (lien.target === '_blank') return;
    var hrefAttr = lien.getAttribute('href');
    var slug = slugFromHref(hrefAttr);
    if (!slug) return;
    var cover = findCover(lien);
    if (!cover) return;
    var projet = (typeof window.getProjetBySlug === 'function') ? window.getProjetBySlug(slug) : null;
    if (!projet) {
      console.warn('[projet-zoom] Pas de données pour "' + slug + '" — nav classique');
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (CLICK_IN_PROGRESS) return;
    CLICK_IN_PROGRESS = true;
    try {
      var originUrl = location.pathname + location.search + location.hash;
      var originScrollY = 0;
      var targetURL = new URL(lien.href, location.href).href;
      var rect = cover.getBoundingClientRect();
      var vH = window.innerHeight;
      var coverCenterY = window.scrollY + rect.top + rect.height / 2;
      var targetScrollY = Math.max(0, coverCenterY - vH / 2);
      var TOLERANCE = 50;
      var needScroll = Math.abs(targetScrollY - window.scrollY) > TOLERANCE;
      if (needScroll) {
        await new Promise(function(resolve) {
          var lenis = window.__lenis;
          if (lenis && typeof lenis.scrollTo === 'function') {
            try {
              lenis.scrollTo(targetScrollY, {
                duration: 1.2,
                easing: function(t) {
                  return 1 - Math.pow(1 - t, 3);
                },
                onComplete: resolve,
              });
              setTimeout(resolve, 1500);
            } catch (_) {
              window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
              });
              setTimeout(resolve, 800);
            }
          } else {
            window.scrollTo({
              top: targetScrollY,
              behavior: 'smooth'
            });
            setTimeout(resolve, 800);
          }
        });
      }
      originScrollY = window.scrollY || window.pageYOffset || 0;
      if (window.__lenis) {
        try {
          window.__lenis.stop();
        } catch (_) {}
      }
      var rectFinal = cover.getBoundingClientRect();
      var built = buildCloneFromCover(cover, rectFinal);
      var clone = built.clone;
      var radius = built.radius;
      var blackBg = buildBlackBg(rectFinal, radius);
      document.body.appendChild(blackBg);
      document.body.appendChild(clone);
      var target = getHeroTargetRect();
      var dx = (target.left + target.width / 2) - (rectFinal.left + rectFinal.width / 2);
      var dy = (target.top + target.height / 2) - (rectFinal.top + rectFinal.height / 2);
      var dist = Math.sqrt(dx * dx + dy * dy);
      var maxDist = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
      var ratio = Math.min(1, dist / maxDist);
      var zoomDur = ZOOM_IN_DUR_MIN + (ZOOM_IN_DUR_MAX - ZOOM_IN_DUR_MIN) * ratio;
      var zoomP = animateZoomIn(clone, rectFinal, radius, zoomDur);
      var bgP = animateBlackBgIn(blackBg, rectFinal, radius, zoomDur);
      await Promise.all([zoomP, bgP]);
      var heroVideoStartTime = 0;
      var cloneVideo = clone.querySelector('video');
      if (cloneVideo) {
        try {
          heroVideoStartTime = cloneVideo.currentTime || 0;
        } catch (_) {}
      }
      var injected = injectShell({
        projet: projet,
        targetURL: targetURL,
        originUrl: originUrl,
        originScrollY: originScrollY,
        heroVideoStartTime: heroVideoStartTime,
      });
      if (!injected) {
        cleanupZoomState();
        return;
      }
      CURRENT_SPA = injected;
      void injected.shell.offsetHeight;
      requestAnimationFrame(function() {
        clone.style.transition = 'opacity ' + FADE_DUR + 'ms ease';
        clone.style.opacity = '0';
      });
      setTimeout(function() {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        if (blackBg.parentNode) blackBg.parentNode.removeChild(blackBg);
        CLICK_IN_PROGRESS = false;
      }, FADE_DUR + 20);
    } catch (err) {
      console.warn('[projet-zoom] Erreur durant la transition :', err);
      cleanupZoomState();
    }
  }
  async function onPopState() {
    if (TEARDOWN_IN_PROGRESS) return;
    if (CURRENT_SPA) {
      TEARDOWN_IN_PROGRESS = true;
      var state = CURRENT_SPA;
      CURRENT_SPA = null;
      try {
        await teardownShellWithZoomOut(state);
      } catch (err) {
        console.warn('[projet-zoom] Erreur durant le teardown :', err);
        try {
          await teardownShellSimple(state);
        } catch (_) {}
      } finally {
        TEARDOWN_IN_PROGRESS = false;
        cleanupZoomState();
      }
    }
  }

  function scrollToLastThenBack() {
    if (!CURRENT_SPA || TEARDOWN_IN_PROGRESS) return;
    history.back();
  }

  function onShellClick(e) {
    if (!CURRENT_SPA) return;
    var back = e.target.closest('.retour-fleche, [data-projet-retour]');
    if (back) {
      e.preventDefault();
      scrollToLastThenBack();
    }
  }
  window.__projetZoomBack = function() {
    if (CURRENT_SPA && !TEARDOWN_IN_PROGRESS) {
      scrollToLastThenBack();
      return true;
    }
    return false;
  };

  function init() {
    cleanupZoomState();
    if (isOriginPage()) {
      document.addEventListener('click', onOriginClick, true);
      window.addEventListener('popstate', onPopState);
      document.addEventListener('click', onShellClick, true);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();