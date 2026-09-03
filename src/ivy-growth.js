// Scroll-Driven Botanical Ivy Growth Engine
// Preserves the exact hand-drawn botanical ivy illustration (100% pixel fidelity).
// Animates progressive stem path drawing and leaf unfurling linked to scroll progress.

export async function initIvyGrowth() {
  const container = document.getElementById('ivyGrowthSystem');
  if (!container) return;

  // Load leaf metadata and textures
  let leavesData;
  try {
    const res = await fetch('/ivy-leaves.json');
    leavesData = await res.json();
  } catch (err) {
    console.error('Failed to load ivy-leaves.json', err);
    return;
  }

  // Load stem images
  const stemImg = new Image();
  stemImg.src = '/vine-stems-isolated.png';

  const growthMapImg = new Image();
  growthMapImg.src = '/vine-growth-map.png';

  await Promise.all([
    new Promise((resolve) => { stemImg.onload = resolve; }),
    new Promise((resolve) => { growthMapImg.onload = resolve; })
  ]);

  const W = 564;
  const H = 1024;

  // Extract raw pixel data for high-performance stem progress rendering
  const offCanvas = document.createElement('canvas');
  offCanvas.width = W;
  offCanvas.height = H;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

  offCtx.drawImage(stemImg, 0, 0);
  const stemPixels = offCtx.getImageData(0, 0, W, H).data;

  offCtx.clearRect(0, 0, W, H);
  offCtx.drawImage(growthMapImg, 0, 0);
  const mapPixels = offCtx.getImageData(0, 0, W, H).data;

  // Create two botanical ivy instances: Left margin & Right margin
  function createIvyUnit(id, isFlipped, startOffsetProgress = 0) {
    const unitEl = document.createElement('div');
    unitEl.className = `ivy-unit ${isFlipped ? 'ivy-flipped' : ''}`;
    unitEl.id = id;

    // Stem canvas
    const stemCanvas = document.createElement('canvas');
    stemCanvas.className = 'ivy-stem-canvas';
    stemCanvas.width = W;
    stemCanvas.height = H;
    const stemCtx = stemCanvas.getContext('2d');
    const displayData = stemCtx.createImageData(W, H);

    // Leaves container
    const leavesContainer = document.createElement('div');
    leavesContainer.className = 'ivy-leaves-container';

    // Build 177 leaf elements
    const leafElements = leavesData.map((leaf) => {
      const { box, attach, progress } = leaf;
      const [x0, y0, x1, y1] = box;
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      const [ax, ay] = attach;

      const el = document.createElement('div');
      el.className = 'ivy-leaf-node';
      el.style.left = `${x0}px`;
      el.style.top = `${y0}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.backgroundPosition = `-${x0}px -${y0}px`;

      // Transform origin at exact stem attachment point
      const ox = ax - x0;
      const oy = ay - y0;
      el.style.transformOrigin = `${ox}px ${oy}px`;

      leavesContainer.appendChild(el);
      return { el, progress, state: -1 }; // state: -1 = hidden, 1 = visible
    });

    unitEl.appendChild(stemCanvas);
    unitEl.appendChild(leavesContainer);
    container.appendChild(unitEl);

    // Sync leaves coordinate scale with unit width
    function syncScale() {
      const curW = unitEl.clientWidth || 380;
      const s = curW / W;
      leavesContainer.style.transform = `scale(${s})`;
      leavesContainer.style.transformOrigin = 'top left';
      leavesContainer.style.width = `${W}px`;
      leavesContainer.style.height = `${H}px`;
    }
    syncScale();
    window.addEventListener('resize', syncScale, { passive: true });

    let lastProgressByte = -1;

    function update(progress) {
      // Offset progress slightly for natural non-symmetrical growth
      const localP = Math.max(0, Math.min(1, (progress - startOffsetProgress) / (1 - startOffsetProgress)));
      const pByte = Math.round(localP * 255);

      // Render stem canvas when progress changes
      if (pByte !== lastProgressByte) {
        lastProgressByte = pByte;
        const outData = displayData.data;
        const numPixels = W * H;

        // Reveal stem pixels with tender-tip softening at the growth front
        for (let i = 0; i < numPixels; i++) {
          const idx = i * 4;
          const mVal = mapPixels[idx]; // Growth threshold from map
          const sAlpha = stemPixels[idx + 3];

          if (sAlpha > 15 && mVal <= pByte) {
            outData[idx] = stemPixels[idx];
            outData[idx + 1] = stemPixels[idx + 1];
            outData[idx + 2] = stemPixels[idx + 2];

            // Soft tender tip easing for the newest 4 bytes of growth
            if (pByte - mVal < 4) {
              const tipFade = (pByte - mVal + 1) / 4;
              outData[idx + 3] = Math.round(sAlpha * tipFade);
            } else {
              outData[idx + 3] = sAlpha;
            }
          } else {
            outData[idx + 3] = 0;
          }
        }
        stemCtx.putImageData(displayData, 0, 0);
      }

      // Update leaves
      for (let i = 0; i < leafElements.length; i++) {
        const item = leafElements[i];
        const leafP = item.progress;

        if (localP < leafP) {
          if (item.state !== 0) {
            item.el.style.transform = 'scale(0)';
            item.el.style.opacity = '0';
            item.state = 0;
          }
        } else if (localP >= leafP + 0.038) {
          if (item.state !== 2) {
            item.el.style.transform = 'scale(1)';
            item.el.style.opacity = '1';
            item.state = 2;
          }
        } else {
          // Transition window: smooth organic unfurl out from attachment point
          const t = (localP - leafP) / 0.038;
          // Organic ease-out curve
          const easeOut = 1 - Math.pow(1 - t, 2.2);
          const scale = 0.06 + 0.94 * easeOut;
          const opacity = Math.min(1, t * 1.6);
          item.el.style.transform = `scale(${scale.toFixed(3)})`;
          item.el.style.opacity = opacity.toFixed(2);
          item.state = 1;
        }
      }
    }

    return { update };
  }

  // Left vine: starts at top (offset 0.00)
  const leftVine = createIvyUnit('ivyLeft', false, 0.0);
  // Right vine: naturally offset start at ~0.08, giving an organic botanical asymmetry
  const rightVine = createIvyUnit('ivyRight', true, 0.06);

  // Global scroll listener with requestAnimationFrame throttling
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const main = document.getElementById('top') || document.body;
        const mainHeight = main.scrollHeight || document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const maxScroll = Math.max(1, mainHeight - winHeight);

        // Smooth normalized scroll progress 0.0 to 1.0
        const progress = Math.max(0, Math.min(1, scrollY / maxScroll));

        leftVine.update(progress);
        rightVine.update(progress);

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Initial draw
  onScroll();
}
