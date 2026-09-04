import { animate, createTimeline, utils } from 'animejs';
import { initAmbientPlate } from './ambient-plate.js';
import { initIvyGrowth } from './ivy-growth.js';

(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize Ambient Shader Plate and Botanical Ivy Growth Engine
  initAmbientPlate();
  initIvyGrowth();

  /* ---------- mobile menu (simple show/hide of nav as list) ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var nav = document.querySelector('nav.primary-nav');
  menuToggle && menuToggle.addEventListener('click', function(){
    if(nav.style.display === 'flex'){ nav.style.display=''; }
    else{ nav.style.cssText='display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;background:var(--paper);padding:16px 24px;border-bottom:1px solid var(--line);gap:16px;'; }
  });

  /* ---------- hero illustrated clip sequence ----------
     4 frames slide up and fade in sequence: seed → watering → sapling → canopy.
     Exiting frame gets .exiting (slides down + fades); entering frame gets
     .active (slides up from +18px + fades in). Single consistent direction. */
  function initHeroClips(){
    var clips = Array.from(document.querySelectorAll('.hero-clip'));
    if(!clips.length) return;
    var badge = document.getElementById('heroClipBadge');
    var badgeText = badge ? badge.querySelector('.stage-text') : null;
    var captions = [
      'an idea, unplanted',
      'the right connection arrives',
      'building together',
      'shipped under one canopy'
    ];
    var durations = [2400, 2800, 3200, 5000];
    var current = 0;
    clips[0].classList.add('active');

    function advance(){
      var leaving = clips[current];
      leaving.classList.remove('active');
      leaving.classList.add('exiting');
      // Clean up exiting class after transition completes
      setTimeout(function(){ leaving.classList.remove('exiting'); }, 520);

      current = (current + 1) % clips.length;
      clips[current].classList.add('active');

      if(badgeText){
        badge.style.opacity = '0';
        badge.style.transform = 'translateY(4px)';
        setTimeout(function(){
          badgeText.textContent = captions[current];
          badge.style.opacity = '1';
          badge.style.transform = 'translateY(0)';
        }, 220);
      }

      setTimeout(advance, durations[current]);
    }
    setTimeout(advance, durations[0]);
  }
  initHeroClips();

  /* ---------- hero copy — staggered line entrance on load ---------- */
  function initHeroCopy(){
    if(reduced) return;
    var heroLeft = document.querySelector('.hero-grid > div:first-child');
    if(!heroLeft) return;
    var els = [
      heroLeft.querySelector('.eyebrow'),
      heroLeft.querySelector('h1'),
      heroLeft.querySelector('.hero-sub'),
      heroLeft.querySelector('.hero-sub + .hero-sub') || heroLeft.querySelectorAll('.hero-sub')[1],
      heroLeft.querySelector('.hero-hook'),
      heroLeft.querySelector('.hero-ctas')
    ].filter(Boolean);

    els.forEach(function(el){ el.style.opacity = '0'; });

    var delays = [80, 200, 360, 440, 560, 680];
    els.forEach(function(el, i){
      animate(el, {
        opacity: [0, 1],
        y: [i < 2 ? 24 : 16, 0],
        duration: i < 2 ? 620 : 520,
        delay: delays[i],
        ease: 'outCubic'
      });
    });
  }
  initHeroCopy();

  /* ---------- stat number tickers — easeOutExpo deceleration ---------- */
  function easeOutExpo(t){ return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function tickStat(el){
    if(el.dataset.ticked) return;
    el.dataset.ticked = '1';
    var target = parseInt(el.dataset.target, 10);
    if(!target) return;
    var dur = 1400;
    var start = performance.now();
    function frame(now){
      var t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(easeOutExpo(t) * target);
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var statEls = document.querySelectorAll('.stat-num[data-target]');
  if(statEls.length && 'IntersectionObserver' in window){
    var statIO = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting) tickStat(e.target); });
    }, { threshold: .5 });
    statEls.forEach(function(el){ statIO.observe(el); });
  }

  /* ---------- reveal on scroll ---------- */
  function tiltOf(el){
    var v = getComputedStyle(el).getPropertyValue('--tilt');
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function revealEl(el, stagger){
    if(el.classList.contains('in-view')) return;
    el.classList.add('in-view');
    if(reduced) return;
    var delay = stagger || 0;
    if(el.classList.contains('vine-note')){
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      var rot = idx % 2 === 0 ? -1.2 : 1.2;
      animate(el, { opacity:[0,1], y:[24,0], rotate:[rot*2.4, rot],
        duration:650, delay:delay, ease:'outCubic' });
    } else {
      var tilt = tiltOf(el);
      animate(el, { opacity:[0,1], y:[22,0], rotate:[tilt*2.4, tilt],
        duration:600, delay:delay, ease:'outCubic' });
    }
  }
  var revealEls = document.querySelectorAll('.reveal, .vine-note');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      var batch = entries.filter(function(e){ return e.isIntersecting; });
      batch.forEach(function(e, i){ revealEl(e.target, Math.min(i, 6) * 35); });
    }, { threshold: 0.01, rootMargin: '60px 0px 60px 0px' });
    revealEls.forEach(function(el){
      var rect = el.getBoundingClientRect();
      if(rect.top < window.innerHeight + 100){
        revealEl(el, 0);
      } else {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- page fade transitions ---------- */
  document.body.classList.add('page-entering');
  setTimeout(function(){ document.body.classList.remove('page-entering'); }, 320);

  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href]');
    if(!a) return;
    var href = a.getAttribute('href');
    // Only fade for same-origin page navigations (not anchors, not external)
    if(!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http') || a.target === '_blank') return;
    
    // Check if link points to an anchor on the current page
    try {
      var targetUrl = new URL(a.href, window.location.href);
      if(targetUrl.origin === window.location.origin && targetUrl.pathname === window.location.pathname && targetUrl.hash){
        return; // Allow smooth anchor scroll without page reload
      }
    } catch(err){}

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(function(){ window.location.href = href; }, 210);
  });

  /* ---------- tick / cross deck ----------
     only present on the homepage — Sprint and Lab Notebook don't have it, so
     the whole block is gated on deckCard existing rather than assuming it. */
  var deckCard = document.getElementById('deckCard');
  if(deckCard){
    var problems = [
      {tag:'Domain · Water', title:'Build a low-cost sensor to flag groundwater contamination in real time.', reward:'Reward: ₹150,000 pilot budget + open dataset access'},
      {tag:'Domain · Energy', title:'Design a dashboard that helps rural microgrids predict demand a day ahead.', reward:'Reward: paid 6-week pilot with a state energy board'},
      {tag:'Domain · Biodiversity', title:'Train a lightweight model to ID invasive species from camera-trap photos.', reward:'Reward: open-source credit + conference travel grant'},
      {tag:'Domain · Civic Tech', title:'Prototype a plain-language explainer for municipal budget documents.', reward:'Reward: ₹80,000 cash prize'},
      {tag:'Domain · Health', title:'Build a triage chatbot for a rural clinic network with patchy connectivity.', reward:'Reward: paid pilot + clinic deployment credit'}
    ];
    var di = 0, ticks=0, crosses=0;
    var elTag = document.getElementById('deckTagLabel');
    var elTitle = document.getElementById('deckTitle');
    var elReward = document.getElementById('deckReward');
    var tickCountEl = document.getElementById('tickCount');
    var crossCountEl = document.getElementById('crossCount');

    var paintDeck = function(){
      var p = problems[di % problems.length];
      elTag.textContent = p.tag;
      elTitle.textContent = p.title;
      elReward.textContent = p.reward;
    };
    paintDeck();

    var deckBusy = false;
    var swipe = function(dir){
      if(deckBusy) return;
      if(dir==='check') ticks++; else crosses++;
      tickCountEl.textContent = ticks; crossCountEl.textContent = crosses;

      if(reduced){
        di++; paintDeck();
        return;
      }
      deckBusy = true;
      var toX = dir==='check' ? '120%' : '-120%';
      var toRotate = dir==='check' ? 10 : -10;
      animate(deckCard, {
        x:toX, rotate:toRotate, opacity:0,
        duration:420, ease:'outQuad',
        onComplete:function(){
          di++; paintDeck();
          utils.set(deckCard, { x:0, rotate:0, scale:.92, opacity:0 });
          animate(deckCard, {
            scale:1, opacity:1,
            duration:520, ease:'outBack',
            onComplete:function(){ deckBusy = false; }
          });
        }
      });
    };
    document.getElementById('deckCheck').addEventListener('click', function(){ swipe('check'); });
    document.getElementById('deckCross').addEventListener('click', function(){ swipe('cross'); });
  }

  /* ---------- keychain charms ----------
     the expand/collapse is pure CSS now (grid-template-rows in style.css) —
     it used to tween height/margin directly via anime.js, which are layout
     properties and repaint every frame instead of compositing on the GPU. */
  document.querySelectorAll('[data-charm]').forEach(function(ch){
    function toggle(){ ch.classList.toggle('open'); }
    ch.addEventListener('click', toggle);
    ch.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
  });

  /* ---------- for-tabs (persona cards) ---------- */
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.setAttribute('aria-selected','false'); });
      btn.setAttribute('aria-selected','true');
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.persona-card').forEach(function(card){
        var isActive = card.getAttribute('data-persona') === target;
        card.setAttribute('data-active', isActive ? 'true' : 'false');
      });
    });
  });

  /* ---------- apply modal ---------- */
  var modal = document.getElementById('applyModal');
  function openModal(){
    if(!modal) return;
    if(typeof modal.showModal==='function'){ modal.showModal(); } else { modal.setAttribute('open',''); }
    modal.classList.remove('closing');
    requestAnimationFrame(function(){ modal.classList.add('is-open'); });
  }
  function closeModal(){
    if(!modal || (!modal.classList.contains('is-open') && !modal.hasAttribute('open'))) return;
    modal.classList.remove('is-open');
    var finish = function(){
      modal.classList.remove('closing');
      if(typeof modal.close==='function'){ modal.close(); } else { modal.removeAttribute('open'); }
    };
    if(reduced){ finish(); return; }
    modal.classList.add('closing');
    setTimeout(finish, 160);
  }
  ['openApply','openApplyGhost','heroApply','finaleApply','openApplySprint','openApplyNotebook','openApplyMatch'].forEach(function(id){
    var el = document.getElementById(id);
    el && el.addEventListener('click', openModal);
  });
  var closeApplyBtn = document.getElementById('closeApply');
  closeApplyBtn && closeApplyBtn.addEventListener('click', closeModal);
  var notYetBtn = document.getElementById('notYet');
  notYetBtn && notYetBtn.addEventListener('click', function(){ showToast("no rush — the sapling will still be here."); });
  modal && modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

  /* ---------- application drawer (bottom sheet for shovel / build calls) ---------- */
  var drawer = document.getElementById('appDrawer');
  var drawerBackdrop = document.getElementById('drawerBackdrop');
  var drawerClose = document.getElementById('closeDrawer');
  var drawerTitle = document.getElementById('drawerTitle');
  var drawerSub = document.getElementById('drawerSub');

  function openDrawer(callTitle, callDomain){
    if(!drawer || !drawerBackdrop) { openModal(); return; }
    if(callTitle && drawerTitle) drawerTitle.textContent = callTitle;
    if(callDomain && drawerSub) drawerSub.textContent = callDomain;
    drawerBackdrop.classList.add('is-open');
    drawer.classList.remove('closing');
    requestAnimationFrame(function(){ drawer.classList.add('is-open'); });
  }
  function closeDrawer(){
    if(!drawer || !drawerBackdrop) return;
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    drawer.classList.add('closing');
    setTimeout(function(){ drawer.classList.remove('closing'); }, 240);
  }
  drawerClose && drawerClose.addEventListener('click', closeDrawer);
  drawerBackdrop && drawerBackdrop.addEventListener('click', closeDrawer);

  var drawerForm = document.getElementById('appDrawerForm');
  drawerForm && drawerForm.addEventListener('submit', function(e){
    e.preventDefault();
    var note = this.querySelector('textarea') ? this.querySelector('textarea').value : '';
    try {
      sessionStorage.setItem('canopy_draft_note', note);
    } catch(err){}
    closeDrawer();
    var isNotebook = window.location.pathname.indexOf('notebook') !== -1 || (drawerTitle && drawerTitle.textContent.indexOf('Notebook') !== -1);
    var toastMsg = isNotebook 
      ? '🌱 Entry planted in your Lab Notebook — grown into the Library.'
      : '🌱 Shovel note planted — sent to the project poster.';
    showToast(toastMsg);
    this.reset();
  });

  /* pill groups */
  document.querySelectorAll('.pill-group').forEach(function(group){
    var single = group.getAttribute('data-single') === 'true';
    group.querySelectorAll('.pill').forEach(function(pill){
      pill.addEventListener('click', function(){
        if(single){
          group.querySelectorAll('.pill').forEach(function(p){ p.setAttribute('aria-pressed','false'); });
          pill.setAttribute('aria-pressed','true');
        } else {
          pill.setAttribute('aria-pressed', pill.getAttribute('aria-pressed')==='true' ? 'false':'true');
        }
      });
    });
  });

  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    if(!toast) return;
    toast.textContent = msg || '🌱 Application planted — we\'ll be in touch soon.';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 3200);
  }

  var applyForm = document.getElementById('applyForm');
  applyForm && applyForm.addEventListener('submit', function(e){
    e.preventDefault();
    closeModal();
    showToast();
    this.reset();
    document.querySelectorAll('.pill').forEach(function(p){ p.setAttribute('aria-pressed','false'); });
  });


  /* ---------- workspace pages (Match / Sprint / Lab Notebook) ---------- */
  function hashStr(str){
    var h = 0;
    for(var i=0; i<str.length; i++){ h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }
  var avatarPalettes = [
    ['var(--leaf)','var(--forest-deep)'],
    ['var(--coral)','var(--twine)'],
    ['var(--sun)','var(--forest)'],
    ['var(--leaf-bright)','var(--forest-deep)'],
    ['var(--forest)','var(--sun)'],
    ['var(--twine)','var(--leaf)'],
    ['var(--teal)','var(--forest-deep)'],
    ['var(--amber)','var(--forest)']
  ];
  document.querySelectorAll('.avatar[data-seed]').forEach(function(el){
    var h = hashStr(el.getAttribute('data-seed'));
    var blob = (h % 6) + 1;
    var pal = avatarPalettes[Math.floor(h / 6) % avatarPalettes.length];
    el.classList.add('blob-' + blob);
    el.style.setProperty('--a1', pal[0]);
    el.style.setProperty('--a2', pal[1]);
    el.style.setProperty('--a-angle', (h % 360) + 'deg');
  });

  /* sprint clock rings */
  var CLOCK_R = 15, CLOCK_C = 2 * Math.PI * CLOCK_R;
  document.querySelectorAll('.clock-ring').forEach(function(svg){
    var fill = svg.querySelector('circle.fill');
    if(!fill) return;
    var pct = parseFloat(svg.getAttribute('data-pct')) || 0;
    fill.style.strokeDasharray = CLOCK_C.toFixed(2);
    if(reduced){ fill.style.strokeDashoffset = (CLOCK_C * (1 - pct / 100)).toFixed(2); return; }
    fill.style.strokeDashoffset = CLOCK_C.toFixed(2);
    var seen = false;
    var clockObs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting && !seen){
          seen = true;
          animate(fill, { strokeDashoffset: CLOCK_C * (1 - pct / 100), duration:900, ease:'outCubic' });
        }
      });
    }, {threshold:.5});
    clockObs.observe(svg);
  });

  /* domain filter chips */
  document.querySelectorAll('.filter-row').forEach(function(row){
    var gridSel = row.getAttribute('data-filters-for');
    var grid = gridSel ? document.querySelector(gridSel) : null;
    if(!grid) return;
    var empty = grid.parentElement.querySelector('.empty-state');
    var chips = row.querySelectorAll('.filter-chip');
    function applyFilters(){
      var active = Array.prototype.filter.call(chips, function(c){ return c.getAttribute('aria-pressed') === 'true'; })
        .map(function(c){ return c.getAttribute('data-domain'); });
      var cards = grid.querySelectorAll(':scope > [data-domain]');
      var visible = 0;
      cards.forEach(function(card){
        var show = active.length === 0 || active.indexOf(card.getAttribute('data-domain')) !== -1;
        card.style.display = show ? '' : 'none';
        if(show) visible++;
      });
      if(empty){ empty.classList.toggle('show', visible === 0); }
    }
    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        applyFilters();
      });
    });
    var clearBtn = empty && empty.querySelector('button');
    clearBtn && clearBtn.addEventListener('click', function(){
      chips.forEach(function(c){ c.setAttribute('aria-pressed', 'false'); });
      applyFilters();
    });
  });

  /* shovel / compose triggers */
  document.querySelectorAll('.shovel-btn').forEach(function(btn){
    btn.addEventListener('click', function(e){
      var card = btn.closest('.match-card, .sprint-card');
      var name = card ? (card.querySelector('.name, h4') ? card.querySelector('.name, h4').textContent : '') : '';
      var domain = card ? (card.getAttribute('data-domain') || '') : '';
      if(drawer) {
        openDrawer(name, domain ? 'Domain · ' + domain.toUpperCase() : '');
      } else {
        openModal();
      }
    });
  });

  document.querySelectorAll('.compose-trigger').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(drawer){
        openDrawer('Compose Lab Notebook Entry', 'Document your process, snippets, or findings');
      } else {
        openModal();
      }
    });
  });
})();
