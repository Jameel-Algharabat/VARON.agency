import { assignMarks, particleCount, sampleMark, sampleWordmark, type Target } from "./sampleWordmark";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  mx: number;
  my: number;
  homeX: number;
  homeY: number;
  orbitA: number;
  orbitR: number;
  size: number;
  shade: number;
  delay: number;
  edge: number;
  seed: number;
};

const LOOP = 17.6;
const FREE_END = 1.6;
const FORM_END = 6.8;
const HOLD_WORD_END = 10.2;
const TO_MARK_END = 12.2;
const HOLD_MARK_END = 14.0;
const DISSOLVE_END = 16.8;

const SHADES = ["#000000", "#000000", "#000000", "#000000", "#000000"];

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
  if (t < 0.76) return rand(1.65, 2.25);
  if (t < 0.94) return rand(2.3, 2.9);
  return rand(3.05, 3.7);
}

function smooth(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function inSoftField(x: number, y: number, w: number, h: number, reach: number) {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const ang = Math.atan2(ny, nx);
  const edge = 0.8 + 0.2 * Math.sin(ang * 1.55 + 0.4) + 0.14 * Math.cos(ang * 3.8) + 0.09 * Math.sin(ang * 6.4 + 1.2);
  const rx = nx / 0.96;
  const ry = ny / 0.9;
  return rx * rx + ry * ry < (edge * reach) ** 2;
}

function organicHomes(n: number, w: number, h: number) {
  const cx = w * rand(0.46, 0.54);
  const cy = h * rand(0.44, 0.54);
  const inset = 8;
  const clusters: { x: number; y: number; sx: number; sy: number; weight: number }[] = [];
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

  const pickCluster = () => {
    let ticket = Math.random() * weightSum;
    for (const cluster of clusters) {
      ticket -= cluster.weight;
      if (ticket <= 0) return cluster;
    }
    return clusters[clusters.length - 1];
  };

  const sample = (reach: number) => {
    let x = cx;
    let y = cy;
    for (let attempt = 0; attempt < 12; attempt++) {
      const roll = Math.random();
      if (roll < 0.22) {
        const ang = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.42);
        const warp = 0.62 + 0.5 * Math.sin(ang * 2.4 + reach * 3) * Math.cos(ang * 1.3);
        x = cx + Math.cos(ang) * r * w * 0.5 * warp;
        y = cy + Math.sin(ang) * r * h * 0.48 * warp;
      } else if (roll < 0.3) {
        x = cx + gauss() * w * 0.28;
        y = cy + gauss() * h * 0.3;
      } else {
        const cluster = pickCluster();
        x = cluster.x + gauss() * cluster.sx * 0.58;
        y = cluster.y + gauss() * cluster.sy * 0.58;
      }
      if (inSoftField(x, y, w, h, reach)) break;
    }
    return {
      x: clamp(x, inset, w - inset),
      y: clamp(y, inset, h - inset),
    };
  };

  const homes: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) homes.push(sample(i % 5 === 0 ? 1.18 : 1.0));
  return homes;
}

function circleStamp(diameter: number, color: string, dpr: number, cache: Map<string, HTMLCanvasElement>) {
  const d = Math.max(0.8, Math.round(diameter * 4) / 4);
  const key = `${d}|${color}|${dpr}`;
  let stamp = cache.get(key);
  if (!stamp) {
    const pad = 0.85;
    const css = d + pad * 2;
    stamp = document.createElement("canvas");
    stamp.width = Math.max(2, Math.ceil(css * dpr));
    stamp.height = Math.max(2, Math.ceil(css * dpr));
    const g = stamp.getContext("2d");
    if (g) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.fillStyle = color;
      g.beginPath();
      g.arc(css / 2, css / 2, d / 2, 0, Math.PI * 2);
      g.fill();
    }
    cache.set(key, stamp);
  }
  return { stamp, css: d + 1.7 };
}

export type Engine = {
  resize: (w: number, h: number) => Promise<void>;
  setPointer: (x: number, y: number, active: boolean) => void;
  setVisible: (on: boolean) => void;
  setReduced: (on: boolean) => void;
  destroy: () => void;
};

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { resize: async () => {}, setPointer: () => {}, setVisible: () => {}, setReduced: () => {}, destroy: () => {} };
  }

  const stamps = new Map<string, HTMLCanvasElement>();
  let particles: Particle[] = [];
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

  const makeParticles = (word: Target[], mark: Target[], w: number, h: number) => {
    const n = word.length;
    const homes = organicHomes(n, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    return word.map((target, i) => {
      const home = homes[i];
      const markT = mark[i] ?? target;
      return {
        x: home.x,
        y: home.y,
        vx: rand(-0.14, 0.14),
        vy: rand(-0.12, 0.12),
        tx: target.x,
        ty: target.y,
        mx: markT.x,
        my: markT.y,
        homeX: home.x,
        homeY: home.y,
        orbitA: Math.atan2(home.y - cy, home.x - cx) + rand(-0.18, 0.18),
        orbitR: Math.hypot(home.x - cx, home.y - cy),
        size: sizeFor(i, n),
        shade: i % SHADES.length,
        delay: target.edge ? (i / n) * 0.18 : 0.08 + (i / n) * 0.38,
        edge: target.edge,
        seed: Math.random() * Math.PI * 2,
      };
    });
  };

  const reshuffleHomes = (w: number, h: number) => {
    const homes = organicHomes(particles.length, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    for (let i = 0; i < particles.length; i++) {
      particles[i].homeX = homes[i].x;
      particles[i].homeY = homes[i].y;
      particles[i].orbitA = Math.atan2(homes[i].y - cy, homes[i].x - cx);
      particles[i].orbitR = Math.hypot(homes[i].x - cx, homes[i].y - cy);
    }
  };

  const step = (now: number) => {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    emaDt = emaDt * 0.9 + dt * 0.1;
    if (emaDt > 0.02) lite = true;
    else if (emaDt < 0.015) lite = false;
    frame += 1;
    const elapsed = (now - t0) / 1000;
    const cycle = elapsed % LOOP;
    if (prevCycle < HOLD_MARK_END && cycle >= HOLD_MARK_END) reshuffleHomes(cssW, cssH);
    prevCycle = cycle;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = lite ? "low" : "high";
    ctx.clearRect(0, 0, cssW, cssH);

    const formed = cycle >= FORM_END && cycle < HOLD_MARK_END + 0.15;
    const skipNoise = lite && frame % 2 === 0;
    if (pointer) {
      px += (aimX - px) * 0.58;
      py += (aimY - py) * 0.58;
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (reduced) {
        p.x = p.tx + Math.sin(now * 0.00055 + p.seed) * 0.22;
        p.y = p.ty + Math.cos(now * 0.0005 + p.seed) * 0.22;
        continue;
      }

      let ax = 0;
      let ay = 0;

      if (cycle < FREE_END) {
        ax = (p.homeX - p.x) * 0.007;
        ay = (p.homeY - p.y) * 0.007;
        if (!skipNoise || i % 2 === 0) {
          ax += Math.sin(now * 0.0007 + p.seed) * 0.042;
          ay += Math.cos(now * 0.00065 + p.seed * 1.3) * 0.038;
        }
      } else if (cycle < FORM_END) {
        const local = (cycle - FREE_END) / (FORM_END - FREE_END);
        const gate = Math.max(0, Math.min(1, (local - p.delay * 0.42) / 0.55));
        const ease = smooth(gate);
        const curve = (1 - ease) * (1 - ease);
        const destX = p.tx + Math.sin(p.seed) * 16 * curve;
        const destY = p.ty + Math.cos(p.seed * 1.31) * 9 * curve;
        ax = (destX - p.x) * (0.026 + ease * 0.2);
        ay = (destY - p.y) * (0.026 + ease * 0.2);
        if (!lite && curve > 0.02) {
          ax += Math.sin(now * 0.001 + p.seed) * curve * 0.018;
          ay += Math.cos(now * 0.0009 + p.seed) * curve * 0.016;
        }
      } else if (cycle < HOLD_WORD_END) {
        ax = (p.tx - p.x) * 0.5;
        ay = (p.ty - p.y) * 0.5;
        if (!skipNoise || i % 6 === 0) {
          ax += Math.sin(now * 0.001 + p.seed) * 0.0016;
          ay += Math.cos(now * 0.0009 + p.seed) * 0.0016;
        }
      } else if (cycle < TO_MARK_END) {
        const local = (cycle - HOLD_WORD_END) / (TO_MARK_END - HOLD_WORD_END);
        const gate = Math.max(0, Math.min(1, (local - p.delay * 0.28) / 0.68));
        const ease = smooth(gate);
        const arc = (1 - ease) * 14;
        const destX = p.mx + Math.cos(p.orbitA + ease * 0.8) * arc;
        const destY = p.my + Math.sin(p.orbitA + ease * 0.8) * arc * 0.85;
        ax = (destX - p.x) * (0.036 + ease * 0.18);
        ay = (destY - p.y) * (0.036 + ease * 0.18);
      } else if (cycle < HOLD_MARK_END) {
        ax = (p.mx - p.x) * 0.52;
        ay = (p.my - p.y) * 0.52;
        if (!skipNoise || i % 6 === 0) {
          ax += Math.sin(now * 0.001 + p.seed) * 0.0014;
          ay += Math.cos(now * 0.0009 + p.seed) * 0.0014;
        }
      } else if (cycle < DISSOLVE_END) {
        const local = (cycle - HOLD_MARK_END) / (DISSOLVE_END - HOLD_MARK_END);
        const leave = Math.max(0, Math.min(1, (local - (1 - p.edge) * 0.28 - p.delay * 0.14) / 0.52));
        ax = (p.homeX - p.x) * (0.01 + leave * 0.034);
        ay = (p.homeY - p.y) * (0.01 + leave * 0.034);
      } else {
        ax = (p.homeX - p.x) * 0.01;
        ay = (p.homeY - p.y) * 0.01;
        if (!skipNoise || i % 2 === 0) {
          ax += Math.sin(now * 0.0007 + p.seed) * 0.04;
          ay += Math.cos(now * 0.00065 + p.seed * 1.3) * 0.036;
        }
      }

      let pushed = false;
      if (pointer && finePointer) {
        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        const radius = formed ? 56 : 86;
        if (d2 > 0.04 && d2 < radius * radius) {
          const d = Math.sqrt(d2);
          const falloff = (1 - d / radius) ** 1.65;
          const force = falloff * (formed ? 0.72 : 1.15);
          if (formed) {
            ax *= 0.38;
            ay *= 0.38;
          }
          ax += (dx / d) * force;
          ay += (dy / d) * force;
          pushed = true;
        }
      }

      p.vx = (p.vx + ax) * (pushed ? 0.84 : 0.9);
      p.vy = (p.vy + ay) * (pushed ? 0.84 : 0.9);
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;

      const marginX = cssW * 0.045;
      const marginY = cssH * 0.06;
      if (p.x < marginX) p.vx += (marginX - p.x) * 0.018;
      else if (p.x > cssW - marginX) p.vx -= (p.x - (cssW - marginX)) * 0.018;
      if (p.y < marginY) p.vy += (marginY - p.y) * 0.018;
      else if (p.y > cssH - marginY) p.vy -= (p.y - (cssH - marginY)) * 0.018;

      const hard = 2;
      p.x = clamp(p.x, hard, cssW - hard);
      p.y = clamp(p.y, hard, cssH - hard);
    }

    for (let s = 0; s < SHADES.length; s++) {
      const color = SHADES[s];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.shade !== s) continue;
        const drawSize = formed ? p.size * 1.12 : p.size * 1.08;
        const { stamp, css } = circleStamp(drawSize, color, dpr, stamps);
        ctx.drawImage(stamp, p.x - css / 2, p.y - css / 2, css, css);
      }
    }

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
    const gen = ++generation;
    const count = particleCount();
    const word = await sampleWordmark(cssW, cssH, count);
    if (gen !== generation) return;
    const mark = assignMarks(word, sampleMark(cssW, cssH, count));
    particles = makeParticles(word, mark, cssW, cssH);
    if (reduced) {
      for (const p of particles) {
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
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
