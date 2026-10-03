import type { Row } from "../types";

/** Split `width` cells over rows by tokens (largest remainder); any non-empty row keeps at least one. */
export function cells(rows: Row[], width: number): number[] {
  const total = rows.reduce((sum, r) => sum + r.tokens, 0);
  if (total <= 0 || width <= 0) return rows.map(() => 0);

  const exact = rows.map((r) => (r.tokens / total) * width);
  const out = exact.map((x, i) => ((rows[i]?.tokens ?? 0) > 0 ? Math.max(1, Math.floor(x)) : 0));
  let diff = width - out.reduce((a, b) => a + b, 0);

  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac)
    .map((o) => o.i);
  for (let k = 0; diff > 0; k++, diff--) {
    const i = order[k % order.length] ?? 0;
    out[i] = (out[i] ?? 0) + 1;
  }
  // over-allocation from the 1-cell floor: take from the largest rows
  while (diff < 0) {
    const big = out.indexOf(Math.max(...out));
    if ((out[big] ?? 0) <= 1) break;
    out[big] = (out[big] ?? 0) - 1;
    diff += 1;
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

/** Density of the first and last dotted cell of a fresh row. */
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

/** A braille cell with `round(8 * density)` dots (at least one) at positions picked by noise. */
export function dots(cell: number, density: number): string {
  const count = Math.min(8, Math.max(1, Math.round(8 * density)));
  const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => noise(cell, a) - noise(cell, b));
  const mask = order.slice(0, count).reduce((m, d) => m | (1 << d), 0);
  return String.fromCharCode(0x2800 + mask);
}

/**
 * The bar as `width` cells with every row sized in half cells (at least one), so a cell holds
 * at most two rows: a left half over the right half's colour.
 *
 * With `baseline` (the Messages tokens when the turn began), the whole cells the Messages row
 * gained since then are braille dots that thin out to the right. A cell the baseline already
 * reached stays solid however far the row grows. The cell where the grown row meets the next
 * row takes that row's block, with no half block drawn between them.
 */
export function bar(rows: Row[], width: number, baseline?: number): Run[] {
  const owner: number[] = [];
  cells(rows, width * 2).forEach((n, i) => {
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
      run = { text: dots(c, 1 - (1 - FADE_FLOOR) * t), color: l.color };
    } else if (left === m && right !== m && c >= freshFrom) {
      run = { text: FULL[r.kind], color: r.color };
    } else if (left === right || l.color === r.color) {
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
