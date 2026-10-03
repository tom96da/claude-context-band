import type { Row } from "../types";

/**
 * Split `width` cells over rows by tokens. Each non-empty row gets its rounded share, at least
 * one. The largest row takes the rounding difference, so a row's size follows its own tokens
 * and does not move when another row grows.
 */
export function cells(rows: Row[], width: number): number[] {
  const total = rows.reduce((sum, r) => sum + r.tokens, 0);
  if (total <= 0 || width <= 0) return rows.map(() => 0);

  const out = rows.map((r) =>
    r.tokens > 0 ? Math.max(1, Math.round((r.tokens / total) * width)) : 0,
  );
  const big = out.indexOf(Math.max(...out));
  out[big] = Math.max(1, (out[big] ?? 0) + width - out.reduce((a, b) => a + b, 0));

  // the one-cell floor can still overshoot when there are more rows than cells: trim the largest
  let rest = width - out.reduce((a, b) => a + b, 0);
  while (rest < 0) {
    const most = out.indexOf(Math.max(...out));
    if ((out[most] ?? 0) <= 1) break;
    out[most] = (out[most] ?? 0) - 1;
    rest += 1;
  }
  return out;
}

export function freePercent(rows: Row[]): number {
  const total = rows.reduce((sum, r) => sum + r.tokens, 0);
  const free = rows.filter((r) => r.kind === "free").reduce((sum, r) => sum + r.tokens, 0);
  return total > 0 ? Math.round((free / total) * 100) : 0;
}

export function short(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/** The compaction buffer last, as /context draws it; the other rows keep their order. */
export function bufferLast(rows: Row[]): Row[] {
  return [...rows.filter((r) => r.kind !== "buffer"), ...rows.filter((r) => r.kind === "buffer")];
}

/** A run of cells drawn alike; `bg` is set on a cell whose two halves belong to different rows. */
export type Run = { text: string; color: string; bg?: string };

const FULL = { used: "█", free: "░", buffer: "▒" } as const;

/** Frames a dotted cell keeps its dots before it picks new positions. */
const TWINKLE_FRAMES = 3;

/** Density of the first and last dotted cell of the growth. */
const FADE_FLOOR = 0.4;

/** The row /context names for the conversation. */
const MESSAGES = "Messages";

/** Tokens of the Messages row, 0 when there is none. */
export function messagesTokens(rows: Row[]): number {
  return rows.find((r) => r.name === MESSAGES)?.tokens ?? 0;
}

/** A stable pseudo-random number in [0, 1) for one dot of one cell. */
function noise(cell: number, dot: number): number {
  let h = Math.imul(cell * 8 + dot + 1, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/**
 * A braille cell with `round(8 * density)` dots (at least one) at positions picked by noise.
 * A different `seed` picks other positions and leaves the count alone.
 */
export function dots(cell: number, density: number, seed = 0): string {
  const count = Math.min(8, Math.max(1, Math.round(8 * density)));
  const key = cell + seed * 1013;
  const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => noise(key, a) - noise(key, b));
  const mask = order.slice(0, count).reduce((m, d) => m | (1 << d), 0);
  return String.fromCharCode(0x2800 + mask);
}

/**
 * The bar as `width` cells with every row sized in half cells (at least one), so a cell holds
 * at most two rows: a left half over the right half's colour. A cell that a solid row shares with
 * a free or buffer row goes to the solid row, since a half block beside their texture would leave
 * an empty half or a solid backdrop that stands out.
 *
 * With `baseline` (the Messages tokens when the turn began), the cells the Messages row gained
 * since then are braille dots that thin out to the right, the last one included even when the
 * row gained only half of it. A cell the baseline already reached stays solid however far the
 * row grows.
 *
 * A cell shared by the free and buffer rows takes one of their textures, since a half block over
 * a solid colour would stand out from both.
 *
 * `frame` makes the dots twinkle. Each cell picks new positions every `TWINKLE_FRAMES` frames,
 * offset by its index so the cells change one after another.
 */
export function bar(rows: Row[], width: number, baseline?: number, frame = 0): Run[] {
  const owner: number[] = [];
  const units = cells(rows, width * 2);
  units.forEach((n, i) => {
    for (let k = 0; k < n; k++) owner.push(i);
  });
  if (width <= 0 || owner.length < width * 2) return [];

  const m = rows.findIndex((r) => r.name === MESSAGES);
  const freshFrom = freshStart(rows, owner, m, width, baseline);
  const whole: number[] = [];
  for (let c = freshFrom; c < width; c++) {
    if (owner[c * 2] === m && owner[c * 2 + 1] === m) whole.push(c);
  }

  const runs: Run[] = [];
  for (let c = 0; c < width; c++) {
    const left = owner[c * 2] ?? 0;
    const right = owner[c * 2 + 1] ?? 0;
    const l = rows[left];
    const r = rows[right];
    if (!l || !r) continue;

    let run: Run;
    if (left === m && right === m && c >= freshFrom) {
      const t = (whole.indexOf(c) + 1) / whole.length;
      run = {
        text: dots(c, 1 - (1 - FADE_FLOOR) * t, Math.floor((frame + c) / TWINKLE_FRAMES)),
        color: l.color,
      };
    } else if (left === m && right !== m && c >= freshFrom) {
      // the half cell the row gained at its end, rounded up to a cell of dots
      run = {
        text: dots(c, FADE_FLOOR, Math.floor((frame + c) / TWINKLE_FRAMES)),
        color: l.color,
      };
    } else if (left === right || l.color === r.color) {
      run = { text: FULL[l.kind], color: l.color };
    } else if (l.kind !== "used" && r.kind !== "used") {
      // two textured rows share the cell: it takes the left texture, unless the right row would vanish
      const keep = (units[right] ?? 0) <= 1 ? r : l;
      run = { text: FULL[keep.kind], color: keep.color };
    } else if (r.kind !== "used") {
      // a textured row follows: the solid row keeps the shared cell
      run = { text: FULL[l.kind], color: l.color };
    } else {
      run = { text: "▌", color: l.color, bg: r.color };
    }

    const last = runs[runs.length - 1];
    if (last && last.color === run.color && last.bg === run.bg) last.text += run.text;
    else runs.push(run);
  }
  return runs;
}

/**
 * The first cell that may show growth, or `Infinity` when there is none. The Messages row as
 * the baseline sized it ends at a half cell, and the cell holding that end stays solid.
 */
function freshStart(
  rows: Row[],
  owner: number[],
  m: number,
  width: number,
  baseline: number | undefined,
): number {
  const row = rows[m];
  const free = rows.findIndex((r) => r.kind === "free");
  if (!row || baseline === undefined || free < 0) return Infinity;

  const delta = row.tokens - baseline;
  if (!(delta > 0)) return Infinity;

  const before = rows.map((r, i) => {
    if (i === m) return { ...r, tokens: baseline };
    return i === free ? { ...r, tokens: r.tokens + delta } : r;
  });
  const units = cells(before, width * 2);
  const now = owner.filter((o) => o === m).length;
  const base = Math.min(now, units[m] ?? 0);
  const start = owner.indexOf(m);

  return Math.ceil((start + base) / 2);
}
