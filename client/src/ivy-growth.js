// Continuous Botanical Ivy Growth Engine
// - Single continuous botanical vine that unfurls and branches as the user scrolls through #contentTrack to the end of the site
// - Zero gap: absolute container with sticky flex rail spanning #problem to #connect
// - Hero section is 100% clean and minimal (zero ivy)
// - Polished, high-contrast forest-green stems (#2a4635) and velvety sage leaves
// - Emil Kowalski animation principles: critically damped lerp, organic blooming ease, and fluid micro-transitions

export async function initIvyGrowth() {
  const container = document.getElementById('ivyGrowthSystem');
  const track = document.getElementById('contentTrack');
  if (!container || !track) return;

  container.innerHTML = '';

  // Create sticky flex rail inside container (0 flow height, perfect sticky pinning)
  const rail = document.createElement('div');
  rail.className = 'ivy-sticky-rail';
  container.appendChild(rail);

  // Load leaf metadata (177 leaves with precise attachment points & growth timings)
  let leavesData;
  try {
    const res = await fetch('/ivy-leaves.json');
    leavesData = await res.json();
  } catch (err) {
    console.error('Failed to load ivy-leaves.json', err);
    return;
  }

  // Load stem and growth map images
  function loadImg(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  const [stemImg, growthMapImg] = await Promise.all([
    loadImg('/vine-stems-isolated.png'),
    loadImg('/vine-growth-map.png')
  ]);

  if (!stemImg || !growthMapImg) {
    console.warn('ivy-growth: source images not found');
    return;
  }

  const W = 564;
  const H = 1024;

  // Extract raw pixel data once
  const offC = document.createElement('canvas');
  offC.width = W;
  offC.height = H;
  const offCtx = offC.getContext('2d', { willReadFrequently: true });

  offCtx.drawImage(stemImg, 0, 0);
  const stemPx = offCtx.getImageData(0, 0, W, H).data;

  offCtx.clearRect(0, 0, W, H);
  offCtx.drawImage(growthMapImg, 0, 0);
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

  // Create Left and Right ivy units
  function createUnit(id, isFlipped, lagOffset = 0) {
    const unitEl = document.createElement('div');
    unitEl.className = 'ivy-unit';
    unitEl.id = id;

    // Stem canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'ivy-stem-canvas';
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const drawData = ctx.createImageData(W, H);

    // Leaves container
    const leavesContainer = document.createElement('div');
    leavesContainer.className = 'ivy-leaves-container';

    // 177 polished leaves
    const leafNodes = leavesData.map((leaf) => {
      const { box, attach, progress } = leaf;
      const [x0, y0, x1, y1] = box;
      const [ax, ay] = attach;

      const el = document.createElement('div');
      el.className = 'ivy-leaf-node';
      el.style.left = `${x0}px`;
      el.style.top = `${y0}px`;
      el.style.width = `${x1 - x0 + 1}px`;
      el.style.height = `${y1 - y0 + 1}px`;
      el.style.backgroundPosition = `-${x0}px -${y0}px`;

      // Pivot exactly at petiole connection node on stem
      el.style.transformOrigin = `${ax - x0}px ${ay - y0}px`;
      el.style.willChange = 'transform, opacity';

      leavesContainer.appendChild(el);

      return {
        el,
        progress,
        state: -1
      };
    });

    unitEl.appendChild(canvas);
    unitEl.appendChild(leavesContainer);
    rail.appendChild(unitEl);

    // Coordinate scale
    function syncScale() {
      const curW = unitEl.clientWidth || 220;
      const s = curW / W;
      leavesContainer.style.transform = `scale(${s})`;
      leavesContainer.style.transformOrigin = 'top left';
      leavesContainer.style.width = `${W}px`;
      leavesContainer.style.height = `${H}px`;
    }
    syncScale();
    window.addEventListener('resize', syncScale, { passive: true });

    let currentDrawnByte = 0;
    const UNFURL_WINDOW = 0.040; // gradual organic unfurl window

    function update(globalP) {
      // Natural lag offset for right vine gives organic asymmetry
      const p = Math.max(0, Math.min(1, (globalP - lagOffset) / (1 - lagOffset)));
      const targetByte = Math.round(p * 255);

      // 1. Fast incremental stem reveal with tender-tip easing
      if (targetByte > currentDrawnByte) {
        const out = drawData.data;
        for (let b = currentDrawnByte + 1; b <= targetByte; b++) {
          const list = buckets[b];
          for (let k = 0; k < list.length; k++) {
            const idx = list[k];
            out[idx] = stemPx[idx];
            out[idx + 1] = stemPx[idx + 1];
            out[idx + 2] = stemPx[idx + 2];

            // Soft tender tip easing at the leading growth front
            const diff = targetByte - b;
            if (diff < 5) {
              out[idx + 3] = Math.round(stemPx[idx + 3] * ((diff + 1) / 5));
            } else {
              out[idx + 3] = stemPx[idx + 3];
            }
          }
        }
        currentDrawnByte = targetByte;
        ctx.putImageData(drawData, 0, 0);
      } else if (targetByte < currentDrawnByte) {
        const out = drawData.data;
        for (let b = currentDrawnByte; b > targetByte; b--) {
          const list = buckets[b];
          for (let k = 0; k < list.length; k++) {
            out[list[k] + 3] = 0;
          }
        }
        currentDrawnByte = targetByte;
        ctx.putImageData(drawData, 0, 0);
      }

      // 2. Emil Kowalski organic blooming ease:
      // Gentle start, swift blossoming expansion, soft cushioned settlement
      for (let i = 0; i < leafNodes.length; i++) {
        const item = leafNodes[i];
        const leafP = item.progress;

        if (p < leafP) {
          if (item.state !== 0) {
            item.el.style.transform = 'scale(0)';
            item.el.style.opacity = '0';
            item.state = 0;
          }
        } else if (p >= leafP + UNFURL_WINDOW) {
          if (item.state !== 2) {
            item.el.style.transform = 'scale(1)';
            item.el.style.opacity = '1';
            item.state = 2;
          }
        } else {
          const t = (p - leafP) / UNFURL_WINDOW;
          // Organic ease curve
          const ease = 1 - Math.pow(1 - t, 2.4);
          const s = (0.05 + 0.95 * ease).toFixed(3);
          item.el.style.transform = `scale(${s})`;
          item.el.style.opacity = Math.min(1, t * 1.6).toFixed(2);
          item.state = 1;
        }
      }
    }

    return { update };
  }

  // Create Left and Right framing units
  const leftUnit = createUnit('ivyLeft', false, 0.0);
  const rightUnit = createUnit('ivyRight', true, 0.05);

  // Smooth scroll progression calculation
  function getTargetProgress() {
    const trackRect = track.getBoundingClientRect();
    const vh = window.innerHeight;

    // Track starts right at #problem and finishes at the bottom of #connect
    // The hero section is completely clean: when trackRect.top > vh * 0.4, progress is strictly 0.
    // As #problem scrolls up toward view, growth begins gently.
    const startThreshold = vh * 0.4;
    const totalTravel = trackRect.height + startThreshold - vh;
    if (totalTravel <= 0) return 0;

    const scrolled = startThreshold - trackRect.top;
    return Math.max(0, Math.min(1, scrolled / totalTravel));
  }

  // Emil Kowalski smooth animation loop:
  // Critically damped spring / lerp motion so wheel scrolling glides with organic fluidity
  let targetProgress = 0;
  let currentProgress = 0;
  let isRunning = true;

  function onScroll() {
    targetProgress = getTargetProgress();
  }

  function loop() {
    // Smooth damping: glides gradually and settles smoothly
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0002) {
      currentProgress += diff * 0.12;
      leftUnit.update(currentProgress);
      rightUnit.update(currentProgress);
    }

    if (isRunning) {
      requestAnimationFrame(loop);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial sync
  onScroll();
  currentProgress = targetProgress;
  leftUnit.update(currentProgress);
  rightUnit.update(currentProgress);

  requestAnimationFrame(loop);
}
