// Continuous Botanical Ivy Growth System
// Sliced from the original reference artwork across the 4 sections of #contentTrack:
// - Hero section: ZERO ivy (100% clean & breathable)
// - Zone 1 (#problem "Finding who to build it with..."): Top sweeping arc (visual cue from top of image)
// - Zone 2 (#solution): Branching S-loop framing steps & deck
// - Zone 3 (#for): Parallel cascading columns framing keychain & persona cards
// - Zone 4 (#connect): Dense interlocking canopy wall framing the tree finale
//
// Performance & Timing:
// - Leaves grow simultaneously little by little in each section
// - Uses polished, velvety sage leaves (vine-leaves-isolated.png)
// - Pre-bucketed pixel buffers for sub-millisecond, synchronous 60fps rendering with 0ms scroll lag

export async function initIvyGrowth() {
  const container = document.getElementById('ivyGrowthSystem');
  if (!container) return;

  container.innerHTML = '';

  const zoneConfigs = [
    {
      id: 1,
      sectionId: 'problem',
      name: 'top-arc',
      yOff: 20,
      width: 'clamp(380px, 48vw, 780px)',
      left: 'calc(50% - min(390px, 24vw))',
      opacity: 0.90
    },
    {
      id: 2,
      sectionId: 'solution',
      name: 'branching',
      yOff: 40,
      width: 'clamp(320px, 36vw, 580px)',
      left: 'calc(50% - min(360px, 22vw))',
      opacity: 0.88
    },
    {
      id: 3,
      sectionId: 'for',
      name: 'cascading',
      yOff: 30,
      width: 'clamp(340px, 38vw, 620px)',
      left: 'calc(50% - min(380px, 23vw))',
      opacity: 0.90
    },
    {
      id: 4,
      sectionId: 'connect',
      name: 'canopy-wall',
      yOff: 20,
      width: 'clamp(360px, 42vw, 680px)',
      left: 'calc(50% - min(400px, 24vw))',
      opacity: 0.94
    }
  ];

  function loadImg(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Load all 4 zone datasets in parallel
  const zoneAssets = await Promise.all(
    zoneConfigs.map(async (z) => {
      const [stemImg, mapImg, leavesRes] = await Promise.all([
        loadImg(`/zone-${z.id}-stem.png`),
        loadImg(`/zone-${z.id}-map.png`),
        fetch(`/zone-${z.id}-leaves.json`).then(r => r.json())
      ]);
      return { ...z, stemImg, mapImg, leaves: leavesRes };
    })
  );

  const W = 564;
  const offC = document.createElement('canvas');
  const offCtx = offC.getContext('2d', { willReadFrequently: true });

  // Instantiate each zone on the page
  const zones = zoneAssets.map((z) => {
    const secEl = document.getElementById(z.sectionId);
    if (!secEl) return null;

    const H = z.stemImg.height;

    // Read pixel data for stem and growth map
    offC.width = W;
    offC.height = H;
    offCtx.clearRect(0, 0, W, H);
    offCtx.drawImage(z.stemImg, 0, 0);
    const stemPx = offCtx.getImageData(0, 0, W, H).data;

    offCtx.clearRect(0, 0, W, H);
    offCtx.drawImage(z.mapImg, 0, 0);
    const mapPx = offCtx.getImageData(0, 0, W, H).data;

    // Pre-bucket pixels by growth byte (0..255) for instant synchronous updates
    const buckets = Array.from({ length: 256 }, () => []);
    const numPx = W * H;
    for (let i = 0; i < numPx; i++) {
      const idx = i * 4;
      if (stemPx[idx + 3] > 15) {
        const b = mapPx[idx];
        buckets[b].push(idx);
      }
    }

    // Container element
    const unitEl = document.createElement('div');
    unitEl.className = `ivy-zone-unit ivy-zone-${z.id}`;
    unitEl.style.width = z.width;
    unitEl.style.left = z.left;
    unitEl.style.opacity = z.opacity;

    // Stem canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'ivy-stem-canvas';
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const drawData = ctx.createImageData(W, H);

    // Leaves overlay
    const leavesContainer = document.createElement('div');
    leavesContainer.className = 'ivy-leaves-container';

    // Leaves elements with polished velvety texture
    const leafNodes = z.leaves.map((leaf, idx) => {
      const { box, absBox, attach, relProgress } = leaf;
      const [x0, y0, x1, y1] = box;
      const [ax, ay] = attach;

      const el = document.createElement('div');
      el.className = 'ivy-leaf-node';
      el.style.left = `${x0}px`;
      el.style.top = `${y0}px`;
      el.style.width = `${x1 - x0 + 1}px`;
      el.style.height = `${y1 - y0 + 1}px`;
      el.style.backgroundPosition = `-${absBox[0]}px -${absBox[1]}px`;
      el.style.transformOrigin = `${ax - x0}px ${ay - y0}px`;

      leavesContainer.appendChild(el);

      // Organic spread so leaves grow simultaneously and briskly
      const simultaneousOffset = (relProgress * 0.20) + ((idx % 4) * 0.02);

      return { el, simultaneousOffset };
    });

    unitEl.appendChild(canvas);
    unitEl.appendChild(leavesContainer);
    container.appendChild(unitEl);

    // Coordinate scale
    function syncScale() {
      const curW = unitEl.clientWidth || 420;
      const s = curW / W;
      leavesContainer.style.transform = `scale(${s})`;
      leavesContainer.style.transformOrigin = 'top left';
      leavesContainer.style.width = `${W}px`;
      leavesContainer.style.height = `${H}px`;

      const topPos = secEl.offsetTop + z.yOff;
      unitEl.style.top = `${topPos}px`;
    }
    syncScale();
    window.addEventListener('resize', syncScale, { passive: true });

    let currentByte = 0;

    // Fast, synchronous render function
    function render(progress) {
      const p = Math.max(0, Math.min(1, progress));
      const targetByte = Math.round(p * 255);

      // Synchronous incremental stem update (instantaneous!)
      if (targetByte > currentByte) {
        const out = drawData.data;
        for (let b = currentByte + 1; b <= targetByte; b++) {
          const list = buckets[b];
          for (let k = 0; k < list.length; k++) {
            const idx = list[k];
            out[idx] = stemPx[idx];
            out[idx + 1] = stemPx[idx + 1];
            out[idx + 2] = stemPx[idx + 2];
            out[idx + 3] = stemPx[idx + 3];
          }
        }
        currentByte = targetByte;
        ctx.putImageData(drawData, 0, 0);
      } else if (targetByte < currentByte) {
        const out = drawData.data;
        for (let b = currentByte; b > targetByte; b--) {
          const list = buckets[b];
          for (let k = 0; k < list.length; k++) {
            out[list[k] + 3] = 0;
          }
        }
        currentByte = targetByte;
        ctx.putImageData(drawData, 0, 0);
      }

      // Leaves grow briskly and simultaneously with the stem
      for (let i = 0; i < leafNodes.length; i++) {
        const item = leafNodes[i];
        const pLocal = (p - item.simultaneousOffset) / 0.36;
        const clamped = Math.max(0, Math.min(1, pLocal));

        if (clamped <= 0) {
          item.el.style.transform = 'scale(0)';
          item.el.style.opacity = '0';
        } else if (clamped >= 1) {
          item.el.style.transform = 'scale(1)';
          item.el.style.opacity = '1';
        } else {
          const ease = 1 - Math.pow(1 - clamped, 2.0);
          const s = (0.06 + 0.94 * ease).toFixed(3);
          item.el.style.transform = `scale(${s})`;
          item.el.style.opacity = Math.min(1, clamped * 2.2).toFixed(2);
        }
      }
    }

    return { secEl, render, syncScale };
  }).filter(Boolean);

  // Synchronous, zero-lag scroll driver: brisk, responsive growth speed
  function updateScroll() {
    const vh = window.innerHeight;

    for (let i = 0; i < zones.length; i++) {
      const z = zones[i];
      const rect = z.secEl.getBoundingClientRect();

      // Faster growth: begins as section approaches view (vh * 0.95)
      // and flourishes fully within the first 450-520px of scroll!
      const activeTravel = Math.min(rect.height * 0.55, vh * 0.65);
      const traveled = (vh * 0.95) - rect.top;
      const progress = Math.max(0, Math.min(1, traveled / activeTravel));

      z.render(progress);
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial sync
  updateScroll();
}
