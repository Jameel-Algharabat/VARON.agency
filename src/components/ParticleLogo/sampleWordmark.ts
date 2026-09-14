export type Target = { x: number; y: number; edge: number };

const SRC = "/varon-wordmark.png";
const MARK_W = 868;
const MARK_H = 178;

let mark: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement> | null = null;

function loadMark() {
  if (mark?.complete && mark.naturalWidth) return Promise.resolve(mark);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      mark = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error("wordmark failed to load"));
    img.src = SRC;
  });
  return loading;
}

function shuffle<T>(list: T[]) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Sample the live VARON wordmark PNG, fitted the same way as object-contain. */
export async function sampleWordmark(width: number, height: number, count: number): Promise<Target[]> {
  let img: HTMLImageElement;
  try {
    img = await loadMark();
  } catch {
    return [];
  }

  const scale = 2;
  const fit = Math.min(width / MARK_W, height / MARK_H);
  const dw = MARK_W * fit;
  const dh = MARK_H * fit;
  const ox = (width - dw) / 2;
  const oy = (height - dh) / 2;

  const sw = Math.max(2, Math.round(dw * scale));
  const sh = Math.max(2, Math.round(dh * scale));
  const sample = document.createElement("canvas");
  sample.width = sw;
  sample.height = sh;
  const ctx = sample.getContext("2d", { willReadFrequently: true, alpha: true });
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, sw, sh);

  const { data } = ctx.getImageData(0, 0, sw, sh);
  const ink: Target[] = [];
  const inked = (i: number) => data[i + 3] > 80;
  const idx = (x: number, y: number) => (y * sw + x) * 4;
  const sx = dw / sw;
  const sy = dh / sh;

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      if (!inked(idx(x, y))) continue;
      let edge = 0;
      if (
        x <= 0 ||
        y <= 0 ||
        x >= sw - 1 ||
        y >= sh - 1 ||
        !inked(idx(x - 1, y)) ||
        !inked(idx(x + 1, y)) ||
        !inked(idx(x, y - 1)) ||
        !inked(idx(x, y + 1))
      ) {
        edge = 1;
      }
      ink.push({ x: ox + x * sx, y: oy + y * sy, edge });
    }
  }

  if (!ink.length) return [];

  const edges = ink.filter((p) => p.edge);
  const fill = ink.filter((p) => !p.edge);
  shuffle(edges);
  shuffle(fill);

  const edgeTake = Math.min(edges.length, Math.round(count * 0.34));
  const fillTake = Math.min(fill.length, count - edgeTake);
  const picked = [...edges.slice(0, edgeTake), ...fill.slice(0, fillTake)];

  let extra = 0;
  while (picked.length < count && ink.length) {
    const src = fill[extra % Math.max(1, fill.length)] ?? ink[extra % ink.length];
    extra += 1;
    picked.push({
      x: src.x + (Math.random() - 0.5) * 0.18,
      y: src.y + (Math.random() - 0.5) * 0.18,
      edge: src.edge,
    });
  }

  return picked.slice(0, count).map((p) => ({
    x: p.x + (Math.random() - 0.5) * (p.edge ? 0.025 : 0.045),
    y: p.y + (Math.random() - 0.5) * (p.edge ? 0.025 : 0.045),
    edge: p.edge,
  }));
}

export function particleCount() {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const cores = typeof navigator === "undefined" ? 8 : navigator.hardwareConcurrency || 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

  let n = 4600;
  if (vw < 640) n = 2000;
  else if (vw < 1024) n = 3200;
  else if (vw >= 1280 && cores >= 8) n = 5200;

  if (saveData) n = Math.round(n * 0.78);
  else if (cores <= 4 && vw >= 1024) n = 4200;
  else if (cores <= 4 && vw >= 640) n = 2800;

  if (vw < 640) return clamp(n, 1600, 2400);
  if (vw < 1024) return clamp(n, 2600, 3600);
  return clamp(n, 3800, 5200);
}
