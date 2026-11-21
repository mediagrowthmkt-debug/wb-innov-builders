/* Innov Builders — Cost Calculator (estimate only). Config: <script id="cc-data" type="application/json"> */
(function(){
  'use strict';

  function el(tag, attrs, html){
    var n = document.createElement(tag);
    if(attrs){ for(var k in attrs){ if(attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); } }
    if(html !== undefined) n.innerHTML = html;
    return n;
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(v){ return '$' + Math.round(v).toLocaleString('en-US'); }
  function roundRange(lo, hi){
    var step = hi < 20000 ? 500 : 1000;
    return [Math.floor(lo/step)*step, Math.ceil(hi/step)*step];
  }
  function sizeFactor(size, v){
    if(!size || !size.factors) return 1;
    for(var i=0;i<size.factors.length;i++){ if(v <= size.factors[i].max) return size.factors[i].factor; }
    return 1;
  }

  function computeEstimate(cfg, svc, st){
    var band = cfg.level_bands[st.level] || [0,1];
    var lo = 0, hi = 0, plus = false;
    var sqft = st.size || (svc.size ? svc.size.default : 0);
    if(svc.mode === 'tiers'){
      var t = svc.tiers[st.level];
      var f = sizeFactor(svc.size, sqft);
      lo = t.range[0]*f; hi = t.range[1]*f; plus = !!t.plus;
    } else if(svc.mode === 'types'){
      var ty = svc.types.filter(function(x){ return x.id === (st.type || svc.default_type); })[0] || svc.types[0];
      var span = ty.range[1]-ty.range[0];
      lo = ty.range[0] + span*band[0]; hi = ty.range[0] + span*band[1];
      var f2 = sizeFactor(svc.size, sqft);
      var q = svc.qty ? (st.qty || 1) : 1;
      lo *= f2*q; hi *= f2*q;
      plus = !!ty.plus && st.level === 'high';
    } else if(svc.mode === 'per_sqft'){
      var p = svc.per_sqft[st.level];
      lo = sqft*p.range[0]; hi = sqft*p.range[1];
    } else if(svc.mode === 'per_sqft_band'){
      var r = svc.per_sqft_range, sp = r[1]-r[0];
      lo = sqft*(r[0]+sp*band[0]); hi = sqft*(r[0]+sp*band[1]);
      if(svc.min_total){ lo = Math.max(lo, svc.min_total[0]); hi = Math.max(hi, svc.min_total[1]); }
    }
    (svc.addons || []).forEach(function(a){ if(st.addons[a.id]){ lo += a.range[0]; hi += a.range[1]; } });
    var rr = roundRange(lo, hi);
    return {lo: rr[0], hi: rr[1], plus: plus};
  }

  function levelDesc(svc, level){
    if(svc.tiers) return svc.tiers[level].desc;
    if(svc.per_sqft) return svc.per_sqft[level].desc;
    return (svc.level_desc || {})[level] || '';
  }

  function init(root){
    var dataEl = document.getElementById('cc-data');
    if(!dataEl) return;
    var cfg = JSON.parse(dataEl.textContent);
    var dry = root.getAttribute('data-dry') === '1';
    var source = root.getAttribute('data-source') || '';
    var gate = cfg.lead_gate || 'reveal';
    var svcs = cfg.services;
    var byKey = {}; svcs.forEach(function(s){ byKey[s.key] = s; });

    var params = new URLSearchParams(location.search);
    var st = {svc: byKey[params.get('s')] ? params.get('s') : null, level: 'mid', size: null, type: null, qty: 1, addons: {}, quals: {}};
    var step = st.svc ? 1 : 0;
    var unlocked = false;

    var stepsEl = root.querySelector('[data-cc-steps]');
    var bodyEl = root.querySelector('[data-cc-body]');

    function svc(){ return byKey[st.svc]; }

    function setStep(i){
      step = i;
      [].forEach.call(stepsEl.querySelectorAll('.cc-dot'), function(d, n){
        d.classList.toggle('active', n === i); d.classList.toggle('done', n < i);
      });
      render();
      var top = root.getBoundingClientRect().top + window.pageYOffset - 110;
      if(Math.abs(window.pageYOffset - top) > 240){ window.scrollTo({top: top, behavior: 'smooth'}); }
    }

    function nav(prev, nextLabel){
      var w = el('div', {'class':'cc-nav'});
      if(prev){ var b = el('button', {type:'button','class':'btn btn--dark cc-prev'}, 'Back'); b.addEventListener('click', function(){ setStep(step-1); }); w.appendChild(b); }
      if(nextLabel){ var n = el('button', {type:'button','class':'btn btn--gold cc-next'}, esc(nextLabel)); n.addEventListener('click', function(){ setStep(step+1); }); w.appendChild(n); }
      return w;
    }

    function renderServices(){
      var wrap = el('div', {'class':'cc-panel'});
      wrap.appendChild(el('h3', {'class':'cc-q'}, 'What are you planning?'));
      var grid = el('div', {'class':'cc-grid'});
      svcs.forEach(function(s){
        var b = el('button', {type:'button','class':'cc-card' + (st.svc === s.key ? ' sel' : ''), 'data-key': s.key}, '<b>' + esc(s.name) + '</b>');
        b.addEventListener('click', function(){
          if(st.svc !== s.key){ st.svc = s.key; st.size = null; st.type = null; st.qty = 1; st.addons = {}; st.quals = {}; }
          setStep(1);
        });
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
      wrap.appendChild(el('p', {'class':'cc-small'}, 'Not on the list? <a href="#" data-quote-open>Request a free quote</a> and tell us about it.'));
      return wrap;
    }

    function selectField(q){
      var f = el('div', {'class':'cc-field'});
      f.appendChild(el('label', {'class':'cc-label'}, esc(q.label)));
      var chips = el('div', {'class':'cc-chips'});
      var hint = el('p', {'class':'cc-hint'});
      function paintHint(){
        var h = q.hint_if && q.hint_if[st.quals[q.id]];
        hint.textContent = h || ''; hint.hidden = !h;
      }
      q.options.forEach(function(o){
        var c = el('button', {type:'button','class':'cc-chip' + (st.quals[q.id] === o ? ' sel' : '')}, esc(o));
        c.addEventListener('click', function(){
          st.quals[q.id] = o;
          [].forEach.call(chips.children, function(x){ x.classList.remove('sel'); });
          c.classList.add('sel'); paintHint();
        });
        chips.appendChild(c);
      });
      f.appendChild(chips); f.appendChild(hint); paintHint();
      return f;
    }

    function renderDetails(){
      var s = svc();
      var wrap = el('div', {'class':'cc-panel'});
      wrap.appendChild(el('h3', {'class':'cc-q'}, esc(s.name) + ': tell us the basics'));
      if(s.types){
        if(!st.type) st.type = s.default_type || s.types[0].id;
        var f = el('div', {'class':'cc-field'});
        f.appendChild(el('label', {'class':'cc-label'}, esc(s.type_label || 'Project type')));
        var list = el('div', {'class':'cc-options'});
        s.types.forEach(function(t){
          var o = el('button', {type:'button','class':'cc-opt' + (st.type === t.id ? ' sel' : '')},
            '<span>' + esc(t.label) + '</span>' + (t.note ? '<small>' + esc(t.note) + '</small>' : ''));
          o.addEventListener('click', function(){
            st.type = t.id;
            [].forEach.call(list.children, function(x){ x.classList.remove('sel'); });
            o.classList.add('sel');
          });
          list.appendChild(o);
        });
        f.appendChild(list); wrap.appendChild(f);
      }
      if(s.size){
        if(!st.size) st.size = s.size.default;
        var fs = el('div', {'class':'cc-field'});
        fs.appendChild(el('label', {'class':'cc-label', 'for':'cc-size'}, esc(s.size.label)));
        var row = el('div', {'class':'cc-size'});
        var range = el('input', {type:'range', min:s.size.min, max:s.size.max, step:s.size.step, value:st.size, 'aria-label': s.size.label});
        var num = el('input', {type:'number', id:'cc-size', min:s.size.min, max:s.size.max, step:s.size.step, value:st.size, inputmode:'numeric'});
        var unit = el('span', {'class':'cc-unit'}, esc(s.size.unit));
        function sync(v, from){
          v = Math.max(s.size.min, Math.min(s.size.max, parseInt(v, 10) || s.size.default));
          st.size = v; if(from !== range) range.value = v; if(from !== num) num.value = v;
        }
        range.addEventListener('input', function(){ sync(range.value, range); });
        num.addEventListener('change', function(){ sync(num.value, num); });
        row.appendChild(range); row.appendChild(num); row.appendChild(unit);
        fs.appendChild(row);
        if(s.size.hint) fs.appendChild(el('p', {'class':'cc-small'}, esc(s.size.hint)));
        wrap.appendChild(fs);
      }
      if(s.qty){
        var fq = el('div', {'class':'cc-field'});
        fq.appendChild(el('label', {'class':'cc-label', 'for':'cc-qty'}, esc(s.qty.label)));
        var qn = el('input', {type:'number', id:'cc-qty', 'class':'cc-qty', min:s.qty.min, max:s.qty.max, value:st.qty, inputmode:'numeric'});
        qn.addEventListener('change', function(){ st.qty = Math.max(s.qty.min, Math.min(s.qty.max, parseInt(qn.value, 10) || 1)); qn.value = st.qty; });
        fq.appendChild(qn); wrap.appendChild(fq);
      }
      (s.qualifiers || []).forEach(function(q){ wrap.appendChild(selectField(q)); });
      if(s.addons && s.addons.length){
        var fa = el('div', {'class':'cc-field'});
        fa.appendChild(el('label', {'class':'cc-label'}, 'Add-ons (optional)'));
        s.addons.forEach(function(a){
          var lab = el('label', {'class':'cc-check'});
          var cb = el('input', {type:'checkbox'});
          cb.checked = !!st.addons[a.id];
          cb.addEventListener('change', function(){ st.addons[a.id] = cb.checked; });
          lab.appendChild(cb); lab.appendChild(el('span', null, esc(a.label)));
          fa.appendChild(lab);
        });
        wrap.appendChild(fa);
      }
      wrap.appendChild(nav(true, 'Next: finish level'));
      return wrap;
    }

    function renderLevel(){
      var s = svc();
      var wrap = el('div', {'class':'cc-panel'});
      wrap.appendChild(el('h3', {'class':'cc-q'}, 'Choose your finish level'));
      var grid = el('div', {'class':'cc-levels'});
      ['standard','mid','high'].forEach(function(l){
        var b = el('button', {type:'button','class':'cc-level' + (st.level === l ? ' sel' : '')},
          '<b>' + esc(cfg.level_labels[l]) + '</b><span>' + esc(levelDesc(s, l)) + '</span>');
        b.addEventListener('click', function(){
          st.level = l;
          [].forEach.call(grid.children, function(x){ x.classList.remove('sel'); });
          b.classList.add('sel');
        });
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
      var w = nav(true, null);
      var go = el('button', {type:'button','class':'btn btn--gold cc-next'}, 'See my estimate');
      go.addEventListener('click', function(){
        var e = computeEstimate(cfg, s, st);
        try{ (window.dataLayer = window.dataLayer || []).push({event:'cost_calculator_estimate', cc_service:s.key, cc_level:st.level, cc_low:e.lo, cc_high:e.hi}); }catch(_){}
        setStep(3);
      });
      w.appendChild(go); wrap.appendChild(w);
      return wrap;
    }

    function summaryLines(s, e){
      var lines = ['Service: ' + s.name];
      if(s.types){ var t = s.types.filter(function(x){ return x.id === st.type; })[0]; if(t) lines.push('Type: ' + t.label); }
      if(s.size) lines.push('Size: ' + st.size + ' ' + s.size.unit);
      if(s.qty) lines.push('Pieces: ' + st.qty);
      lines.push('Finish level: ' + cfg.level_labels[st.level]);
      (s.qualifiers || []).forEach(function(q){ if(st.quals[q.id]) lines.push(q.label + ' ' + st.quals[q.id]); });
      var ad = (s.addons || []).filter(function(a){ return st.addons[a.id]; }).map(function(a){ return a.label; });
      if(ad.length) lines.push('Add-ons: ' + ad.join(', '));
      lines.push('Estimated range: ' + money(e.lo) + ' - ' + money(e.hi) + (e.plus ? '+' : ''));
      return lines;
    }

    function leadForm(s, e, onDone){
      var f = el('form', {'class':'cc-form', novalidate:''});
      f.innerHTML =
        '<input type="text" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" title="Leave empty">' +
        '<div class="cc-form-grid">' +
        '<label class="visually-hidden" for="cc-name">Name</label><input id="cc-name" name="name" class="stepinput" required placeholder="Name" autocomplete="name">' +
        '<label class="visually-hidden" for="cc-email">Email</label><input id="cc-email" name="email" type="email" class="stepinput" required placeholder="Email" autocomplete="email">' +
        '<label class="visually-hidden" for="cc-phone">Phone</label><input id="cc-phone" name="phone" type="tel" class="stepinput" required placeholder="Phone" autocomplete="tel">' +
        '<label class="visually-hidden" for="cc-zip">Zip Code</label><input id="cc-zip" name="zip" class="stepinput" required placeholder="Zip Code" autocomplete="postal-code" inputmode="numeric">' +
        '</div>' +
        '<label class="stepconsent"><input type="checkbox" name="sms_consent" required><span>I agree to receive SMS messages from Innov Builders Corp related to appointments, estimates, project updates, customer support, and occasional marketing or promotional offers. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for assistance.</span></label>' +
        '<button type="submit" class="btn btn--gold cc-submit">' + (gate === 'reveal' && !unlocked ? 'Show my estimate' : 'Book my on-site visit') + '</button>' +
        '<p class="cc-err" hidden></p>';
      f.addEventListener('submit', function(ev){
        ev.preventDefault();
        var fields = f.querySelectorAll('input[required]');
        for(var i=0;i<fields.length;i++){ if(!fields[i].checkValidity()){ fields[i].reportValidity(); return; } }
        var btn = f.querySelector('.cc-submit'); btn.disabled = true;
        var lines = summaryLines(s, e);
        var fd = new FormData(f);
        fd.append('service', s.lead_service);
        fd.append('message', 'Cost calculator estimate\n' + lines.join('\n'));
        fd.append('calc', lines.join(' | '));
        if(source) fd.append('source', source);
        var from = params.get('from');
        fd.append('page', location.href + (from && location.href.indexOf('from=') < 0 ? (' (from ' + from + ')') : ''));
        function ok(){
          try{ (window.dataLayer = window.dataLayer || []).push({event:'cost_calculator_lead', cc_service:s.key, cc_level:st.level, cc_low:e.lo, cc_high:e.hi}); }catch(_){}
          if(!dry && window.mgLeadConv) window.mgLeadConv(fd);
          onDone(true);
        }
        function fail(){
          btn.disabled = false;
          var er = f.querySelector('.cc-err');
          er.innerHTML = 'Sorry, we could not send your request right now. Please call <a href="tel:' + root.getAttribute('data-tel') + '">' + esc(root.getAttribute('data-phone')) + '</a> or try again.';
          er.hidden = false;
        }
        if(window.mgAttrAppend) window.mgAttrAppend(fd);
        if(dry){
          var dbg = root.querySelector('[data-cc-debug]');
          if(dbg){ var o = {}; fd.forEach(function(v,k){ o[k] = v; }); dbg.textContent = 'PREVIEW (nada enviado ao GHL). Payload para /api/lead.php:\n' + JSON.stringify(o, null, 2); dbg.hidden = false; }
          ok(); return;
        }
        fetch(root.getAttribute('data-endpoint') || '/api/lead.php', {method:'POST', body:fd})
          .then(function(r){ return r.json().catch(function(){ return {ok:false}; }); })
          .then(function(res){ if(res && res.ok) ok(); else fail(); })
          .catch(fail);
      });
      return f;
    }

    function renderResult(){
      var s = svc();
      var e = computeEstimate(cfg, s, st);
      var wrap = el('div', {'class':'cc-panel cc-result'});
      var locked = gate === 'reveal' && !unlocked;
      wrap.appendChild(el('div', {'class':'eyebrow'}, 'Your ' + esc(s.name.toLowerCase()) + ' estimate'));
      var amt = el('div', {'class':'cc-amount' + (locked ? ' locked' : '')},
        '<span class="cc-range">' + money(e.lo) + ' <i>to</i> ' + money(e.hi) + (e.plus ? '+' : '') + '</span>' +
        (locked ? '<span class="cc-lock">Your range is ready</span>' : ''));
      wrap.appendChild(amt);
      var det = el('ul', {'class':'cc-summary'});
      summaryLines(s, e).slice(0, -1).forEach(function(l){ det.appendChild(el('li', null, esc(l))); });
      wrap.appendChild(det);
      wrap.appendChild(el('p', {'class':'cc-disclaimer'},
        '<b>Estimate only.</b> This range is a planning guide based on typical Greater Boston projects. Your final price is confirmed in a written quote after a free on-site visit, since layout, site conditions, permits and material choices change the number.'));

      var box = el('div', {'class':'cc-lead'});
      if(locked){
        box.appendChild(el('h3', null, 'Where should we send your estimate?'));
        box.appendChild(el('p', {'class':'cc-small'}, 'Unlock your range now. A project manager will follow up to turn it into a firm, written quote. No pressure, no obligation.'));
      } else {
        box.appendChild(el('h3', null, 'Turn this range into a real number'));
        box.appendChild(el('p', {'class':'cc-small'}, 'Book a free on-site visit. We measure, talk options and send a written quote you can plan around.'));
      }
      box.appendChild(leadForm(s, e, function(){
        unlocked = true;
        amt.classList.remove('locked');
        var lk = amt.querySelector('.cc-lock'); if(lk) lk.remove();
        box.innerHTML = '<div class="cc-done"><b>Thank you!</b> We received your estimate request. A project manager will reach out shortly to schedule your free on-site visit.</div>';
      }));
      wrap.appendChild(box);
      if(s.guide) wrap.appendChild(el('p', {'class':'cc-small'}, 'Want to understand what moves the price? <a href="' + esc(s.guide) + '">Read our cost guide</a>.'));
      var w = nav(true, null);
      var again = el('button', {type:'button','class':'btn btn--ghost cc-again'}, 'Start over');
      again.addEventListener('click', function(){ st.svc = null; unlocked = false; setStep(0); });
      w.appendChild(again); wrap.appendChild(w);
      return wrap;
    }

    function render(){
      bodyEl.innerHTML = '';
      if(step === 0 || !svc()) { step = 0; bodyEl.appendChild(renderServices()); }
      else if(step === 1) bodyEl.appendChild(renderDetails());
      else if(step === 2) bodyEl.appendChild(renderLevel());
      else bodyEl.appendChild(renderResult());
      [].forEach.call(stepsEl.querySelectorAll('.cc-dot'), function(d, n){
        d.classList.toggle('active', n === step); d.classList.toggle('done', n < step);
      });
      var qo = bodyEl.querySelectorAll('[data-quote-open]');
      [].forEach.call(qo, function(a){ a.addEventListener('click', function(ev){ var m = document.getElementById('quote-modal'); if(m){ ev.preventDefault(); m.classList.add('open'); m.setAttribute('aria-hidden','false'); document.body.classList.add('qmodal-lock'); } }); });
    }
    render();
  }

  document.addEventListener('DOMContentLoaded', function(){
    var r = document.querySelector('[data-cost-calc]');
    if(r) init(r);
  });
})();
