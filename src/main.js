import { animate, utils } from 'animejs';
import { initAmbientPlate } from './ambient-plate.js';
import { initIvyGrowth } from './ivy-growth.js';

(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize Ambient Shader Plate and Botanical Ivy Growth Engine
  initAmbientPlate();
  initIvyGrowth();

  /* ---------- Theme Persistence & Toggle ---------- */
  function initTheme(){
    var saved = localStorage.getItem('canopy_theme');
    if(saved === 'dark'){
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    var toggles = document.querySelectorAll('#themeToggle, .theme-toggle');
    toggles.forEach(function(btn){
      btn.addEventListener('click', function(){
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === 'dark' ? 'light' : 'dark';
        if(next === 'dark'){
          document.documentElement.setAttribute('data-theme', 'dark');
          localStorage.setItem('canopy_theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
          localStorage.setItem('canopy_theme', 'light');
        }
      });
    });
  }
  initTheme();

  /* ---------- Three-Line Navigation Drawer ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var navDrawer = document.getElementById('navDrawer');
  var drawerBackdrop = document.getElementById('drawerBackdrop');
  var drawerClose = document.getElementById('drawerClose');

  function openNavDrawer(){
    if(!navDrawer) return;
    navDrawer.classList.add('is-open');
    drawerBackdrop && drawerBackdrop.classList.add('is-open');
    menuToggle && menuToggle.classList.add('is-open');
    menuToggle && menuToggle.setAttribute('aria-expanded', 'true');
    navDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeNavDrawer(){
    if(!navDrawer) return;
    navDrawer.classList.remove('is-open');
    drawerBackdrop && drawerBackdrop.classList.remove('is-open');
    menuToggle && menuToggle.classList.remove('is-open');
    menuToggle && menuToggle.setAttribute('aria-expanded', 'false');
    navDrawer.setAttribute('aria-hidden', 'true');
  }

  if(menuToggle && navDrawer){
    menuToggle.addEventListener('click', function(){
      if(navDrawer.classList.contains('is-open')) closeNavDrawer();
      else openNavDrawer();
    });
    drawerClose && drawerClose.addEventListener('click', closeNavDrawer);
    drawerBackdrop && drawerBackdrop.addEventListener('click', closeNavDrawer);
  }

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

  /* ---------- Reveal on Scroll ---------- */
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

  /* ---------- Page Transitions ---------- */
  document.body.classList.add('page-entering');
  setTimeout(function(){ document.body.classList.remove('page-entering'); }, 320);

  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href]');
    if(!a) return;
    var href = a.getAttribute('href');
    if(!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http') || a.target === '_blank') return;
    try {
      var targetUrl = new URL(a.href, window.location.href);
      if(targetUrl.origin === window.location.origin && targetUrl.pathname === window.location.pathname && targetUrl.hash){
        return;
      }
    } catch(err){}

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(function(){ window.location.href = href; }, 210);
  });

  /* ---------- Tick / Cross Deck ---------- */
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
      if(tickCountEl) tickCountEl.textContent = ticks;
      if(crossCountEl) crossCountEl.textContent = crosses;

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
    var btnCheck = document.getElementById('deckCheck');
    var btnCross = document.getElementById('deckCross');
    btnCheck && btnCheck.addEventListener('click', function(){ swipe('check'); });
    btnCross && btnCross.addEventListener('click', function(){ swipe('cross'); });
  }

  /* ---------- Keychain Charms ---------- */
  document.querySelectorAll('[data-charm]').forEach(function(ch){
    function toggle(){ ch.classList.toggle('open'); }
    ch.addEventListener('click', toggle);
    ch.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
  });

  /* ---------- Profile Builder Avatar & Role Picker ---------- */
  var roleButtons = document.querySelectorAll('.role-pick-btn');
  var activeAvatarImg = document.getElementById('activeAvatarImg');
  var profileTagRole = document.getElementById('profileTagRole');
  var profileTitle = document.getElementById('profileTitle');

  if(roleButtons.length){
    roleButtons.forEach(function(btn){
      btn.addEventListener('click', function(){
        roleButtons.forEach(function(b){ b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        var avatar = btn.getAttribute('data-avatar');
        var role = btn.getAttribute('data-role');
        if(activeAvatarImg && avatar) activeAvatarImg.src = avatar;
        if(profileTagRole) profileTagRole.textContent = role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' ');
        if(profileTitle) profileTitle.textContent = 'Active profile configured for ' + (role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' '));
      });
    });
  }

  /* ---------- Verified Connections Network Toggle ---------- */
  var btnToggleConnections = document.getElementById('btnToggleConnections');
  var verifiedConnectionsPanel = document.getElementById('verifiedConnectionsPanel');
  if(btnToggleConnections && verifiedConnectionsPanel){
    btnToggleConnections.addEventListener('click', function(){
      var isExpanded = btnToggleConnections.getAttribute('aria-expanded') === 'true';
      btnToggleConnections.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      verifiedConnectionsPanel.style.display = isExpanded ? 'none' : 'block';
    });
  }

  /* ---------- Application Drawer / Bottom Sheet ---------- */
  var appDrawer = document.getElementById('appDrawer');
  var appDrawerBackdrop = document.getElementById('drawerBackdrop');
  var appDrawerClose = document.getElementById('closeDrawer');
  var drawerTitle = document.getElementById('drawerTitle');
  var drawerSub = document.getElementById('drawerSub');

  function openAppDrawer(callTitle, callDomain){
    if(!appDrawer || !appDrawerBackdrop) return;
    if(callTitle && drawerTitle) drawerTitle.textContent = callTitle;
    if(callDomain && drawerSub) drawerSub.textContent = callDomain;
    appDrawerBackdrop.classList.add('is-open');
    appDrawer.classList.remove('closing');
    requestAnimationFrame(function(){ appDrawer.classList.add('is-open'); });
  }
  function closeAppDrawer(){
    if(!appDrawer || !appDrawerBackdrop) return;
    appDrawer.classList.remove('is-open');
    appDrawerBackdrop.classList.remove('is-open');
    appDrawer.classList.add('closing');
    setTimeout(function(){ appDrawer.classList.remove('closing'); }, 240);
  }
  appDrawerClose && appDrawerClose.addEventListener('click', closeAppDrawer);

  var appDrawerForm = document.getElementById('appDrawerForm');
  appDrawerForm && appDrawerForm.addEventListener('submit', function(e){
    e.preventDefault();
    closeAppDrawer();
    var isNotebook = window.location.pathname.indexOf('notebook') !== -1 || (drawerTitle && drawerTitle.textContent.indexOf('Notebook') !== -1);
    var toastMsg = isNotebook 
      ? '🌱 Entry planted in your Lab Notebook: added to library.'
      : '🌱 Shovel note planted: sent to project lead.';
    showToast(toastMsg);
    this.reset();
  });

  /* ---------- Toast Messenger ---------- */
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    if(!toast) return;
    toast.textContent = msg || '🌱 Application planted: we will be in touch soon.';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 3200);
  }

  /* ---------- Interactive Pill Groups ---------- */
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

  /* ---------- Generative Avatars ---------- */
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

  /* ---------- Sprint Clock Rings ---------- */
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

  /* ---------- Domain Filter Chips ---------- */
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

  /* ---------- Shovel & Compose Triggers ---------- */
  document.querySelectorAll('.shovel-btn:not([href])').forEach(function(btn){
    btn.addEventListener('click', function(){
      var card = btn.closest('.match-card, .sprint-card');
      var name = card ? (card.querySelector('.name, h4') ? card.querySelector('.name, h4').textContent : '') : '';
      var domain = card ? (card.getAttribute('data-domain') || '') : '';
      openAppDrawer(name, domain ? 'Domain · ' + domain.toUpperCase() : '');
    });
  });

  document.querySelectorAll('.compose-trigger').forEach(function(btn){
    btn.addEventListener('click', function(){
      openAppDrawer('Compose Lab Notebook Entry', 'Document your process, snippets, or findings');
    });
  });
})();
