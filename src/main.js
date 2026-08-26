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
    if(!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http')) return;
    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(function(){ window.location.href = href; }, 210);
  });

  /* ---------- growth vine canvas ----------
     two stacked canvases: #vineCanvas holds settled growth (drawn once,
     never touched again — cheap); #vineFadeCanvas holds only whatever
     segment is currently easing in, redrawn every frame of that one short
     tween. this is what lets new growth fade in smoothly via anime.js
     without paying to redraw the whole accumulated vine every frame. */
  var track = document.getElementById('growthTrack');
  if(track){ // absent on calmer, article-style pages (Sprint, Lab Notebook) — the growth
             // mechanic is a homepage-specific storytelling device, not a site-wide fixture
  /* ---------- vine: one continuous SVG path, not per-section canvases ----------
     A single <path> runs from the top of the track to the bottom; scroll
     progress drives its stroke-dashoffset so it looks hand-drawn in as you
     scroll (the classic SVG "line draw" technique). Branches are their own
     short paths, each revealed the same way once the stem's growth passes
     their attachment point. Leaves are small filled paths that fade + scale
     in via a CSS class once the stem passes their position — no per-frame
     canvas redraw at all, so the per-frame cost is a handful of attribute
     writes regardless of leaf count or the display's refresh rate: a 120Hz
     screen doesn't cost more than 60Hz here, unlike a procedural canvas
     redraw would. The vine sits in its own layer (z-index:0) behind the
     content (.section is z-index:1), so it doesn't need per-text collision
     math to avoid sitting on headings — it just runs behind everything. */
  var svg = document.getElementById('vineSvg');
  var stemSegEls = []; // [{ el, len, fromFrac, toFrac }] — the stem is several tapering pieces, not one uniform stroke
  var branchEls = []; // [{ el, len, attach }] — tendrils live in here too, just thinner
  var leafEls = [];   // [{ el, fraction }] sorted ascending, walked with leafPtr
  var leafPtr = 0;

  /* deterministic 0..1 "random" keyed off an index, so the plant's shape
     stays identical across rebuilds (resize) instead of reshuffling. */
  function pseudoRand(i){
    var x = Math.sin(i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /* three sine components at unrelated frequencies/phases, summed. A single
     sine repeats itself every ~10 segments and reads as a mechanical zigzag
     — the brief for this vine explicitly asks for "irregular bends" and
     "avoid perfectly symmetrical/repetitive shapes". Three components that
     don't share a period essentially never repeat within a page's height,
     so every bend looks like a distinct decision instead of a stamped
     pattern. Coefficients sum to ~1 so callers can multiply by an amplitude
     the same way they would with a single sine. */
  function organicWave(i){
    var t = i * 0.62;
    return Math.sin(t)*0.6 + Math.sin(t*0.34 + 1.7)*0.27 + Math.sin(t*0.11 + 4.2)*0.17;
  }

  var LEAF_D = 'M0,0 C2.4,-13.6 15.2,-12 20.8,-1.6 C15.2,12 2.4,13.6 0,0 Z'; // unit leaf, tip pointing +x, base at origin
  /* light young growth at the top, deep mature forest by the base — the
     stem's own stroke color progresses through the same set (see
     buildVine's stageColors), so the whole plant reads as aging as it
     descends, not just thickening. */
  var LEAF_COLOR_VARS = ['--leaf-bright', '--leaf', '--forest'];

  /* computes the full plant's geometry — stem (as tapering, color-maturing
     stages), branches, tendrils, and every leaf's position/rotation/scale/
     opacity and the scroll-fraction it should appear at — without touching
     the DOM. The growth is explicitly staged rather than one continuous
     density curve: delicate near-bare stem near the top, moderate
     branching through the middle, lush and tendril-heavy toward the
     bottom, with a final concentrated flourish in the last stretch as the
     page's "the plant completed its journey" moment. */
  function buildVine(){
    var r = track.getBoundingClientRect();
    var w = r.width, h = Math.max(1, r.height);
    var isMobile = w < 760;
    var xBase = isMobile ? Math.max(18, w*0.06) : w*0.09;
    var drift = isMobile ? w*0.12 : w*0.2; // the vine leans further into the text column as it climbs
    function xBaseAt(depthFrac){ return xBase + depthFrac*drift; }
    var baseAmp = isMobile ? 12 : 30;
    var step = 46;
    var segments = Math.max(1, Math.ceil(h/step));

    /* three broad "interest" depths get a localized swing boost — Gaussian
       bumps, not a step change — so the stem visibly widens its arc near
       where the page tends to have card-heavy content (the quote notes,
       the tick/cross deck, the keychain), reading as the vine weaving
       wider around something, without measuring any actual DOM layout. */
    function ampAt(depthFrac){
      var weave = 1
        + 0.5*Math.exp(-Math.pow((depthFrac-0.33)/0.05, 2))
        + 0.5*Math.exp(-Math.pow((depthFrac-0.62)/0.05, 2))
        + 0.4*Math.exp(-Math.pow((depthFrac-0.85)/0.04, 2));
      return baseAmp * weave;
    }
    function pointAt(i){
      var depth = i/segments;
      return { x: xBaseAt(depth) + organicWave(i)*ampAt(depth), y: i*step, depth: depth };
    }

    /* the stem tapers thin-and-pale at the top to thick-and-deep at the
       base across five stages. Each stage is its own <path> (own
       stroke-width, own stroke color, own independent dash-reveal window)
       but every stage's first point is the previous stage's last point —
       computed from the identical position formula — so consecutive
       stages share an exact coordinate and the taper reads as one
       continuous stem, never a visible seam. */
    var stageFracs = [0, 0.12, 0.45, 0.75, 0.95, 1];
    var stageWidths = isMobile ? [1.3, 1.9, 2.7, 3.5, 4.2] : [1.8, 2.8, 4, 5.2, 6.2];
    var stageColors = ['--leaf-bright', '--leaf-bright', '--leaf', '--forest', '--forest'];
    var stemStages = [];
    for(var st=0; st<stageFracs.length-1; st++){
      var fromI = Math.round(stageFracs[st]*segments), toI = Math.round(stageFracs[st+1]*segments);
      if(toI <= fromI) continue;
      var p0 = pointAt(fromI);
      var sd = 'M' + p0.x.toFixed(1) + ',' + p0.y.toFixed(1);
      for(var i=fromI+1;i<=toI;i++){
        var p = pointAt(i);
        var half = pointAt(i-0.5);
        sd += ' Q' + half.x.toFixed(1) + ',' + (p.y-step/2).toFixed(1) + ' ' + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }
      stemStages.push({ d: sd, strokeWidth: stageWidths[st], colorVar: stageColors[st],
        fromFrac: fromI/segments, toFrac: toI/segments });
    }

    var leaves = [];
    function pushLeaf(x,y,radians,scale,fraction,ci,opacity){
      leaves.push({ x:x, y:y, rot: radians*180/Math.PI, scale:scale, fraction:fraction,
        opacity: opacity==null?1:opacity, colorVar: LEAF_COLOR_VARS[((ci%3)+3)%3] });
    }
    function makeBranch(x, y, dir, length, attach, isTendril){
      var curl = (pseudoRand(x+y) - .5) * .8;
      var midX = x + Math.cos(dir)*length*0.55, midY = y + Math.sin(dir)*length*0.55 - length*0.15;
      var tipX = x + Math.cos(dir+curl)*length, tipY = y + Math.sin(dir+curl)*length;
      return {
        d: 'M'+x.toFixed(1)+','+y.toFixed(1)+' Q'+midX.toFixed(1)+','+midY.toFixed(1)+' '+tipX.toFixed(1)+','+tipY.toFixed(1),
        attach: attach, base:{x:x,y:y}, mid:{x:midX,y:midY}, tip:{x:tipX,y:tipY}, dir:dir, length:length, isTendril:!!isTendril
      };
    }
    /* a small curling spiral — the brief's explicit "small tendrils", a
       distinct decorative element from a branch, not just a shorter one.
       Drawn as short line segments (a curl is small enough on screen that
       it doesn't need bezier smoothing) winding from a wide arc down to
       nothing at its curled tip. */
    function makeTendril(x, y, dir, size, attach){
      var steps = 9, turns = 1.5;
      var d = '';
      for(var s=0; s<=steps; s++){
        var t = s/steps;
        var ang = dir + t*turns*Math.PI*2;
        var rad = size * (1 - t*0.82);
        var px = x + Math.cos(ang)*rad, py = y + Math.sin(ang)*rad*0.6;
        d += (s===0?'M':' L') + px.toFixed(1) + ',' + py.toFixed(1);
      }
      return { d:d, attach:attach, isTendril:true };
    }

    /* --- STAGE: delicate (0-0.12) — a near-bare stem, at most one or two
       small leaves, no branches at all, lots of negative space. */
    /* --- STAGE: emerging (0.12-0.45) — occasional branches begin, leaves
       moderate. --- STAGE: developed (0.45-0.75) — denser. --- STAGE: lush
       (0.75-0.95) — frequent branches + tendrils, canopy flood begins.
       --- STAGE: culmination (0.95-1) — a concentrated closing flourish. */
    // leaves along the main stem — cadence tightens (more leaves) with depth
    for(var j=2;j<=segments;j++){
      var depth = j/segments;
      if(depth < 0.12){ if(j % (isMobile?26:20) !== 0) continue; } // delicate stage: near-bare
      var leafEvery = Math.max(1, Math.round((4.4 - depth*5.6) * (isMobile?1.8:1)));
      if(depth >= 0.12 && j % leafEvery !== 0) continue;
      var y2 = j*step, x2 = xBaseAt(depth) + organicWave(j)*ampAt(depth);
      var size = ((isMobile?13:20) * (1+depth*0.9)) / 16; // /16 normalizes against LEAF_D's reference size
      var opac = 0.82 + pseudoRand(j*7)*0.18; // subtle front/back depth layering, not all leaves fully opaque
      pushLeaf(x2, y2, -0.35+depth*0.3, size, depth, j, opac);
      if(depth>0.2) pushLeaf(x2, y2, Math.PI+0.35-depth*0.3, size*0.9, depth, j+1, opac*0.95);
      if(depth>0.5 && !isMobile) pushLeaf(x2-6, y2-10, -1.1+depth*0.2, size*0.65, depth, j+2, opac);
      if(depth>0.75 && !isMobile) pushLeaf(x2+8, y2+8, 1.1-depth*0.2, size*0.6, depth, j, opac*0.9);
    }

    // branches, sprouting sideways off the stem — none before the emerging stage, denser with depth
    var branches = [];
    for(var k=6;k<=segments;k++){
      var depth2 = k/segments;
      if(depth2 < 0.14) continue;
      var branchEvery = isMobile ? Math.max(8, Math.round(16-depth2*9)) : Math.max(5, Math.round(12-depth2*7));
      if(k % branchEvery !== 0) continue;
      var by0 = k*step, bx0 = xBaseAt(depth2) + organicWave(k)*ampAt(depth2);
      var side = pseudoRand(k) > 0.5 ? 1 : -1;
      var branchLen = (isMobile?22:38) + depth2*(isMobile?58:105);
      var dir = side > 0 ? (0.15 + pseudoRand(k*3)*0.5) : (Math.PI - 0.15 - pseudoRand(k*3)*0.5);
      branches.push(makeBranch(bx0, by0, dir, branchLen, depth2));
      if(depth2 > 0.35){
        var dir2 = side > 0 ? (Math.PI - 0.2 - pseudoRand(k*5)*0.4) : (0.2 + pseudoRand(k*5)*0.4);
        branches.push(makeBranch(bx0, by0, dir2, branchLen*0.78, depth2));
      }
      // tendrils start appearing once the plant is past "emerging" — a curl near the branch's base
      if(depth2 > 0.4 && pseudoRand(k*17) > 0.55){
        var tendrilDir = dir + Math.PI*0.5*(side>0?1:-1);
        branches.push(makeTendril(bx0 + Math.cos(dir)*branchLen*0.2, by0 + Math.sin(dir)*branchLen*0.2,
          tendrilDir, (isMobile?9:14) + depth2*10, depth2+0.015));
      }
    }
    branches.forEach(function(b, bi){
      if(b.isTendril) return; // tendrils carry no leaves of their own — the curl is the whole point
      var leafSize = ((isMobile?9:14) + b.length*0.1) / 16;
      var nearX = b.base.x + (b.mid.x-b.base.x)*0.45, nearY = b.base.y + (b.mid.y-b.base.y)*0.45;
      var opac = 0.85 + pseudoRand(bi*11)*0.15;
      pushLeaf(nearX, nearY, b.dir-0.5, leafSize*0.7, b.attach+0.01, bi, opac);
      pushLeaf(b.mid.x, b.mid.y, b.dir-0.6, leafSize*0.95, b.attach+0.02, bi+1, opac);
      pushLeaf(b.tip.x, b.tip.y, b.dir + (b.dir<Math.PI/2 ? -0.4 : 0.4), leafSize*1.15, b.attach+0.035, bi+2, opac);
    });

    /* the canopy flood: past the lush threshold, leaves stop tracking the
       vine's exact path and scatter across the full width — the plant
       stops climbing and starts taking the screen over. Intensity (and so
       density/size) ramps smoothly and peaks at the very bottom, which
       doubles as the "culmination" stage without needing a separate
       special-cased cluster. */
    var floodStart = 0.62;
    var floodSegStart = Math.floor(segments*floodStart);
    var floodStep = isMobile ? 4 : 2;
    for(var f=floodSegStart; f<=segments; f+=floodStep){
      var fDepth = f/segments;
      var fIntensity = Math.min(1, (fDepth-floodStart)/(1-floodStart));
      var perRow = Math.round(1 + fIntensity*fIntensity*(isMobile?2.4:5.5)); // eased (squared) so it stays sparse in early "lush", then swells fast into "culmination"
      for(var q=0; q<perRow; q++){
        var seedv = f*13 + q*7;
        var fx = Math.pow(pseudoRand(seedv), 0.45) * w; // skewed right to balance the stem's own left lean
        var fy = f*step + (pseudoRand(seedv*2)-.5)*step*1.8;
        var fsize = ((isMobile?10:16) + fIntensity*(isMobile?15:28)) / 16;
        var fopac = 0.78 + pseudoRand(seedv*9)*0.22;
        pushLeaf(fx, fy, pseudoRand(seedv*3)*Math.PI*2, fsize, fDepth, Math.floor(pseudoRand(seedv*5)*3), fopac);
      }
    }

    return { w:w, h:h, stemStages:stemStages, branches:branches, leaves:leaves };
  }

  /* builds the actual DOM/SVG from computed geometry, once per resize —
     never per scroll frame. getTotalLength() (native, cheap, called once
     per path here) is what stroke-dashoffset math is measured against. */
  function renderVineDOM(geo){
    svg.setAttribute('width', geo.w);
    svg.setAttribute('height', geo.h);
    svg.setAttribute('viewBox', '0 0 ' + geo.w + ' ' + geo.h);
    var html = '';
    geo.stemStages.forEach(function(s){
      html += '<path class="vine-stem" style="--w:' + s.strokeWidth + ';stroke:var(' + s.colorVar + ')" d="' + s.d + '"></path>';
    });
    geo.branches.forEach(function(b){
      html += '<path class="vine-branch' + (b.isTendril?' vine-tendril':'') + '" d="' + b.d + '"></path>';
    });
    geo.leaves.forEach(function(lf){
      html += '<path class="vine-leaf" data-fraction="' + lf.fraction.toFixed(4) + '" ' +
        'style="--tx:' + lf.x.toFixed(1) + 'px;--ty:' + lf.y.toFixed(1) + 'px;--tr:' + lf.rot.toFixed(1) +
        'deg;--s:' + lf.scale.toFixed(3) + ';--o:' + lf.opacity.toFixed(2) + ';fill:var(' + lf.colorVar + ')" d="' + LEAF_D + '"></path>';
    });
    svg.innerHTML = html;

    var stemNodes = svg.querySelectorAll('.vine-stem');
    stemSegEls = geo.stemStages.map(function(s, i){
      var el = stemNodes[i];
      var len = el.getTotalLength();
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      return { el: el, len: len, fromFrac: s.fromFrac, toFrac: s.toFrac };
    });

    var branchNodes = svg.querySelectorAll('.vine-branch');
    branchEls = geo.branches.map(function(b, i){
      var el = branchNodes[i];
      var len = el.getTotalLength();
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      return { el: el, len: len, attach: b.attach };
    });

    leafEls = Array.prototype.map.call(svg.querySelectorAll('.vine-leaf'), function(el){
      return { el: el, fraction: parseFloat(el.getAttribute('data-fraction')) };
    }).sort(function(a,b){ return a.fraction - b.fraction; });
    leafPtr = 0;
  }

  /* the only thing that runs on every progress update. everything here is
     an attribute/style write or a classList toggle — no drawing, no canvas,
     no layout reads — so this stays cheap at any refresh rate. */
  var BRANCH_REVEAL_WINDOW = 0.05;
  function applyProgress(p){
    for(var s=0;s<stemSegEls.length;s++){
      var seg = stemSegEls[s];
      var local = Math.max(0, Math.min(1, (p - seg.fromFrac) / (seg.toFrac - seg.fromFrac)));
      seg.el.style.strokeDashoffset = seg.len * (1-local);
    }
    for(var i=0;i<branchEls.length;i++){
      var b = branchEls[i];
      var local2 = Math.max(0, Math.min(1, (p - b.attach) / BRANCH_REVEAL_WINDOW));
      b.el.style.strokeDashoffset = b.len * (1-local2);
    }
    while(leafPtr < leafEls.length && leafEls[leafPtr].fraction <= p){ leafEls[leafPtr].el.classList.add('grown'); leafPtr++; }
    while(leafPtr > 0 && leafEls[leafPtr-1].fraction > p){ leafPtr--; leafEls[leafPtr].el.classList.remove('grown'); }
  }

  /* progress reaches exactly 1 when the track's own bottom edge reaches the
     bottom of the viewport — not when the track has scrolled all the way
     past/above it. The latter (dividing by track height + viewport height)
     requires a full viewport's worth of scrollable content AFTER the track
     ends before progress can reach 1 at all; this page's footer isn't that
     tall, so that version capped out around 0.91 and the vine's whole
     "culmination" stage — the payoff the brief explicitly asks for — was
     literally unreachable by scrolling, however far down the page went. */
  function computeRawProgress(){
    var r = track.getBoundingClientRect();
    var vh = window.innerHeight;
    var scrolled = vh - r.top;
    return Math.max(0, Math.min(1, scrolled / r.height));
  }

  /* scroll sets a target; a persistent rAF loop eases the DISPLAYED
     progress toward it every frame instead of snapping straight to the
     scroll-derived value — "smoothing"/lerped scroll-linked motion, so the
     vine's growth reads as one continuous, slightly-trailing organic
     movement rather than a value that jumps in lockstep with a (sometimes
     janky) scroll event stream. The loop is self-terminating: once the
     displayed value is within a hair of the target it stops, rather than
     running forever in the background. */
  var rawProgress = 0, smoothProgress = 0, loopRunning = false;
  function tick(){
    var delta = rawProgress - smoothProgress;
    if(Math.abs(delta) < 0.0004){
      smoothProgress = rawProgress;
      applyProgress(smoothProgress);
      loopRunning = false;
      return;
    }
    smoothProgress += delta * 0.16;
    applyProgress(smoothProgress);
    requestAnimationFrame(tick);
  }
  function onWindowScroll(){
    rawProgress = computeRawProgress();
    if(!loopRunning){ loopRunning = true; requestAnimationFrame(tick); }
  }

  var geo0 = buildVine();
  renderVineDOM(geo0);
  if(reduced){
    /* static: fully grown, no scroll-linked motion at all. */
    applyProgress(1);
  } else {
    rawProgress = computeRawProgress();
    smoothProgress = rawProgress; // no catch-up animation on load if the page opened mid-scroll (back/forward nav)
    applyProgress(smoothProgress);
    window.addEventListener('scroll', onWindowScroll, {passive:true});
  }
  window.addEventListener('resize', function(){
    var geo = buildVine();
    renderVineDOM(geo);
    if(reduced){ applyProgress(1); }
    else { rawProgress = computeRawProgress(); smoothProgress = rawProgress; applyProgress(smoothProgress); }
  });
  } // end if(track)

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
    showToast('🌱 Shovel note planted — sent to the project poster.');
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
