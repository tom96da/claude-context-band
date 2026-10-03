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
