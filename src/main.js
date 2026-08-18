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
  function revealEl(el, stagger){
    if(el.classList.contains('in-view')) return;
    if(reduced){ el.classList.add('in-view'); return; }
    var delay = stagger || 0;
    if(el.classList.contains('vine-note')){
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      var rot = idx % 2 === 0 ? -1.2 : 1.2;
      animate(el, { opacity:[0,1], y:[24,0], rotate:[rot*2.4, rot],
        duration:750, delay:delay, ease:'outCubic', onComplete:function(){ el.classList.add('in-view'); } });
    } else {
      var tilt = tiltOf(el);
      animate(el, { opacity:[0,1], y:[22,0], rotate:[tilt*2.4, tilt],
        duration:700, delay:delay, ease:'outCubic', onComplete:function(){ el.classList.add('in-view'); } });
    }
  }
  var revealEls = document.querySelectorAll('.reveal, .vine-note');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      /* elements crossing the threshold in the same callback batch (a whole
         card grid scrolling into view at once) get a small stagger instead
         of firing together — capped so a big batch doesn't drag the tail
         out past ~300ms, since stagger is decorative and must never block
         interaction with the first cards. */
      var batch = entries.filter(function(e){ return e.isIntersecting; });
      batch.forEach(function(e, i){ revealEl(e.target, Math.min(i, 6) * 50); });
    }, {threshold:.18, rootMargin:'0px 0px -60px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in-view'); });
  }

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
  /* entrance/exit animated via .is-open / .closing classes (see
     dialog#applyModal in style.css) rather than letting showModal()/close()
     snap the dialog in and out instantly. */
  function openModal(){
    if(typeof modal.showModal==='function'){ modal.showModal(); } else { modal.setAttribute('open',''); }
    modal.classList.remove('closing');
    requestAnimationFrame(function(){ modal.classList.add('is-open'); });
  }
  function closeModal(){
    if(!modal.classList.contains('is-open') && !modal.hasAttribute('open')) return;
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
  document.getElementById('closeApply').addEventListener('click', closeModal);
  var notYetBtn = document.getElementById('notYet');
  notYetBtn && notYetBtn.addEventListener('click', function(){ showToast("no rush — the sapling will still be here."); });
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

  /* ---------- workspace pages (Match / Sprint / Lab Notebook) ----------
     generative avatars, sprint clock rings, and domain filter chips shared
     across the three product-UI pages. Each block is a no-op wherever its
     markup doesn't exist, so this runs safely on every page including the
     homepage. */

  /* deterministic string hash, used to pick a stable blob shape + color
     pair per name so the same person always renders the same "fingerprint"
     avatar rather than a random one on every reload. */
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
    ['var(--twine)','var(--leaf)']
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

  /* sprint clock rings: data-pct (percent of the sprint window remaining)
     drives the ring fill, animated in on scroll — the same "grows once
     noticed" motion language as the rest of the site, scoped to this one
     interaction rather than scattered across every card. */
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

  /* domain filter chips: toggle aria-pressed, show/hide sibling cards by
     data-domain, and reveal the section's empty state when a filter combo
     leaves nothing to show. */
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

  /* shovel / compose triggers on the card grids reuse the same intake
     modal as the rest of the site — same mockup-only interaction, just
     wired from many cards instead of a handful of fixed buttons. */
  document.querySelectorAll('.shovel-btn, .compose-trigger').forEach(function(btn){
    btn.addEventListener('click', openModal);
  });
})();
