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

/**
 * The bar as `width` cells with every row sized in half cells (at least one), so a cell holds
 * at most two rows: a left half over the right half's colour.
 */
export function bar(rows: Row[], width: number): Run[] {
  const owner: number[] = [];
  cells(rows, width * 2).forEach((n, i) => {
    for (let k = 0; k < n; k++) owner.push(i);
  });
  if (width <= 0 || owner.length < width * 2) return [];

  const runs: Run[] = [];
  for (let c = 0; c < width; c++) {
    const left = owner[c * 2] ?? 0;
    const right = owner[c * 2 + 1] ?? 0;
    const l = rows[left];
    const r = rows[right];
    if (!l || !r) continue;

    const run: Run =
      left === right
        ? { text: FULL[l.kind], color: l.color }
        : { text: "▌", color: l.color, bg: r.color };

    const last = runs[runs.length - 1];
    if (last && last.color === run.color && last.bg === run.bg) last.text += run.text;
    else runs.push(run);
  }
  return runs;
}
