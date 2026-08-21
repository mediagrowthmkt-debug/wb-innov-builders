/* Innov Builders - Portfolio experience (3 levels)
   Level 1: Categories (services)
   Level 2: Projects of a service, filterable by region
   Level 3: Project detail - Before / During / After, focused on the final result
   Data-driven from <script id="pf-data">. Self-contained: does not depend on main.js. */
(function () {
  var dataEl = document.getElementById('pf-data');
  var app = document.getElementById('pf-app');
  if (!dataEl || !app) return;
  // Resolve caminhos absolutos ("/assets/..") do JSON para a base real onde o site
  // esta montado (raiz OU subpath do GitHub Pages), derivada do proprio <script>.
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
  var DATA;
  try { DATA = fixAssetPaths(JSON.parse(dataEl.textContent)); } catch (e) { return; }
  var CATS = DATA.cats || [];
  var BYCAT = {};
  CATS.forEach(function (c) { BYCAT[c.slug] = c; });

  var ICONS = {
    kitchen: '<path d="M3 10 12 3l9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
    bath: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 9v11M13 9v11"/>',
    home: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    deck: '<path d="M3 20h18M6 20v-6M10 20v-6M14 20v-6M18 20v-6M3 14h18l-2-4H5l-2 4z"/>',
    cab: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M8 7h1M14 7h1"/>',
    trim: '<path d="M3 8l13 13 5-5L8 3 3 8z"/><path d="M7 7l2 2M11 5l2 2M15 9l2 2M9 11l2 2"/>',
    stairs: '<path d="M3 21V17h5v-4h5V9h5V5h3"/>',
    ext: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    floor: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 9v11M13 9v11"/>'
  };
  function icon(k) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[k] || ICONS.home) + '</svg>';
  }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  /* Sticky navigation bar: prominent back button + breadcrumb (+ optional project stepper).
     Always visible on service/project views so navigation is one tap away on mobile and desktop. */
  function navBar(o) {
    var back = o.backHref != null
      ? '<a class="pf2-nav-back" href="' + o.backHref + '">' + CHEV_L + '<span>' + esc(o.backLabel) + '</span></a>'
      : '';
    return '<div class="pf2-nav">' + back +
      '<nav class="pf2-crumb">' + o.crumb + '</nav>' +
      (o.stepper || '') + '</div>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------- lightbox (self-contained) ---------------- */
  var GROUPS = [];           // photo groups for the current view
  function grp(photos) { GROUPS.push(photos.slice()); return GROUPS.length - 1; }
  function shot(gi, i, src, cls) {
    if (src && typeof src === 'object' && src.video) {
      return '<button class="pf2-shot is-video ' + (cls || '') + '" data-g="' + gi + '" data-i="' + i + '" aria-label="Play video">' +
        '<img src="' + esc(src.poster || '') + '" loading="lazy" alt=""><span class="pf2-play" aria-hidden="true"></span></button>';
    }
    return '<button class="pf2-shot ' + (cls || '') + '" data-g="' + gi + '" data-i="' + i + '" aria-label="Open photo">' +
      '<img src="' + esc(src) + '" loading="lazy" alt=""><span class="pf2-zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span></button>';
  }

  var lb = document.createElement('div');
  lb.className = 'pf2-lb';
  lb.innerHTML =
    '<button class="pf2-lb-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    '<button class="pf2-lb-nav pf2-lb-prev" aria-label="Previous"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
    '<img class="pf2-lb-img" alt="">' +
    '<video class="pf2-lb-video" controls playsinline preload="metadata" style="display:none"></video>' +
    '<button class="pf2-lb-nav pf2-lb-next" aria-label="Next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
    '<div class="pf2-lb-counter"></div>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector('.pf2-lb-img');
  var lbVid = lb.querySelector('.pf2-lb-video');
  var lbCounter = lb.querySelector('.pf2-lb-counter');
  var lbList = [], lbIdx = 0;
  function lbShow(i) {
    if (!lbList.length) return;
    lbIdx = (i + lbList.length) % lbList.length;
    var item = lbList[lbIdx];
    if (item && typeof item === 'object' && item.video) {
      lbImg.style.display = 'none';
      lbImg.removeAttribute('src');
      lbVid.style.display = '';
      lbVid.src = item.video;
      if (item.poster) lbVid.poster = item.poster;
      try { lbVid.currentTime = 0; var pr = lbVid.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    } else {
      try { lbVid.pause(); } catch (e) {}
      lbVid.removeAttribute('src'); lbVid.load();
      lbVid.style.display = 'none';
      lbImg.style.display = '';
      lbImg.src = (item && item.src) ? item.src : item;
    }
    lbCounter.textContent = (lbIdx + 1) + ' / ' + lbList.length;
    lb.querySelector('.pf2-lb-prev').style.display = lbList.length > 1 ? '' : 'none';
    lb.querySelector('.pf2-lb-next').style.display = lbList.length > 1 ? '' : 'none';
    lbCounter.style.display = lbList.length > 1 ? '' : 'none';
  }
  function lbOpen(list, start) { lbList = list || []; lb.classList.add('open'); document.body.classList.add('pf2-lb-on'); lbShow(start || 0); }
  function lbClose() { lb.classList.remove('open'); document.body.classList.remove('pf2-lb-on'); try { lbVid.pause(); } catch (e) {} }
  lb.querySelector('.pf2-lb-close').addEventListener('click', lbClose);
  lb.querySelector('.pf2-lb-prev').addEventListener('click', function () { lbShow(lbIdx - 1); });
  lb.querySelector('.pf2-lb-next').addEventListener('click', function () { lbShow(lbIdx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
  });
  function wireShots() {
    app.querySelectorAll('.pf2-shot').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = GROUPS[+b.getAttribute('data-g')] || [];
        lbOpen(g, +b.getAttribute('data-i'));
      });
    });
  }

  /* ---------------- views ---------------- */
  function paint(html, title, level) {
    app.innerHTML = html;
    document.title = title;
    document.body.setAttribute('data-pf', level || 'home');
    wireShots();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function viewHome() {
    GROUPS = [];
    var cards = CATS.map(function (c) {
      return '<a class="pf2-cat" href="#/s/' + c.slug + '">' +
        '<div class="pf2-cat-media"><img src="' + esc(c.cover) + '" loading="lazy" alt="' + esc(c.title) + ' projects by Innov Builders"></div>' +
        '<div class="pf2-cat-body"><span class="pf2-cat-ico">' + icon(c.icon) + '</span>' +
        '<h3>' + esc(c.title) + '</h3><p>' + esc(c.tag) + '</p>' +
        '<span class="pf2-cat-count">' + c.count + ' project' + (c.count === 1 ? '' : 's') + ' ' + ARROW + '</span></div></a>';
    }).join('');
    paint(
      '<div class="pf2-cats">' + cards + '</div>',
      'Portfolio | Innov Builders',
      'home'
    );
  }

  function viewCategory(slug) {
    GROUPS = [];
    var c = BYCAT[slug];
    if (!c) return viewHome();
    var regions = [];
    c.projects.forEach(function (p) { if (regions.indexOf(p.city) < 0) regions.push(p.city); });
    var chips = ['<button class="pf2-chip active" data-region="all">All regions</button>']
      .concat(regions.map(function (r) { return '<button class="pf2-chip" data-region="' + esc(r) + '">' + esc(r) + '</button>'; })).join('');
    var grid = c.projects.map(function (p) {
      var kind = p.kind === 'process'
        ? '<span class="pf2-kind proc">Before · During · After</span>'
        : '<span class="pf2-kind">Finished result</span>';
      return '<a class="pf2-proj" data-region="' + esc(p.city) + '" href="#/s/' + c.slug + '/p/' + p.slug + '">' +
        '<div class="pf2-proj-media"><img src="' + esc(p.cover) + '" loading="lazy" alt="' + esc(p.name) + ' in ' + esc(p.city) + '">' +
        '<span class="pf2-badge">' + esc(p.city) + '</span>' + kind + '</div>' +
        '<div class="pf2-proj-body"><h3>' + esc(p.name) + '</h3><p>' + esc(p.summary) + '</p>' +
        '<span class="pf2-link">See the project ' + ARROW + '</span></div></a>';
    }).join('');
    paint(
      navBar({
        backHref: '#/', backLabel: 'All services',
        crumb: '<a href="#/">Portfolio</a><span>›</span><b>' + esc(c.title) + '</b>'
      }) +
      '<div class="pf2-lead left"><div class="eyebrow">' + c.count + ' projects</div>' +
      '<h2>' + esc(c.title) + '</h2><p class="lead">' + esc(c.tag) + '. Choose a project by region to see how it was done.</p></div>' +
      '<div class="pf2-chips">' + chips + '</div>' +
      '<div class="pf2-grid">' + grid + '</div>' +
      '<div class="pf2-backrow"><a class="pf2-back" href="#/">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> All services</a></div>',
      c.title + ' Portfolio | Innov Builders',
      'cat'
    );
    // region filter (client-side, no hash change)
    var chipEls = app.querySelectorAll('.pf2-chip');
    var projEls = app.querySelectorAll('.pf2-proj');
    chipEls.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chipEls.forEach(function (x) { x.classList.remove('active'); });
        chip.classList.add('active');
        var r = chip.getAttribute('data-region');
        projEls.forEach(function (el) {
          el.style.display = (r === 'all' || el.getAttribute('data-region') === r) ? '' : 'none';
        });
      });
    });
  }

  function resultBlock(photos, text) {
    var gi = grp(photos);
    var thumbs = photos.slice(1).map(function (src, i) { return shot(gi, i + 1, src, 'sm'); }).join('');
    return '<div class="pf2-result">' +
      '<div class="pf2-result-media">' + shot(gi, 0, photos[0], 'big') + '<span class="pf2-result-tag">Finished result</span></div>' +
      '<div class="pf2-result-body"><div class="eyebrow">The result</div>' +
      '<h3>What you get</h3><p>' + esc(text) + '</p>' +
      (thumbs ? '<div class="pf2-thumbs">' + thumbs + '</div>' : '') +
      '<a class="btn btn--gold" href="../contacts/">Get a result like this ' + ARROW + '</a></div></div>';
  }

  function viewProject(slug, pslug) {
    GROUPS = [];
    var c = BYCAT[slug];
    if (!c) return viewHome();
    var idx = -1;
    c.projects.forEach(function (p, i) { if (p.slug === pslug) idx = i; });
    if (idx < 0) return viewCategory(slug);
    var p = c.projects[idx];
    var prev = c.projects[(idx - 1 + c.projects.length) % c.projects.length];
    var next = c.projects[(idx + 1) % c.projects.length];

    // finished-result gallery = the after/final photos + (when present) the project video as a tile
    function withVideo(photos) {
      var media = (photos || []).slice();
      if (p.video) media.push({ video: p.video.src, poster: p.video.poster });
      return media;
    }

    var body = '';
    if (p.kind === 'process') {
      // steps: before + during, then the finished result as the hero
      var steps = p.stages.filter(function (s) { return s.key !== 'after'; });
      var after = p.stages.filter(function (s) { return s.key === 'after'; })[0] || p.stages[p.stages.length - 1];
      var stepsHtml = steps.map(function (s, n) {
        var gi = grp(s.photos);
        var shots = s.photos.map(function (src, i) { return shot(gi, i, src, ''); }).join('');
        return '<div class="pf2-step">' +
          '<div class="pf2-step-mark"><span>' + (n + 1) + '</span></div>' +
          '<div class="pf2-step-body"><div class="pf2-step-label">' + esc(s.label) + '</div>' +
          '<p>' + esc(s.text) + '</p><div class="pf2-shots">' + shots + '</div></div></div>';
      }).join('');
      body = '<div class="pf2-timeline"><div class="pf2-timeline-head"><span class="pf2-step-tag">The process</span>' +
        '<h3>From first measurement to finished result</h3></div>' + stepsHtml + '</div>' +
        resultBlock(withVideo(after.photos), after.text);
    } else {
      body = resultBlock(withVideo(p.final.photos), p.final.text);
    }

    var stepper = c.projects.length > 1
      ? '<div class="pf2-stepper">' +
          '<a class="pf2-stepper-arrow" href="#/s/' + c.slug + '/p/' + prev.slug + '" aria-label="Previous project">' + CHEV_L + '</a>' +
          '<span class="pf2-stepper-count"><b>' + (idx + 1) + '</b> / ' + c.projects.length + '</span>' +
          '<a class="pf2-stepper-arrow" href="#/s/' + c.slug + '/p/' + next.slug + '" aria-label="Next project">' + CHEV_R + '</a>' +
        '</div>'
      : '';

    paint(
      navBar({
        backHref: '#/s/' + c.slug, backLabel: 'All ' + c.title,
        crumb: '<a href="#/">Portfolio</a><span>›</span><a href="#/s/' + c.slug + '">' + esc(c.title) + '</a><span>›</span><b>' + esc(p.name) + '</b>',
        stepper: stepper
      }) +
      '<div class="pf2-detail-head"><div class="pf2-detail-meta"><span class="pf2-badge dark">' + esc(p.city) + '</span>' +
      '<a class="pf2-tag" href="#/s/' + c.slug + '">' + esc(c.title) + '</a></div>' +
      '<h2>' + esc(p.name) + '</h2><p class="lead">' + esc(p.summary) + '</p></div>' +
      body +
      '<div class="pf2-projnav">' +
      '<a class="pf2-projnav-btn" href="#/s/' + c.slug + '/p/' + prev.slug + '"><span>Previous</span><b>' + esc(prev.name) + '</b></a>' +
      '<a class="pf2-back" href="#/s/' + c.slug + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg> All ' + esc(c.title) + '</a>' +
      '<a class="pf2-projnav-btn right" href="#/s/' + c.slug + '/p/' + next.slug + '"><span>Next</span><b>' + esc(next.name) + '</b></a>' +
      '</div>',
      p.name + ' - ' + p.city + ' | Innov Builders',
      'proj'
    );
  }

  /* ---------------- router ---------------- */
  function render() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean); // ['s', catSlug, 'p', projSlug]
    if (parts[0] === 's' && parts[1]) {
      if (parts[2] === 'p' && parts[3]) viewProject(parts[1], parts[3]);
      else viewCategory(parts[1]);
    } else {
      viewHome();
    }
  }
  window.addEventListener('hashchange', render);
  render();
})();
