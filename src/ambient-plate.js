// Ambient Background Fluid Plate (inspired by shadergradient & react-three-fiber)
// High-performance vanilla WebGL shader plate with zero dependencies.

export function initAmbientPlate() {
  const canvas = document.getElementById('ambientPlateCanvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!gl) return;

  const vsSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Organic simplex noise and soft botanical gradient shader matching Canopy's palette
  const fsSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uScroll;
    uniform vec2 uMouse;

    // Simplex noise approximation
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime * 0.12;

      // Gentle fluid motion with mouse & scroll reaction
      vec2 flow = vec2(
        snoise(uv * 1.6 + vec2(t * 0.4, uScroll * 0.0003)),
        snoise(uv * 1.8 - vec2(t * 0.35, uScroll * 0.0004))
      );

      float n1 = snoise(uv * 2.2 + flow * 0.35 + vec2(uMouse.x * 0.05, -uMouse.y * 0.05));
      float n2 = snoise(uv * 3.5 - flow * 0.25 + t * 0.2);

      // Canopy warm organic palette:
      // Paper base (#f4efdc -> 0.957, 0.937, 0.863)
      // Delicate sage-mist (#dbe3d3 -> 0.859, 0.890, 0.827)
      // Soft morning sun highlight (#fdf8e6 -> 0.992, 0.973, 0.902)
      vec3 cPaper = vec3(0.957, 0.937, 0.863);
      vec3 cSage = vec3(0.859, 0.890, 0.827);
      vec3 cSun = vec3(0.992, 0.973, 0.902);

      float blend1 = smoothstep(-0.6, 0.8, n1);
      float blend2 = smoothstep(-0.4, 0.9, n2);

      vec3 col = mix(cPaper, cSage, blend1 * 0.28);
      col = mix(col, cSun, blend2 * 0.35);

      // Edge vignette softening for seamless blending
      float vignette = smoothstep(0.0, 0.45, uv.x) * smoothstep(1.0, 0.55, uv.x);
      gl_FragColor = vec4(col, 0.42 * (0.8 + 0.2 * vignette));
    }
  `;

  function createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
  const uResLoc = gl.getUniformLocation(prog, 'uResolution');
  const uScrollLoc = gl.getUniformLocation(prog, 'uScroll');
  const uMouseLoc = gl.getUniformLocation(prog, 'uMouse');

  let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
  window.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.parentElement.clientWidth || window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uResLoc, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  let start = performance.now();
  let animId;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(now) {
    if (reduced) return;
    const elapsed = (now - start) * 0.001;
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    gl.uniform1f(uTimeLoc, elapsed);
    gl.uniform1f(uScrollLoc, window.scrollY || window.pageYOffset || 0);
    gl.uniform2f(uMouseLoc, mouseX, mouseY);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animId = requestAnimationFrame(render);
  }
  animId = requestAnimationFrame(render);
}
