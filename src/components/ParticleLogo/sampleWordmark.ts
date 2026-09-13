export type Target = { x: number; y: number; edge: number };

const WORD = "VARON";
const TRACK = 0.16;

function measureWord(ctx: CanvasRenderingContext2D, fontSize: number) {
  ctx.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  const gap = fontSize * TRACK;
  const widths = [...WORD].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (WORD.length - 1);
  return { total, widths, gap };
}

function wordWidthRatio(width: number, height: number) {
  const ratio = width / Math.max(1, height);
  if (width < 400) return 0.92;
  if (ratio >= 1.55) return 0.97;
  if (width < 520) return 0.94;
  return 0.97;
}

function fitFont(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const maxW = width * wordWidthRatio(width, height);
  const maxH = height * 0.86;
  let fontSize = Math.min(width * 0.42, maxH / 0.72);
  for (let i = 0; i < 6; i++) {
    const { total } = measureWord(ctx, fontSize);
    const scale = Math.min(1, maxW / Math.max(1, total), maxH / (fontSize * 0.72));
    fontSize *= scale;
    if (scale > 0.985) break;
  }
  return fontSize;
}

function drawWord(ctx: CanvasRenderingContext2D, cx: number, cy: number, fontSize: number) {
  const { widths, gap, total } = measureWord(ctx, fontSize);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#000";
  let x = cx - total / 2;
  for (let i = 0; i < WORD.length; i++) {
    ctx.fillText(WORD[i], x, cy);
    x += widths[i] + gap;
  }
}

/** Sample the live VARON wordmark (Inter 600, 0.16em tracking) into target points. */
export async function sampleWordmark(width: number, height: number, count: number): Promise<Target[]> {
  try {
    await document.fonts.load(`600 64px Inter`);
    await document.fonts.ready;
  } catch {
    /* system fallback is fine */
  }

  const pad = Math.min(width, height) * 0.03;
  const sample = document.createElement("canvas");
  const scale = 3;
  sample.width = Math.max(2, Math.floor(width * scale));
  sample.height = Math.max(2, Math.floor(height * scale));
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.scale(scale, scale);
  const fontSize = fitFont(ctx, width, height);
  drawWord(ctx, width / 2, height / 2, fontSize);

  const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
  const w = sample.width;
  const h = sample.height;
  const ink: Target[] = [];

  const dark = (i: number) => data[i + 3] > 80 && data[i] < 70;
  const idx = (x: number, y: number) => (y * w + x) * 4;

  const step = count >= 800 ? 1 : 2;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (!dark(idx(x, y))) continue;
      let edge = 0;
      if (
        x <= 0 ||
        y <= 0 ||
        x >= w - step ||
        y >= h - step ||
        !dark(idx(x - step, y)) ||
        !dark(idx(x + step, y)) ||
        !dark(idx(x, y - step)) ||
        !dark(idx(x, y + step))
      ) {
        edge = 1;
      }
      const px = x / scale;
      const py = y / scale;
      if (px < pad || py < pad || px > width - pad || py > height - pad) continue;
      ink.push({ x: px, y: py, edge });
    }
  }

  if (!ink.length) return [];

  const edges = ink.filter((p) => p.edge);
  const fill = ink.filter((p) => !p.edge);
  shuffle(edges);
  shuffle(fill);

  const edgeTake = Math.min(edges.length, Math.round(count * 0.3));
  const fillTake = Math.min(fill.length, count - edgeTake);
  const picked = [...edges.slice(0, edgeTake), ...fill.slice(0, fillTake)];

  let extra = 0;
  while (picked.length < count && ink.length) {
    const src = fill[extra % Math.max(1, fill.length)] ?? ink[extra % ink.length];
    extra += 1;
    picked.push({
      x: src.x + (Math.random() - 0.5) * 0.22,
      y: src.y + (Math.random() - 0.5) * 0.22,
      edge: src.edge,
    });
  }

  return picked.slice(0, count).map((p) => ({
    x: p.x + (Math.random() - 0.5) * (p.edge ? 0.03 : 0.05),
    y: p.y + (Math.random() - 0.5) * (p.edge ? 0.03 : 0.05),
    edge: p.edge,
  }));
}

function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

/** Brand mark path from Logo.tsx — evenodd hollow rounded square, viewBox 0 0 100 100. */
const MARK_PATH =
  "M11.3 0H88.7A11.3 11.3 0 0 1 100 11.3V88.7A11.3 11.3 0 0 1 88.7 100H11.3A11.3 11.3 0 0 1 0 88.7V11.3A11.3 11.3 0 0 1 11.3 0ZM21.55 10.25H78.45A11.3 11.3 0 0 1 89.75 21.55V78.45A11.3 11.3 0 0 1 78.45 89.75H21.55A11.3 11.3 0 0 1 10.25 78.45V21.55A11.3 11.3 0 0 1 21.55 10.25Z";

function pickInk(ink: Target[], count: number) {
  if (!ink.length) return [];
  const edges = ink.filter((p) => p.edge);
  const fill = ink.filter((p) => !p.edge);
  shuffle(edges);
  shuffle(fill);
  const edgeTake = Math.min(edges.length, Math.round(count * 0.55));
  const fillTake = Math.min(fill.length, count - edgeTake);
  const picked = [...edges.slice(0, edgeTake), ...fill.slice(0, fillTake)];
  let extra = 0;
  while (picked.length < count && ink.length) {
    const src = ink[extra % ink.length];
    extra += 1;
    picked.push({
      x: src.x + (Math.random() - 0.5) * 0.18,
      y: src.y + (Math.random() - 0.5) * 0.18,
      edge: src.edge,
    });
  }
  return picked.slice(0, count).map((p) => ({
    x: p.x + (Math.random() - 0.5) * 0.04,
    y: p.y + (Math.random() - 0.5) * 0.04,
    edge: p.edge,
  }));
}

function collectInk(ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, count: number) {
  const { data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const pad = Math.min(width, height) * 0.02;
  const ink: Target[] = [];
  const dark = (i: number) => data[i + 3] > 80 && data[i] < 70;
  const idx = (x: number, y: number) => (y * w + x) * 4;
  const step = count >= 800 ? 1 : 2;

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (!dark(idx(x, y))) continue;
      let edge = 0;
      if (
        x <= 0 ||
        y <= 0 ||
        x >= w - step ||
        y >= h - step ||
        !dark(idx(x - step, y)) ||
        !dark(idx(x + step, y)) ||
        !dark(idx(x, y - step)) ||
        !dark(idx(x, y + step))
      ) {
        edge = 1;
      }
      const px = x / scale;
      const py = y / scale;
      if (px < pad || py < pad || px > width - pad || py > height - pad) continue;
      ink.push({ x: px, y: py, edge });
    }
  }
  return ink;
}

/** Sample the hollow rounded-square mark, centered and large in the canvas. */
export function sampleMark(width: number, height: number, count: number): Target[] {
  const sample = document.createElement("canvas");
  const scale = 3;
  sample.width = Math.max(2, Math.floor(width * scale));
  sample.height = Math.max(2, Math.floor(height * scale));
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  const size = Math.min(width, height) * (height / width < 1.05 ? 0.7 : 0.78);
  ctx.scale(scale, scale);
  ctx.translate(width / 2 - size / 2, height / 2 - size / 2);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = "#000";
  ctx.fill(new Path2D(MARK_PATH), "evenodd");

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return pickInk(collectInk(ctx, width, height, scale, count), count);
}

/** Pair each word target to the nearest unused mark target so the morph stays local. */
export function assignMarks(word: Target[], mark: Target[]): Target[] {
  if (!mark.length) return word.map((p) => ({ ...p }));
  const pool = mark.length >= word.length ? mark : pickInk(mark, word.length);
  const used = new Uint8Array(pool.length);
  return word.map((src) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pool.length; i++) {
      if (used[i]) continue;
      const dx = src.x - pool[i].x;
      const dy = src.y - pool[i].y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    used[best] = 1;
    return pool[best];
  });
}

export function particleCount() {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const cores = typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency || 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

  let n = 2680;
  if (vw < 640) n = 980;
  else if (vw < 1024) n = 1680;
  else if (vw >= 1280 && cores >= 8) n = 3100;

  if (saveData) n = Math.round(n * 0.86);
  else if (cores <= 4 && vw >= 1024) n = 2520;
  else if (cores <= 4 && vw >= 640) n = 1540;

  if (vw < 640) return clamp(n, 860, 1100);
  if (vw < 1024) return clamp(n, 1400, 1800);
  return clamp(n, 2300, 3100);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
