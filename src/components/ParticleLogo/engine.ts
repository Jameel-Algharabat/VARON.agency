import { particleCount, sampleWordmark, type Target } from "./sampleWordmark";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  homeX: number;
  homeY: number;
  delay: number;
  edge: number;
  seed: number;
  size: number;
  cr: number;
  cg: number;
  cb: number;
  stampFree?: { img: HTMLCanvasElement; css: number };
  stampFormed?: { img: HTMLCanvasElement; css: number };
};

type Cluster = { x: number; y: number; sx: number; sy: number; weight: number };

type ScatterField = {
  cx: number;
  cy: number;
  inset: number;
  w: number;
  h: number;
  clusters: Cluster[];
  weightSum: number;
  i: number;
};

const LOOP = 14.8;
const FREE_END = 1.8;
const FORM_END = 6.0;
const HOLD_END = 9.6;
const DISSOLVE_END = 13.2;

const SHADE_RGB: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 0],
  [17 / 255, 17 / 255, 17 / 255],
  [23 / 255, 23 / 255, 23 / 255],
  [0, 0, 0],
];
const SHADE_HEX = ["#000000", "#000000", "#111111", "#171717", "#000000"];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function sizeFor(i: number, n: number) {
  const t = i / n;
  if (t < 0.82) return rand(1.05, 1.55);
  if (t < 0.95) return rand(1.55, 2.05);
  return rand(2.1, 2.5);
}

function smooth(t: number) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

function clamp(n: number, min: number, max: number) {
  return n < min ? min : n > max ? max : n;
}

function inSoftField(x: number, y: number, w: number, h: number, reach: number) {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const ang = Math.atan2(ny, nx);
  const edge = 0.8 + 0.2 * Math.sin(ang * 1.55 + 0.4) + 0.14 * Math.cos(ang * 3.8) + 0.09 * Math.sin(ang * 6.4 + 1.2);
  const rx = nx / 0.96;
  const ry = ny / 0.9;
  const lim = edge * reach;
  return rx * rx + ry * ry < lim * lim;
}

function createField(w: number, h: number): ScatterField {
  const cx = w * rand(0.46, 0.54);
  const cy = h * rand(0.44, 0.54);
  const clusters: Cluster[] = [];
  const count = 6 + Math.floor(Math.random() * 3);
  let weightSum = 0;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + rand(-0.7, 0.7);
    const dist = rand(0.08, 0.4);
    const cluster = {
      x: cx + Math.cos(ang) * dist * w,
      y: cy + Math.sin(ang) * dist * h,
      sx: w * rand(0.16, 0.34),
      sy: h * rand(0.18, 0.38),
      weight: rand(0.35, 1.2),
    };
    weightSum += cluster.weight;
    clusters.push(cluster);
  }
  return { cx, cy, inset: 8, w, h, clusters, weightSum, i: 0 };
}

function pickCluster(field: ScatterField) {
  let ticket = Math.random() * field.weightSum;
  for (let c = 0; c < field.clusters.length; c++) {
    ticket -= field.clusters[c].weight;
    if (ticket <= 0) return field.clusters[c];
  }
  return field.clusters[field.clusters.length - 1];
}

function sampleField(field: ScatterField, reach: number) {
  let x = field.cx;
  let y = field.cy;
  for (let attempt = 0; attempt < 8; attempt++) {
    const roll = Math.random();
    if (roll < 0.22) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.42);
      const warp = 0.62 + 0.5 * Math.sin(ang * 2.4 + reach * 3) * Math.cos(ang * 1.3);
      x = field.cx + Math.cos(ang) * r * field.w * 0.5 * warp;
      y = field.cy + Math.sin(ang) * r * field.h * 0.48 * warp;
    } else if (roll < 0.3) {
      x = field.cx + gauss() * field.w * 0.28;
      y = field.cy + gauss() * field.h * 0.3;
    } else {
      const cluster = pickCluster(field);
      x = cluster.x + gauss() * cluster.sx * 0.58;
      y = cluster.y + gauss() * cluster.sy * 0.58;
    }
    if (inSoftField(x, y, field.w, field.h, reach)) break;
  }
  return {
    x: clamp(x, field.inset, field.w - field.inset),
    y: clamp(y, field.inset, field.h - field.inset),
  };
}

function fillHomes(field: ScatterField, particles: Particle[], budget: number) {
  const n = particles.length;
  const end = Math.min(n, field.i + budget);
  for (; field.i < end; field.i++) {
    const pos = sampleField(field, field.i % 5 === 0 ? 1.18 : 1.0);
    particles[field.i].homeX = pos.x;
    particles[field.i].homeY = pos.y;
  }
  return field.i >= n;
}

function circleStamp(diameter: number, color: string, dpr: number, cache: Map<string, { img: HTMLCanvasElement; css: number }>) {
  const d = Math.max(0.8, Math.round(diameter * 4) / 4);
  const key = `${d}|${color}|${dpr}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pad = 0.85;
  const css = d + pad * 2;
  const img = document.createElement("canvas");
  img.width = Math.max(2, Math.ceil(css * dpr));
  img.height = Math.max(2, Math.ceil(css * dpr));
  const g = img.getContext("2d");
  if (g) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = color;
    g.beginPath();
    g.arc(css / 2, css / 2, d / 2, 0, Math.PI * 2);
    g.fill();
  }
  const stamp = { img, css: d + 1.7 };
  cache.set(key, stamp);
  return stamp;
}

const VERT = `
attribute vec2 a_pos;
attribute float a_size;
attribute vec3 a_color;
uniform vec2 u_res;
uniform float u_dpr;
varying vec3 v_color;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(a_size * u_dpr, 1.0);
  v_color = a_color;
}
`;

const FRAG = `
precision mediump float;
varying vec3 v_color;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float alpha = 1.0 - smoothstep(0.78, 1.0, d);
  gl_FragColor = vec4(v_color * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initGpu(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  const buffer = gl.createBuffer();
  if (!buffer) return null;

  return {
    program,
    buffer,
    aPos: gl.getAttribLocation(program, "a_pos"),
    aSize: gl.getAttribLocation(program, "a_size"),
    aColor: gl.getAttribLocation(program, "a_color"),
    uRes: gl.getUniformLocation(program, "u_res"),
    uDpr: gl.getUniformLocation(program, "u_dpr"),
  };
}

function getGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  const opts: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  };
  const context = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  return context instanceof WebGLRenderingContext ? context : null;
}

export type Engine = {
  resize: (w: number, h: number) => Promise<void>;
  setPointer: (x: number, y: number, active: boolean) => void;
  setVisible: (on: boolean) => void;
  setReduced: (on: boolean) => void;
  destroy: () => void;
};

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const gl = getGL(canvas);
  const gpu = gl ? initGpu(gl) : null;
  const ctx = gpu ? null : canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!gpu && !ctx) {
    return { resize: async () => {}, setPointer: () => {}, setVisible: () => {}, setReduced: () => {}, destroy: () => {} };
  }

  const stamps = new Map<string, { img: HTMLCanvasElement; css: number }>();
  let particles: Particle[] = [];
  let packed = new Float32Array(0);
  let packedBytes = 0;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  let raf = 0;
  let last = performance.now();
  let t0 = performance.now();
  let visible = true;
  let reduced = false;
  let px = 0;
  let py = 0;
  let aimX = 0;
  let aimY = 0;
  let pointer = false;
  let finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let generation = 0;
  let prevCycle = 0;
  let emaDt = 1 / 60;
  let lite = false;
  let frame = 0;
  let scatter: ScatterField | null = null;

  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const onFine = () => {
    finePointer = fineQuery.matches;
  };
  fineQuery.addEventListener("change", onFine);

  const makeParticles = (word: Target[], w: number, h: number) => {
    const n = word.length;
    const field = createField(w, h);
    const list = new Array<Particle>(n);
    for (let i = 0; i < n; i++) {
      const target = word[i];
      const home = sampleField(field, i % 5 === 0 ? 1.18 : 1.0);
      const size = sizeFor(i, n);
      const rgb = SHADE_RGB[i % SHADE_RGB.length];
      const hex = SHADE_HEX[i % SHADE_HEX.length];
      const p: Particle = {
        x: home.x,
        y: home.y,
        vx: rand(-0.14, 0.14),
        vy: rand(-0.12, 0.12),
        tx: target.x,
        ty: target.y,
        homeX: home.x,
        homeY: home.y,
        delay: target.edge ? (i / n) * 0.16 : 0.06 + (i / n) * 0.34,
        edge: target.edge,
        seed: Math.random() * Math.PI * 2,
        size,
        cr: rgb[0],
        cg: rgb[1],
        cb: rgb[2],
      };
      if (ctx) {
        p.stampFree = circleStamp(size * 1.06, hex, dpr, stamps);
        p.stampFormed = circleStamp(size * 1.12, hex, dpr, stamps);
      }
      list[i] = p;
    }
    packed = new Float32Array(n * 6);
    return list;
  };

  const drawGpu = (formed: boolean) => {
    if (!gl || !gpu) return;
    const n = particles.length;
    const sizeMul = formed ? 1.12 : 1.06;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const o = i * 6;
      packed[o] = p.x;
      packed[o + 1] = p.y;
      packed[o + 2] = p.size * sizeMul;
      packed[o + 3] = p.cr;
      packed[o + 4] = p.cg;
      packed[o + 5] = p.cb;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(gpu.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.buffer);
    if (packedBytes !== packed.byteLength) {
      gl.bufferData(gl.ARRAY_BUFFER, packed, gl.DYNAMIC_DRAW);
      packedBytes = packed.byteLength;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed);
    }

    const stride = 24;
    gl.enableVertexAttribArray(gpu.aPos);
    gl.vertexAttribPointer(gpu.aPos, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(gpu.aSize);
    gl.vertexAttribPointer(gpu.aSize, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(gpu.aColor);
    gl.vertexAttribPointer(gpu.aColor, 3, gl.FLOAT, false, stride, 12);
    gl.uniform2f(gpu.uRes, cssW, cssH);
    gl.uniform1f(gpu.uDpr, dpr);
    gl.drawArrays(gl.POINTS, 0, n);
  };

  const drawCanvas = (formed: boolean) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, cssW, cssH);
    const n = particles.length;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const stamp = formed ? p.stampFormed : p.stampFree;
      if (!stamp) continue;
      const half = stamp.css * 0.5;
      ctx.drawImage(stamp.img, p.x - half, p.y - half, stamp.css, stamp.css);
    }
  };

  const step = (now: number) => {
    raf = 0;
    if (!visible) return;
    const rawDt = (now - last) / 1000;
    const dt = rawDt > 0.032 ? 0.032 : rawDt;
    last = now;
    emaDt = emaDt * 0.9 + dt * 0.1;
    if (emaDt > 0.02) lite = true;
    else if (emaDt < 0.015) lite = false;
    frame += 1;
    const elapsed = (now - t0) / 1000;
    const cycle = elapsed % LOOP;
    if (prevCycle < FORM_END + 0.35 && cycle >= FORM_END + 0.35) {
      scatter = createField(cssW, cssH);
    }
    if (scatter && cycle >= FORM_END + 0.35 && cycle < HOLD_END) {
      const done = fillHomes(scatter, particles, lite ? 90 : 180);
      if (done) scatter = null;
    }
    prevCycle = cycle;

    const formed = cycle >= FORM_END && cycle < HOLD_END + 0.12;
    const skipNoise = lite && (frame & 1) === 0;
    const follow = pointer ? 0.52 : 0.18;
    px += (aimX - px) * follow;
    py += (aimY - py) * follow;

    const dAimX = aimX - px;
    const dAimY = aimY - py;
    const pointerLive = finePointer && (pointer || dAimX * dAimX + dAimY * dAimY > 0.16);
    const radius = formed ? 72 : 98;
    const radius2 = radius * radius;
    const live = pointer ? 1 : 0.35;
    const forceScale = formed ? 0.88 : 1.22;
    const n = particles.length;
    const stepScale = dt * 60;
    const marginX = cssW * 0.03;
    const marginY = cssH * 0.045;
    const right = cssW - marginX;
    const bottom = cssH - marginY;
    const hardMaxX = cssW - 2;
    const hardMaxY = cssH - 2;
    const tFreeA = now * 0.0007;
    const tFreeB = now * 0.00065;
    const tHoldA = now * 0.001;
    const tHoldB = now * 0.0009;
    const tReduceA = now * 0.00055;
    const tReduceB = now * 0.0005;

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      if (reduced) {
        p.x = p.tx + Math.sin(tReduceA + p.seed) * 0.22;
        p.y = p.ty + Math.cos(tReduceB + p.seed) * 0.22;
        continue;
      }

      let ax = 0;
      let ay = 0;

      if (cycle < FREE_END) {
        ax = (p.homeX - p.x) * 0.018;
        ay = (p.homeY - p.y) * 0.018;
        if (!skipNoise || (i & 1) === 0) {
          ax += Math.sin(tFreeA + p.seed) * 0.038;
          ay += Math.cos(tFreeB + p.seed * 1.3) * 0.034;
        }
      } else if (cycle < FORM_END) {
        const local = (cycle - FREE_END) / (FORM_END - FREE_END);
        const gate = local - p.delay * 0.38;
        const eased = smooth(gate > 0 ? (gate < 0.58 ? gate / 0.58 : 1) : 0);
        const curve = (1 - eased) * (1 - eased);
        const destX = p.tx + Math.sin(p.seed) * 14 * curve;
        const destY = p.ty + Math.cos(p.seed * 1.31) * 8 * curve;
        const pull = 0.028 + eased * 0.22;
        ax = (destX - p.x) * pull;
        ay = (destY - p.y) * pull;
        if (!lite && curve > 0.02) {
          ax += Math.sin(tHoldA + p.seed) * curve * 0.016;
          ay += Math.cos(tHoldB + p.seed) * curve * 0.014;
        }
      } else if (cycle < HOLD_END) {
        ax = (p.tx - p.x) * 0.48;
        ay = (p.ty - p.y) * 0.48;
        if (!skipNoise || i % 6 === 0) {
          ax += Math.sin(tHoldA + p.seed) * 0.0015;
          ay += Math.cos(tHoldB + p.seed) * 0.0015;
        }
      } else if (cycle < DISSOLVE_END) {
        const local = (cycle - HOLD_END) / (DISSOLVE_END - HOLD_END);
        const leave = local - (1 - p.edge) * 0.22 - p.delay * 0.12;
        const eased = smooth(leave > 0 ? (leave < 0.55 ? leave / 0.55 : 1) : 0);
        const pull = 0.012 + eased * 0.038;
        ax = (p.homeX - p.x) * pull;
        ay = (p.homeY - p.y) * pull;
        if (!skipNoise || (i & 1) === 0) {
          ax += Math.sin(tFreeA + p.seed) * eased * 0.03;
          ay += Math.cos(tFreeB + p.seed * 1.3) * eased * 0.026;
        }
      } else {
        ax = (p.homeX - p.x) * 0.016;
        ay = (p.homeY - p.y) * 0.016;
        if (!skipNoise || (i & 1) === 0) {
          ax += Math.sin(tFreeA + p.seed) * 0.038;
          ay += Math.cos(tFreeB + p.seed * 1.3) * 0.034;
        }
      }

      let pushed = false;
      if (pointerLive) {
        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.04 && d2 < radius2) {
          const d = Math.sqrt(d2);
          const falloff = (1 - d / radius) ** 1.55;
          const force = falloff * live * forceScale;
          if (formed) {
            ax *= 0.32;
            ay *= 0.32;
          }
          const inv = force / d;
          ax += dx * inv;
          ay += dy * inv;
          pushed = true;
        }
      }

      const damp = pushed ? 0.82 : 0.88;
      p.vx = (p.vx + ax) * damp;
      p.vy = (p.vy + ay) * damp;
      p.x += p.vx * stepScale;
      p.y += p.vy * stepScale;

      if (p.x < marginX) p.vx += (marginX - p.x) * 0.02;
      else if (p.x > right) p.vx -= (p.x - right) * 0.02;
      if (p.y < marginY) p.vy += (marginY - p.y) * 0.02;
      else if (p.y > bottom) p.vy -= (p.y - bottom) * 0.02;

      if (p.x < 2) p.x = 2;
      else if (p.x > hardMaxX) p.x = hardMaxX;
      if (p.y < 2) p.y = 2;
      else if (p.y > hardMaxY) p.y = hardMaxY;
    }

    if (gpu) drawGpu(formed);
    else drawCanvas(formed);

    raf = window.requestAnimationFrame(step);
  };

  const play = () => {
    if (raf || !visible) return;
    last = performance.now();
    raf = window.requestAnimationFrame(step);
  };

  const resize = async (w: number, h: number) => {
    const nextW = Math.max(1, Math.floor(w));
    const nextH = Math.max(1, Math.floor(h));
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextW === cssW && nextH === cssH && nextDpr === dpr && particles.length) return;

    cssW = nextW;
    cssH = nextH;
    dpr = nextDpr;
    stamps.clear();
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    const gen = ++generation;
    const word = await sampleWordmark(cssW, cssH, particleCount());
    if (gen !== generation) return;
    particles = makeParticles(word, cssW, cssH);
    scatter = null;
    if (reduced) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.tx;
        p.y = p.ty;
        p.vx = 0;
        p.vy = 0;
      }
    }
    t0 = performance.now();
    play();
  };

  return {
    resize,
    setPointer: (x, y, active) => {
      aimX = x;
      aimY = y;
      if (active && !pointer) {
        px = x;
        py = y;
      }
      pointer = active;
    },
    setVisible: (on) => {
      visible = on;
      if (on) play();
      else if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    setReduced: (on) => {
      reduced = on;
    },
    destroy: () => {
      generation += 1;
      stamps.clear();
      fineQuery.removeEventListener("change", onFine);
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
