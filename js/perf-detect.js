(function(){
  var cores = navigator.hardwareConcurrency || 8;
  var mem = navigator.deviceMemory || 8;
  var reducedMotion = false;
  try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_){}
  var connSlow = false;
  try {
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c && (c.saveData === true || /2g|slow-2g/.test(c.effectiveType||''))) connSlow = true;
  } catch(_){}
  var isLowPerf = cores <= 4 || mem <= 4 || reducedMotion || connSlow;
  if (isLowPerf) document.documentElement.classList.add('low-perf');
  window.__lowPerf = isLowPerf;
  window.__perfScore = { cores: cores, mem: mem, reducedMotion: reducedMotion, connSlow: connSlow };

  if (isLowPerf){
    var perfCSS = document.createElement('style');
    perfCSS.id = 'wol-perf-mode';
    perfCSS.textContent = [
      'html.low-perf #curseur{mix-blend-mode:normal!important;background:#fff!important;box-shadow:0 0 0 1.5px rgba(0,0,0,0.55)!important;}',
      'html.low-perf .proj-slide-play,html.low-perf .retour-fleche{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}',
      'html.low-perf .proj-slide-play{background:rgba(0,0,0,0.45)!important;}',
      'html.low-perf .retour-fleche{background:rgba(0,0,0,0.55)!important;}',
      'html.low-perf .retour-fleche:hover{background:var(--projet-texte)!important;}',
      'html.low-perf .retour-fleche::before{animation:none!important;}',
      'html.low-perf .ticker-track,html.low-perf .ticker-track-2,html.low-perf .about-marquee-track,html.low-perf [data-parallaxe],html.low-perf .apparaitre,html.low-perf .hero-km27-text,html.low-perf .nav-layer-top,html.low-perf .nav-layer-bot,html.low-perf .ce-layer-top,html.low-perf .ce-layer-bot,html.low-perf .feat-char-inner,html.low-perf .ct-line-inner,html.low-perf .selected-nav-item,html.low-perf .selected-media,html.low-perf .projet-item,html.low-perf .selected-main-track,html.low-perf .selected-nav-track{will-change:auto!important;}',
      'html.low-perf .contact-inner .contact-email{filter:none!important;}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(perfCSS);
  }

  var hintCSS = document.createElement('style');
  hintCSS.id = 'wol-perf-hints';
  hintCSS.textContent = [
    '.section-connect,.section-reseaux,.section-contact{content-visibility:auto;contain-intrinsic-size:1px 800px;}',
    '.projet-item .projet-cover{content-visibility:auto;contain-intrinsic-size:1px 400px;}'
  ].join('\n');
  (document.head||document.documentElement).appendChild(hintCSS);

  if (!('IntersectionObserver' in window)) return;

  var SKIP_IDS = { 'pl-video': 1 };
  var ioVideos = new IntersectionObserver(function(entries){
    for (var i=0; i<entries.length; i++){
      var e = entries[i];
      var v = e.target;
      if (SKIP_IDS[v.id]) continue;
      if (v.dataset.noAutopause === '1') continue;
      if (e.isIntersecting){
        if (v.dataset.willyolPaused === '1'){
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function(){});
          v.dataset.willyolPaused = '0';
        }
      } else {
        if (!v.paused && v.autoplay){
          v.pause();
          v.dataset.willyolPaused = '1';
        }
      }
    }
  }, { rootMargin: '300px 0px', threshold: 0 });

  function observe(v){
    if (!v || v.dataset.willyolObserved === '1') return;
    if (SKIP_IDS[v.id]) return;
    v.dataset.willyolObserved = '1';
    ioVideos.observe(v);
  }

  function scanInitial(){
    var vids = document.querySelectorAll('video');
    for (var i=0; i<vids.length; i++) observe(vids[i]);
  }

  function watchAdded(){
    var mo = new MutationObserver(function(muts){
      for (var i=0; i<muts.length; i++){
        var added = muts[i].addedNodes;
        for (var j=0; j<added.length; j++){
          var n = added[j];
          if (!(n instanceof HTMLElement)) continue;
          if (n.tagName === 'VIDEO') observe(n);
          else if (n.querySelectorAll){
            var vids = n.querySelectorAll('video');
            for (var k=0; k<vids.length; k++) observe(vids[k]);
          }
        }
      }
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ scanInitial(); watchAdded(); });
  } else {
    scanInitial();
    if (document.body) watchAdded();
    else document.addEventListener('DOMContentLoaded', watchAdded);
  }

  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) return;
    var vids = document.querySelectorAll('video');
    for (var i=0; i<vids.length; i++){
      var v = vids[i];
      if (SKIP_IDS[v.id]) continue;
      if (!v.paused){
        v.pause();
        v.dataset.willyolPaused = '1';
      }
    }
  });
})();
