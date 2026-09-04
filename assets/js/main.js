/* Innov Builders — interações */
(function(){
  "use strict";

  // Resolve caminhos absolutos ("/assets/..") de dados JSON para a base real onde o
  // site esta montado (raiz OU subpath do GitHub Pages), derivada do proprio <script>.
  function fixAssetPaths(root){
    var s = document.querySelector('script[src*="/assets/js/"]'), base = '/';
    if(s){ var i = s.src.indexOf('/assets/'); if(i>=0) base = s.src.slice(0, i+1); }
    function walk(o){
      if(typeof o === 'string'){ return o.indexOf('/assets/')===0 ? base + o.slice(1) : o; }
      if(Array.isArray(o)){ for(var i=0;i<o.length;i++) o[i]=walk(o[i]); return o; }
      if(o && typeof o==='object'){ for(var k in o) o[k]=walk(o[k]); return o; }
      return o;
    }
    return walk(root);
  }

  // ---- mobile nav ----
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded','false');
        document.body.style.overflow='';
      });
    });
  }

  // ---- FAQ accordion ----
  document.querySelectorAll('.faq-q').forEach(function(q){
    q.addEventListener('click', function(){
      var open = q.getAttribute('aria-expanded')==='true';
      var a = q.nextElementSibling;
      q.setAttribute('aria-expanded', open ? 'false':'true');
      a.style.maxHeight = open ? null : a.scrollHeight + 'px';
    });
  });

  // ---- portfolio filter ----
  var filters = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('.pf-item');
  if(filters.length){
    filters.forEach(function(btn){
      btn.addEventListener('click', function(){
        filters.forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');
        var f = btn.dataset.filter;
        items.forEach(function(it){
          var show = (f==='all' || it.dataset.cat===f);
          it.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // ---- service sub-category filter (mostra/esconde blocos inteiros) ----
  document.querySelectorAll('[data-subcat-group]').forEach(function(group){
    var sbtns = group.querySelectorAll('.subcat-btn');
    var sblocks = group.querySelectorAll('.subcat-block');
    sbtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        sbtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.subfilter;
        sblocks.forEach(function(bl){
          bl.style.display = (f === 'all' || bl.dataset.subcat === f) ? '' : 'none';
        });
      });
    });
  });

  // ---- reveal on scroll ----
  // threshold:0 (qualquer pixel visivel revela) — elementos MUITO altos (galerias grandes)
  // nunca atingiam 12% e ficavam invisiveis (pagina em branco). Fallback: revela na hora
  // tudo que ja esta dentro/perto do viewport, e um safety que revela tudo apos 1.2s.
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0, rootMargin:'0px 0px -40px 0px'}) : null;
  var _revEls = document.querySelectorAll('.reveal');
  _revEls.forEach(function(el){
    var r = el.getBoundingClientRect();
    if (!io || r.top < (window.innerHeight||900) + 200) { el.classList.add('in'); if(io) io.unobserve(el); }
    else { io.observe(el); }
  });
  setTimeout(function(){ document.querySelectorAll('.reveal:not(.in)').forEach(function(el){ el.classList.add('in'); }); }, 1200);

  // ---- before/after slider ----
  document.querySelectorAll('.ba').forEach(function(ba){
    var pos = 50;
    function set(x){
      var r = ba.getBoundingClientRect();
      pos = Math.max(0, Math.min(100, ((x - r.left)/r.width)*100));
      ba.style.setProperty('--pos', pos+'%');
    }
    var down=false;
    ba.addEventListener('pointerdown', function(e){ down=true; set(e.clientX); ba.setPointerCapture(e.pointerId); });
    ba.addEventListener('pointermove', function(e){ if(down) set(e.clientX); });
    ba.addEventListener('pointerup', function(){ down=false; });
    ba.addEventListener('pointercancel', function(){ down=false; });
  });

  // ---- header shadow on scroll ----
  var header = document.querySelector('.site-header');
  if(header){
    var onScroll = function(){ header.style.boxShadow = window.scrollY>10 ? '0 10px 30px rgba(0,0,0,.25)' : 'none'; };
    window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  }

  // ---- lightbox gallery ----
  var galData = {};
  var gd = document.getElementById('galleries');
  if(gd){ try{ galData = fixAssetPaths(JSON.parse(gd.textContent)); }catch(e){} }

  if(Object.keys(galData).length){
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML =
      '<div class="lb-top"><div class="lb-title"><b></b><span></span></div>'+
      '<div class="lb-top-right"><span class="lb-counter"></span>'+
      '<button class="lb-close" aria-label="Close">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>'+
      '<div class="lb-stage">'+
      '<button class="lb-nav lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>'+
      '<img class="lb-img" alt="">'+
      '<video class="lb-video" controls playsinline preload="metadata" style="display:none"></video>'+
      '<button class="lb-nav lb-next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>'+
      '</div><div class="lb-thumbs"></div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('.lb-img'),
        lbVideo = lb.querySelector('.lb-video'),
        lbTitle = lb.querySelector('.lb-title b'),
        lbSub = lb.querySelector('.lb-title span'),
        lbCounter = lb.querySelector('.lb-counter'),
        lbThumbs = lb.querySelector('.lb-thumbs');
    var cur = [], idx = 0, meta = {};

    function preload(src){ var i = new Image(); i.src = src; }
    function stopVideo(){ try{ lbVideo.pause(); }catch(e){} lbVideo.removeAttribute('src'); lbVideo.load && lbVideo.load(); lbVideo.style.display='none'; }
    function show(i){
      idx = (i + cur.length) % cur.length;
      var ph = cur[idx];
      stopVideo();
      if(ph.video){
        lbImg.classList.remove('show'); lbImg.style.display='none';
        lbVideo.style.display=''; lbVideo.poster = ph.src; lbVideo.src = ph.video;
      } else {
        lbImg.style.display=''; lbImg.classList.remove('show');
        var tmp = new Image();
        tmp.onload = function(){ lbImg.src = ph.src; lbImg.alt = ph.cap || meta.title; requestAnimationFrame(function(){ lbImg.classList.add('show'); }); };
        tmp.src = ph.src;
      }
      lbCounter.textContent = (idx+1) + ' / ' + cur.length;
      lbThumbs.querySelectorAll('.lb-thumb').forEach(function(t,n){ t.classList.toggle('active', n===idx); });
      var at = lbThumbs.children[idx]; if(at) at.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
      var nx=cur[(idx+1)%cur.length], pv=cur[(idx-1+cur.length)%cur.length];
      if(!nx.video) preload(nx.src); if(!pv.video) preload(pv.src);
    }
    function open(key, start){
      var g = galData[key]; if(!g) return;
      cur = g.photos; meta = g; idx = start||0;
      lbTitle.textContent = g.title; lbSub.textContent = g.sub || '';
      lbThumbs.innerHTML = '';
      cur.forEach(function(ph,n){
        var b = document.createElement('button'); b.className='lb-thumb'+(ph.video?' lb-thumb-vid':''); b.type='button';
        b.innerHTML = '<img src="'+ph.src+'" alt="" loading="lazy">'+(ph.video?'<span class="lb-thumb-play" aria-hidden="true"></span>':'');
        b.addEventListener('click', function(){ show(n); });
        lbThumbs.appendChild(b);
      });
      lb.classList.add('open'); document.body.classList.add('lb-open');
      show(idx);
    }
    function close(){ stopVideo(); lb.classList.remove('open'); document.body.classList.remove('lb-open'); }

    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function(){ show(idx-1); });
    lb.querySelector('.lb-next').addEventListener('click', function(){ show(idx+1); });
    lb.querySelector('.lb-stage').addEventListener('click', function(e){ if(e.target.classList.contains('lb-stage')) close(); });
    document.addEventListener('keydown', function(e){
      if(!lb.classList.contains('open')) return;
      if(e.key==='Escape') close();
      else if(e.key==='ArrowRight') show(idx+1);
      else if(e.key==='ArrowLeft') show(idx-1);
    });
    // touch swipe
    var tx=0;
    lb.querySelector('.lb-stage').addEventListener('touchstart', function(e){ tx=e.touches[0].clientX; }, {passive:true});
    lb.querySelector('.lb-stage').addEventListener('touchend', function(e){
      var dx = e.changedTouches[0].clientX - tx;
      if(Math.abs(dx)>45) show(idx + (dx<0?1:-1));
    }, {passive:true});

    // triggers
    document.querySelectorAll('[data-gallery]').forEach(function(el){
      el.addEventListener('click', function(e){
        e.preventDefault();
        open(el.dataset.gallery, parseInt(el.dataset.index||'0',10));
      });
    });
  }

  // ---- form (demo, no backend) ----
  // ---- Explore Our Work: 1 por categoria + carregar mais (so em All Projects) ----
  var hs = document.querySelector('.hoverslide');
  if(hs){
    var hsItems = [].slice.call(hs.querySelectorAll('.pf-item'));
    var moreBtn = document.getElementById('hs-more'), allBtn = document.getElementById('hs-all');
    var STEP = Math.max(1, document.querySelectorAll('.filter-btn').length - 1);
    var shownN = STEP;
    function hsActive(){ var a = document.querySelector('.filter-btn.active'); return a ? a.dataset.filter : 'all'; }
    function hsApply(){
      var f = hsActive();
      if(f !== 'all'){
        hsItems.forEach(function(it){ it.style.display = (it.dataset.cat===f) ? '' : 'none'; });
        if(moreBtn) moreBtn.style.display = 'none';
        if(allBtn) allBtn.style.display = '';
        return;
      }
      var n = 0;
      hsItems.forEach(function(it){ it.style.display = (n < shownN) ? '' : 'none'; n++; });
      if(moreBtn) moreBtn.style.display = (shownN < hsItems.length) ? '' : 'none';
      if(allBtn) allBtn.style.display = (shownN >= hsItems.length) ? '' : 'none';
    }
    document.querySelectorAll('.filter-btn').forEach(function(b){
      b.addEventListener('click', function(){ if(b.dataset.filter==='all'){ shownN = STEP; } hsApply(); });
    });
    if(moreBtn) moreBtn.addEventListener('click', function(){ shownN += STEP; hsApply(); });
    hsApply();
  }

  // ---- hover slideshow (Explore Our Work) ----
  var hsEl = document.getElementById('galleries');
  if(hsEl){
    var GAL = {};
    try{ GAL = fixAssetPaths(JSON.parse(hsEl.textContent)); }catch(e){}
    document.querySelectorAll('.hoverslide .pf-item').forEach(function(item){
      var img = item.querySelector('img'); if(!img) return;
      var photos = (GAL[item.dataset.gallery] || {}).photos;
      if(!photos || photos.length < 2) return;
      var orig = img.getAttribute('src'), timer = null, preloaded = false;
      var i = parseInt(item.dataset.index || '0', 10) || 0;
      item.addEventListener('mouseenter', function(){
        // so troca os projetos no hover quando estiver em "All Projects";
        // dentro de uma categoria (ex.: Kitchen Remodels) o efeito nao faz sentido
        var af = document.querySelector('.filter-btn.active');
        if(af && af.dataset.filter !== 'all') return;
        if(timer) return;
        if(!preloaded){ photos.forEach(function(p){ var x = new Image(); x.src = p.src; }); preloaded = true; }
        timer = setInterval(function(){
          i = (i + 1) % photos.length;
          img.style.opacity = '0';
          setTimeout(function(){ img.src = photos[i].src; img.style.opacity = '1'; }, 260);
        }, 2000);
      });
      item.addEventListener('mouseleave', function(){
        if(timer){ clearInterval(timer); timer = null; }
        img.style.opacity = '0';
        setTimeout(function(){ img.src = orig; img.style.opacity = '1'; }, 120);
      });
    });
  }

  // ---- Explore Our Work: videos tocam inline na propria galeria (sem lightbox) ----
  document.querySelectorAll('.hoverslide .pf-item[data-video]').forEach(function(item){
    item.addEventListener('click', function(){
      if(item.querySelector('video')) return; // ja esta tocando
      var v = document.createElement('video');
      v.src = item.dataset.video;
      if(item.dataset.poster) v.poster = item.dataset.poster;
      v.controls = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('playsinline','');
      v.style.cssText = 'width:100%;display:block;position:relative;z-index:3;background:#000';
      var img = item.querySelector('img'); if(img) img.style.display = 'none';
      var pl = item.querySelector('.pf-play'); if(pl) pl.style.display = 'none';
      var cap = item.querySelector('.pf-cap'); if(cap) cap.style.display = 'none';
      var tag = item.querySelector('.pf-tag'); if(tag) tag.style.display = 'none';
      item.appendChild(v);
      item.style.cursor = 'default';
      var p = v.play(); if(p && p.catch) p.catch(function(){});
    });
  });

  document.querySelectorAll('form[data-quote]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = f.querySelector('[type=submit]');
      if(btn){ btn.textContent = 'Thank you! We will contact you shortly.'; btn.disabled = true; }
    });
  });

  // ---- multi-step estimate form ----
  document.querySelectorAll('form[data-stepform]').forEach(function(form){
    var panels = [].slice.call(form.querySelectorAll('.steppanel'));
    var dots = [].slice.call(form.querySelectorAll('.stepdot'));
    var lines = [].slice.call(form.querySelectorAll('.stepline'));
    var cur = 0;
    function show(i){
      cur = i;
      panels.forEach(function(p,n){ p.hidden = n!==i; });
      dots.forEach(function(d,n){ d.classList.toggle('active', n===i); d.classList.toggle('done', n<i); });
      lines.forEach(function(l,n){ l.classList.toggle('done', n<i); });
    }
    function valid(i){
      var fields = [].slice.call(panels[i].querySelectorAll('input,select,textarea'));
      for(var k=0;k<fields.length;k++){
        if(!fields[k].checkValidity()){ fields[k].reportValidity(); return false; }
      }
      return true;
    }
    form.querySelectorAll('.stepnext').forEach(function(b){
      b.addEventListener('click', function(){ if(valid(cur)) show(Math.min(cur+1, panels.length-1)); });
    });
    form.querySelectorAll('.stepprev').forEach(function(b){
      b.addEventListener('click', function(){ show(Math.max(cur-1, 0)); });
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!valid(cur)) return;
      var submitBtn = form.querySelector('[type=submit]');
      if(submitBtn){ submitBtn.disabled = true; }
      function showDone(){
        var bar = form.querySelector('.stepbar'); if(bar) bar.style.display = 'none';
        panels.forEach(function(p){ p.hidden = true; });
        var done = form.querySelector('.stepdone'); if(done) done.hidden = false;
      }
      function fail(){
        if(submitBtn){ submitBtn.disabled = false; }
        alert('Sorry, we could not send your request right now. Please call us at (978) 878-7977 or try again.');
      }
      var fd = new FormData(form);
      fd.append('page', location.href);
      fetch('/api/lead.php', { method:'POST', body: fd })
        .then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
        .then(function(res){ if(res && res.ok){ showDone(); } else { fail(); } })
        .catch(fail);
    });
    form.stepReset = function(){
      var done = form.querySelector('.stepdone');
      if(done) done.hidden = true;
      var bar = form.querySelector('.stepbar'); if(bar) bar.style.display = '';
      show(0);
    };
    show(0);
  });
})();

/* Free Estimate modal — any .btn linking to /contacts/ opens the quote popup */
(function(){
  var modal = document.getElementById('quote-modal');
  if(!modal) return;
  var lastFocus = null;
  function openModal(e){
    if(e){ e.preventDefault(); }
    lastFocus = document.activeElement;
    var form = modal.querySelector('form[data-stepform]');
    if(form && form.stepReset) form.stepReset();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('qmodal-lock');
    var first = modal.querySelector('select,input,textarea');
    if(first){ setTimeout(function(){ try{ first.focus(); }catch(_){} }, 60); }
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('qmodal-lock');
    if(lastFocus){ try{ lastFocus.focus(); }catch(_){} }
  }
  /* triggers: every gold/CTA button that pointed at the contact page + explicit opt-in */
  var triggers = document.querySelectorAll('a.btn[href$="contacts/"], a.btn[href$="contacts"], [data-quote-open]');
  [].forEach.call(triggers, function(t){ t.addEventListener('click', openModal); });
  /* close: backdrop, X, Esc */
  [].forEach.call(modal.querySelectorAll('[data-qmodal-close]'), function(b){ b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
})();

/* Before/After comparison carousel — infinite loop (whole slides glide right), pauses on interaction */
(function(){
  document.querySelectorAll('.ba-carousel').forEach(function(car){
    var track = car.querySelector('.ba-track');
    if(!track) return;
    var real = Array.prototype.slice.call(track.querySelectorAll('.ba-slide'));
    var n = real.length;
    if(n === 0) return;
    var interval = parseInt(car.getAttribute('data-interval'), 10) || 4000;

    /* Build a seamless loop: reverse the DOM (so advancing forward moves the strip to the RIGHT),
       then clone the ends so we can wrap without a visible jump.
       DOM ends up: [S0', S(n-1) ... S1, S0, S(n-1)']  -> real S0 sits at index n. */
    real.slice().reverse().forEach(function(s){ track.appendChild(s); });
    var firstClone = real[0].cloneNode(true);       /* clone of forward-first slide */
    var lastClone  = real[n-1].cloneNode(true);     /* clone of forward-last slide  */
    firstClone.setAttribute('aria-hidden','true');
    lastClone.setAttribute('aria-hidden','true');
    track.insertBefore(firstClone, track.firstChild);
    track.appendChild(lastClone);

    var pos = n;                 /* index of real first slide */
    var timer=null, hoverPause=false, dragPause=false, resumeT=null, animating=false;

    function move(){ track.style.transform = 'translateX(' + (-pos*100) + '%)'; }
    function jump(target){                 /* reposition with NO animation, then restore the transition */
      track.style.transition = 'none';
      pos = target; move();
      track.getBoundingClientRect();       /* commit the no-transition frame */
      track.style.transition = '';         /* back to the CSS .6s for the next move */
    }
    jump(n);                               /* start on the first real slide */

    /* dots (one per real project, in forward order) */
    var dotsWrap = car.querySelector('.ba-dots');
    var dots = [];
    function realIndex(){ if(pos === 0) return 0; if(pos === n+1) return n-1; return n - pos; }
    function paintDots(){ dots.forEach(function(d,i){ d.classList.toggle('active', i === realIndex()); }); }
    var settleT = null;
    function settle(){                     /* runs once per move: reset lock + do the seamless wrap */
      if(!animating) return;
      animating = false;
      if(settleT){ clearTimeout(settleT); settleT = null; }
      if(pos === 0) jump(n);               /* wrapped past the start -> land on the real last slide */
      else if(pos === n+1) jump(1);        /* wrapped past the end   -> land on the real first slide */
      paintDots();
    }
    function run(target){                  /* animate the strip to a position, arm the settle */
      if(animating || target === pos) return;
      pos = target; move(); animating = true; paintDots();
      if(settleT) clearTimeout(settleT);
      settleT = setTimeout(settle, 720);   /* fallback if transitionend never fires (reduced-motion) */
    }
    function step(dir){ run(pos + dir); }
    track.addEventListener('transitionend', function(e){
      if(e.target === track && e.propertyName === 'transform') settle();
    });

    if(dotsWrap){
      real.forEach(function(s,i){
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Project ' + (i+1));
        b.addEventListener('click', function(){ run(n - i); restart(); });
        dotsWrap.appendChild(b); dots.push(b);
      });
    }
    paintDots();

    function tick(){ if(!hoverPause && !dragPause) step(-1); }   /* auto: advance forward = strip glides right */
    function start(){ stop(); timer = setInterval(tick, interval); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    function restart(){ start(); }

    var nx = car.querySelector('.ba-next'), pv = car.querySelector('.ba-prev');
    if(nx) nx.addEventListener('click', function(){ step(-1); restart(); });
    if(pv) pv.addEventListener('click', function(){ step(1); restart(); });

    car.addEventListener('mouseenter', function(){ hoverPause = true; });
    car.addEventListener('mouseleave', function(){ hoverPause = false; });

    /* before/after drag (every compare, clones included) */
    Array.prototype.slice.call(track.querySelectorAll('.ba-compare')).forEach(function(cmp){
      var dragging = false;
      function setPos(clientX){
        var r = cmp.getBoundingClientRect();
        var p = Math.max(0, Math.min(100, (clientX - r.left) / r.width * 100));
        cmp.style.setProperty('--pos', p + '%');
      }
      cmp.addEventListener('pointerdown', function(e){
        dragging = true; dragPause = true; setPos(e.clientX);
        if(resumeT){ clearTimeout(resumeT); resumeT = null; }
        try{ cmp.setPointerCapture(e.pointerId); }catch(_){}
      });
      cmp.addEventListener('pointermove', function(e){ if(dragging) setPos(e.clientX); });
      function endDrag(){
        dragging = false;
        if(resumeT) clearTimeout(resumeT);
        resumeT = setTimeout(function(){ dragPause = false; }, 2600);
      }
      cmp.addEventListener('pointerup', endDrag);
      cmp.addEventListener('pointercancel', endDrag);
    });

    start();
  });
})();

/* ---- Player dedicado (mgvid): som on/off ---- */
(function(){
  var players = document.querySelectorAll('.mgvid');
  players.forEach(function(w){
    var v = w.querySelector('.mgvid-el'), b = w.querySelector('.mgvid-sound');
    if(!v || !b) return;
    v.muted = true;
    // Lazy: only fetch the video when it scrolls into view — a big autoplay download must not block page navigation
    function ensureSrc(){ if(!v.dataset.loaded && v.getAttribute('data-src')){ v.src = v.getAttribute('data-src'); v.dataset.loaded = '1'; } }
    function loadAndPlay(){ ensureSrc(); var pr = v.play(); if(pr && pr.catch) pr.catch(function(){}); }
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ loadAndPlay(); io.disconnect(); } }); }, {rootMargin:'150px'});
      io.observe(v);
    } else { loadAndPlay(); }
    function sync(){
      b.classList.toggle('is-on', !v.muted);
      b.setAttribute('aria-pressed', String(!v.muted));
      b.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Mute video');
    }
    b.addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      v.muted = !v.muted;
      if(!v.muted){ v.volume = 1; loadAndPlay(); }
      sync();
    });
    v.addEventListener('volumechange', sync);
    sync();
  
  // ---- mobile: espalha os filtros ENTRE as fotos da galeria (economiza espaco no topo) ----
  (function distributeFiltersMobile(){
    if(window.matchMedia('(min-width:701px)').matches) return;
    var fb=document.querySelector('#explore .filterbar');
    var mas=document.querySelector('#explore .masonry');
    if(!fb||!mas) return;
    var btns=[].slice.call(fb.querySelectorAll('.filter-btn'));
    var items=[].slice.call(mas.querySelectorAll('.pf-item'));
    if(btns.length<2||items.length<2) return;
    fb.style.display='none';
    var sizes=[2,3,2,3,3], gi=0, ii=0, bi=0;
    while(bi<btns.length){
      var sz=sizes[gi%sizes.length]; gi++;
      var wrap=document.createElement('div'); wrap.className='filter-inline';
      for(var k=0;k<sz&&bi<btns.length;k++) wrap.appendChild(btns[bi++]);
      var anchor=items[Math.min(ii,items.length-1)];
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      ii++;
    }
  })();

});
})();
