import { animate, createTimeline, utils } from 'animejs';

(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile menu (simple show/hide of nav as list) ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var nav = document.querySelector('nav.primary-nav');
  menuToggle && menuToggle.addEventListener('click', function(){
    if(nav.style.display === 'flex'){ nav.style.display=''; }
    else{ nav.style.cssText='display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;background:var(--paper);padding:16px 24px;border-bottom:1px solid var(--line);gap:16px;'; }
  });

  /* ---------- the watering pour, choreographed as one anime.js timeline ----------
     every stage (can tilt, stream, each droplet's fall, its splash, the soil
     glisten, the sapling's response) shares one clock and real physical easing
     — 'inQuad' for the falling water (gravity accelerates it), 'outQuad' for
     the splash (impact decelerates), 'inOutSine' for the unhurried can — so
     the whole gesture reads as one continuous pour instead of separate CSS
     loops drifting in and out of phase with each other. Built on the npm
     `animejs` v4 package: createTimeline() + .add(targets, params, position). */
  function initPourTimeline(){
    var canEl = document.querySelector('.can-wobble');
    var streamEl = document.querySelector('.stream');
    var dropletEls = document.querySelectorAll('.droplet');
    var splashEls = document.querySelectorAll('.splash');
    var glistenEl = document.querySelector('.soil-glisten');
    var saplingEl = document.querySelector('.sapling-grow');
    if(!canEl || reduced) return;

    /* a real watering can doesn't jump straight to a stream — it opens with a
       couple of separate drops, THEN the pour opens into a stream, THEN it
       tapers back to drops as the can lifts. each drop below is scheduled to
       finish falling (and splash) well before the next one starts, so they
       read as distinct, countable drops rather than a blur. */
    function fallOfDrop(el, splashEl, start){
      tl.add(el, { opacity:[0,.9], scale:[.5,1], duration:110, ease:'outQuad' }, start);
      tl.add(el, { y:['0cqh','35cqh'], x:'1cqw', duration:520, ease:'inQuad' }, start);
      tl.add(el, { opacity:0, scale:.5, duration:120, ease:'inQuad' }, start + 500);
      if(splashEl){
        var land = start + 520;
        tl.add(splashEl, { opacity:[0,.55], scale:[.3,.85], duration:150, ease:'outQuad' }, land);
        tl.add(splashEl, { opacity:0, scale:1.6, duration:280, ease:'inQuad' }, land + 150);
      }
    }

    var tl = createTimeline({ loop:true });
    tl.add(canEl, { rotate:-4, duration:0 }, 0);
    tl.add(canEl, { rotate:-16, duration:1200, ease:'inOutSine' }, 700);
    tl.add(canEl, { rotate:-4, duration:1200, ease:'inOutSine' }, 3900);

    /* opening drips */
    fallOfDrop(dropletEls[0], splashEls[0], 1950);
    fallOfDrop(dropletEls[1], splashEls[1], 2500);

    /* the pour opens into a steady stream, held, then closed again */
    tl.add(streamEl, { scaleY:[0,1], opacity:[0,.85], duration:250, ease:'outQuad' }, 3120);
    tl.add(streamEl, { scaleY:0, opacity:0, duration:250, ease:'inQuad' }, 3720);

    /* closing drip, as the can lifts back up */
    fallOfDrop(dropletEls[2], splashEls[2], 3980);

    tl.add(glistenEl, { opacity:[0,.5], duration:400, ease:'outSine' }, 2650);
    tl.add(glistenEl, { opacity:0, duration:600, ease:'inSine' }, 5000);

    tl.add(saplingEl, { scale:[1,1.03], duration:500, ease:'outSine' }, 4550);
    tl.add(saplingEl, { scale:1, duration:900, ease:'inOutSine' }, 5300);
  }
  initPourTimeline();

  /* ---------- reveal on scroll, animated with anime.js ---------- */
  function tiltOf(el){
    var v = getComputedStyle(el).getPropertyValue('--tilt');
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function revealEl(el){
    if(el.classList.contains('in-view')) return;
    if(reduced){ el.classList.add('in-view'); return; }
    if(el.classList.contains('vine-note')){
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      var rot = idx % 2 === 0 ? -1.2 : 1.2;
      animate(el, { opacity:[0,1], y:[24,0], rotate:[rot*2.4, rot],
        duration:750, ease:'outCubic', onComplete:function(){ el.classList.add('in-view'); } });
    } else {
      var tilt = tiltOf(el);
      animate(el, { opacity:[0,1], y:[22,0], rotate:[tilt*2.4, tilt],
        duration:700, ease:'outCubic', onComplete:function(){ el.classList.add('in-view'); } });
    }
  }
  var revealEls = document.querySelectorAll('.reveal, .vine-note');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ revealEl(e.target); } });
    }, {threshold:.18, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- growth vine canvas ---------- */
  var track = document.getElementById('growthTrack');
  var canvas = document.getElementById('vineCanvas');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  /* how far the vine has already been drawn, in segment-index units. redrawing
     the whole accumulated vine from scratch on every scroll frame is O(n) per
     frame and gets slower the further you've scrolled — with the density this
     page wants by the bottom, that measured ~366ms on a full redraw, easily
     enough to make scrolling stutter. -1 means "nothing painted yet / a full
     repaint is owed" (first run, or after a resize invalidates positions). */
  var lastDrawnSeg = -1;

  function sizeCanvas(){
    var r = track.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.height = r.height + 'px';
  }

  /* a broad, rounded pothos-style leaf (not a thin almond) with a visible
     center vein, so a dense cascade of them reads like the trailing houseplant
     reference rather than an abstract sprig. */
  function leafShape(x, y, size, angle, color){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size*0.15, -size*0.85, size*0.95, -size*0.75, size*1.3, -size*0.1);
    ctx.bezierCurveTo(size*0.95, size*0.75, size*0.15, size*0.85, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.lineWidth = Math.max(.6, size*0.03);
    ctx.beginPath();
    ctx.moveTo(size*0.1, 0);
    ctx.quadraticCurveTo(size*0.65, -size*0.05, size*1.15, -size*0.06);
    ctx.stroke();
    ctx.restore();
  }

  /* a deterministic 0..1 "random" keyed off an index, so branch shape stays
     identical across redraws (scroll/resize) instead of flickering. */
  function pseudoRand(i){
    var x = Math.sin(i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* a short offshoot growing sideways off the main vine, with its own leaves —
     used to make the plant read as fuller and more branched the further down
     the page it climbs. past mid-page, a branch can sprout its own smaller
     sub-branches (one recursion deep) for real bushiness near the bottom. */
  function drawBranch(x, y, dir, length, colors, isMobile, depthFrac, allowSub){
    var curl = (pseudoRand(x + y) - .5) * .8;
    var midX = x + Math.cos(dir) * length * 0.55;
    var midY = y + Math.sin(dir) * length * 0.55 - length*0.15;
    var tipX = x + Math.cos(dir + curl) * length;
    var tipY = y + Math.sin(dir + curl) * length;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.lineWidth = isMobile ? 1.6 : 2.4;
    ctx.strokeStyle = colors[0];
    ctx.stroke();

    var nearX = x + (midX-x)*0.45, nearY = y + (midY-y)*0.45;
    var leafSize = (isMobile ? 9 : 14) + length * 0.1;
    leafShape(nearX, nearY, leafSize*0.7, dir - 0.5, colors[Math.floor(pseudoRand(x+y*3) * colors.length)]);
    leafShape(midX, midY, leafSize*0.95, dir - 0.6, colors[Math.floor(pseudoRand(x*2+y) * colors.length)]);
    leafShape(tipX, tipY, leafSize*1.15, dir + curl + (dir < Math.PI/2 ? -0.4 : 0.4), colors[Math.floor(pseudoRand(y*2+x) * colors.length)]);
    if(depthFrac > 0.75){
      leafShape((midX+tipX)/2, (midY+tipY)/2 - leafSize*0.3, leafSize*0.8, dir + 0.5, colors[Math.floor(pseudoRand(x*5+y*2) * colors.length)]);
    }

    if(allowSub !== false && depthFrac > 0.42){
      var subCount = depthFrac > 0.7 ? 2 : 1;
      for(var s=0; s<subCount; s++){
        var t = 0.45 + s*0.3 + pseudoRand(x*3+y*5+s)*0.15;
        var qx = (1-t)*(1-t)*x + 2*(1-t)*t*midX + t*t*tipX;
        var qy = (1-t)*(1-t)*y + 2*(1-t)*t*midY + t*t*tipY;
        var subDir = dir + (pseudoRand(x+y+s*7) - .5) * 1.6;
        drawBranch(qx, qy, subDir, length*0.5, colors, isMobile, depthFrac, false);
      }
    }
  }

  function drawVine(progressOverride){
    var r = track.getBoundingClientRect();
    var progress;
    if(typeof progressOverride === 'number'){
      progress = progressOverride;
    } else {
      var vh = window.innerHeight;
      var total = r.height + vh;
      var scrolled = vh - r.top;
      progress = Math.max(0, Math.min(1, scrolled / total));
    }

    var w = r.width, h = r.height;
    var isMobile = w < 760;
    var xBase = isMobile ? Math.max(18, w*0.06) : w*0.09;
    /* the vine doesn't stay pinned to the margin — it leans further into the
       text column the deeper it climbs, so it visibly threads through the
       page's content rather than sitting beside it the whole way down. */
    var drift = isMobile ? w*0.12 : w*0.2;
    function xBaseAt(depthFrac){ return xBase + depthFrac*drift; }
    var amp = isMobile ? 14 : 34;
    var step = 46;
    var segments = Math.ceil(h/step);
    var drawTo = Math.floor(segments * progress);

    if(drawTo === lastDrawnSeg) return; // already fully painted up to here — nothing to do

    ctx.setTransform(dpr,0,0,dpr,0,0);
    var startSeg;
    if(lastDrawnSeg < 0 || drawTo < lastDrawnSeg){
      /* first paint, or scrolled back up past what's drawn — a plain canvas
         can't selectively erase, so this is the one case that still pays for
         a full repaint. everything else below only touches new growth. */
      ctx.clearRect(0,0,canvas.width,canvas.height);
      startSeg = 1;
    } else {
      startSeg = lastDrawnSeg + 1;
    }

    ctx.lineWidth = isMobile ? 3 : 4.5;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--leaf') || '#6fa85a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    var originIdx = startSeg - 1;
    ctx.moveTo(xBaseAt(originIdx/segments) + Math.sin(originIdx*0.62)*amp, originIdx*step);
    for(var i=startSeg;i<=drawTo;i++){
      var y = i*step;
      var xb = xBaseAt(i/segments);
      var x = xb + Math.sin(i*0.62) * amp;
      var cx = xb + Math.sin((i-0.5)*0.62) * amp;
      ctx.quadraticCurveTo(cx, y-step/2, x, y);
    }
    ctx.stroke();

    /* the plant thickens up the further down the page it's climbed: leaves
       cluster tighter and branches start forking off the main vine, so the
       top of the site stays airy while the bottom reads as fully grown-in. */
    var docLeaf = getComputedStyle(document.documentElement);
    var colors = [
      docLeaf.getPropertyValue('--leaf-bright') || '#82b969',
      docLeaf.getPropertyValue('--leaf') || '#6fa85a',
      docLeaf.getPropertyValue('--forest') || '#1f5c40'
    ];

    for(var j=Math.max(2,startSeg);j<=drawTo;j++){
      var depth = j / segments;
      /* reaches max density (a leaf pair on every node) by ~55% down the
         page instead of crawling toward it for the whole scroll — the top
         stays airy, but density stops being the limiting factor early so the
         back half of the page has room to actually look grown-in. */
      var leafEvery = Math.max(1, Math.round(4 - depth*5.5));
      if(j % leafEvery !== 0) continue;
      var y2 = j*step;
      var x2 = xBaseAt(depth) + Math.sin(j*0.62) * amp;
      var size = (isMobile?13:20) * (1 + depth*0.9);
      /* a pothos leafs in near-opposite pairs off the stem, not one at a
         time — draw both sides together so the vine reads as clothed in
         leaves rather than dotted with them, denser the further it climbs. */
      leafShape(x2, y2, size, -0.35 + depth*0.3, colors[j % colors.length]);
      if(depth > 0.1){
        leafShape(x2, y2, size*0.9, Math.PI + 0.35 - depth*0.3, colors[(j+1) % colors.length]);
      }
      /* extra leaves crowd in behind the pair once the plant's well underway */
      if(depth > 0.4){
        leafShape(x2 - 6, y2 - 10, size*0.65, -1.1 + depth*0.2, colors[(j+2) % colors.length]);
      }
      if(depth > 0.68){
        leafShape(x2 + 8, y2 + 8, size*0.6, 1.1 - depth*0.2, colors[j % colors.length]);
      }
    }

    for(var k=Math.max(6,startSeg);k<=drawTo;k++){
      var depth2 = k / segments;
      if(depth2 < 0.14) continue;
      /* branchEvery reaches 1 (a branch off every node) by ~60% down instead
         of the vine staying twig-thin most of the way — this is what turns
         "a line with some leaves" into an actual bush by the time you reach
         the bottom of the page. */
      var branchEvery = Math.max(1, Math.round(9 - depth2*13));
      if(k % branchEvery !== 0) continue;
      var by0 = k*step, bx0 = xBaseAt(depth2) + Math.sin(k*0.62) * amp;
      var side2 = pseudoRand(k) > 0.5 ? 1 : -1;
      var branchLen = (isMobile?24:40) + depth2*(isMobile?60:110);
      var branchDir = side2 > 0 ? (0.15 + pseudoRand(k*3)*0.5) : (Math.PI - 0.15 - pseudoRand(k*3)*0.5);
      drawBranch(bx0, by0, branchDir, branchLen, colors, isMobile, depth2);

      /* a second offshoot on the opposite side starts much earlier now, and a
         third joins past 65% — by the bottom of the page the vine is
         genuinely thick with foliage, not just occasionally branched. */
      if(depth2 > 0.32){
        var branchDir2 = side2 > 0 ? (Math.PI - 0.2 - pseudoRand(k*5)*0.4) : (0.2 + pseudoRand(k*5)*0.4);
        drawBranch(bx0, by0, branchDir2, branchLen*0.78, colors, isMobile, depth2);
      }
      if(depth2 > 0.65){
        var branchDir3 = (pseudoRand(k*9) - .5) * Math.PI * 0.9;
        drawBranch(bx0, by0, branchDir3, branchLen*0.6, colors, isMobile, depth2);
      }
    }

    /* the canopy flood: in the last stretch of the page, leaves stop being
       tied to the vine's exact path and start scattering across the full
       width — the plant stops climbing and starts taking the screen over,
       which is the payoff the "grew this far" moment needs to land. */
    var floodStart = 0.5;
    if(progress > floodStart){
      var floodSegStart = Math.max(Math.floor(segments*floodStart), startSeg);
      for(var f=floodSegStart; f<=drawTo; f++){
        var fDepth = f/segments;
        var fIntensity = Math.min(1, (fDepth-floodStart)/(1-floodStart));
        var perRow = Math.round(2 + fIntensity*13);
        for(var q=0; q<perRow; q++){
          var seedv = f*13 + q*7;
          /* the vine's own stem, leaf pairs, and branches all live left-of-
             center (xBaseAt drifts from ~9% to ~29% of width), so left-half
             coverage stacks up on top of the flood there for free. skewing
             the flood's own scatter toward the right (pow<1 pushes a uniform
             0..1 sample up toward 1) is what makes the two halves balance out
             once combined, instead of the flood adding equally to a side
             that's already denser. */
          var fx = Math.pow(pseudoRand(seedv), 0.45) * w;
          var fy = f*step + (pseudoRand(seedv*2)-.5) * step * 1.8;
          var fsize = (isMobile?10:16) + fIntensity*(isMobile?14:26);
          var fang = pseudoRand(seedv*3) * Math.PI * 2;
          leafShape(fx, fy, fsize, fang, colors[Math.floor(pseudoRand(seedv*5) * colors.length)]);
        }
      }
    }

    lastDrawnSeg = drawTo;
  }

  sizeCanvas(); drawVine(0);
  window.addEventListener('resize', function(){ sizeCanvas(); lastDrawnSeg = -1; drawVine(); });

  /* anime.js's onScroll({sync:true}) was tried here to drive this, but under
     testing it never reported the track as in view (isInView stayed false
     even with the scroll position well inside its bounds and the engine
     manually ticked) — a real bug, not a testing artifact, and the cause of
     the vine going invisible. Reverted to a plain scroll listener + rAF
     throttle, which is simple and was already proven reliable. */
  var ticking = false;
  function onWindowScroll(){
    if(!ticking){
      ticking = true;
      requestAnimationFrame(function(){ drawVine(); ticking = false; });
    }
  }
  window.addEventListener('scroll', onWindowScroll, {passive:true});

  /* ---------- tick / cross deck ---------- */
  var problems = [
    {tag:'Domain · Water', title:'Build a low-cost sensor to flag groundwater contamination in real time.', reward:'Reward: ₹150,000 pilot budget + open dataset access'},
    {tag:'Domain · Energy', title:'Design a dashboard that helps rural microgrids predict demand a day ahead.', reward:'Reward: paid 6-week pilot with a state energy board'},
    {tag:'Domain · Biodiversity', title:'Train a lightweight model to ID invasive species from camera-trap photos.', reward:'Reward: open-source credit + conference travel grant'},
    {tag:'Domain · Civic Tech', title:'Prototype a plain-language explainer for municipal budget documents.', reward:'Reward: ₹80,000 cash prize'},
    {tag:'Domain · Health', title:'Build a triage chatbot for a rural clinic network with patchy connectivity.', reward:'Reward: paid pilot + clinic deployment credit'}
  ];
  var di = 0, ticks=0, crosses=0;
  var deckCard = document.getElementById('deckCard');
  var elTag = document.getElementById('deckTagLabel');
  var elTitle = document.getElementById('deckTitle');
  var elReward = document.getElementById('deckReward');
  var tickCountEl = document.getElementById('tickCount');
  var crossCountEl = document.getElementById('crossCount');

  function paintDeck(){
    var p = problems[di % problems.length];
    elTag.textContent = p.tag;
    elTitle.textContent = p.title;
    elReward.textContent = p.reward;
  }
  paintDeck();

  var deckBusy = false;
  function swipe(dir){
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
      duration:420, ease:'inQuad',
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
  }
  document.getElementById('deckCheck').addEventListener('click', function(){ swipe('check'); });
  document.getElementById('deckCross').addEventListener('click', function(){ swipe('cross'); });

  /* ---------- keychain charms ---------- */
  document.querySelectorAll('[data-charm]').forEach(function(ch){
    var panel = ch.querySelector('.looks-for');
    function toggle(){
      var isOpen = ch.classList.contains('open');
      if(reduced){ ch.classList.toggle('open'); return; }
      if(isOpen){
        animate(panel, { height:0, opacity:0, marginTop:0, duration:260, ease:'inQuad',
          onComplete:function(){ ch.classList.remove('open'); panel.style.height=''; panel.style.maxHeight=''; } });
      } else {
        ch.classList.add('open');
        panel.style.maxHeight = 'none';
        var target = panel.scrollHeight;
        utils.set(panel, { height:0, opacity:0, marginTop:0 });
        animate(panel, { height:target, opacity:1, marginTop:8, duration:320, ease:'outCubic' });
      }
    }
    ch.addEventListener('click', toggle);
    ch.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
  });

  /* ---------- for-tabs ---------- */
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.setAttribute('aria-selected','false'); });
      btn.setAttribute('aria-selected','true');
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-panel').forEach(function(p){
        p.setAttribute('data-active', p.getAttribute('data-panel')===target ? 'true':'false');
      });
    });
  });

  /* ---------- apply modal ---------- */
  var modal = document.getElementById('applyModal');
  function openModal(){ if(typeof modal.showModal==='function'){ modal.showModal(); } else { modal.setAttribute('open',''); } }
  function closeModal(){ if(typeof modal.close==='function'){ modal.close(); } else { modal.removeAttribute('open'); } }
  ['openApply','openApplyGhost','heroApply','finaleApply'].forEach(function(id){
    var el = document.getElementById(id);
    el && el.addEventListener('click', openModal);
  });
  document.getElementById('closeApply').addEventListener('click', closeModal);
  document.getElementById('notYet').addEventListener('click', function(){ showToast("no rush — the sapling will still be here."); });
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

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
    toast.textContent = msg || '🌱 Application planted — we\'ll be in touch soon.';
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 3200);
  }

  document.getElementById('applyForm').addEventListener('submit', function(e){
    e.preventDefault();
    closeModal();
    showToast();
    this.reset();
    document.querySelectorAll('.pill').forEach(function(p){ p.setAttribute('aria-pressed','false'); });
  });
})();
