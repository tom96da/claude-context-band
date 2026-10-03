import { test, expect } from "claude-code/testing";

import type { Row } from "../types";
import { cells, freePercent } from "./bar";

const rows: Row[] = [
  { name: "sys", tokens: 2400, color: "a", kind: "used" },
  { name: "msg", tokens: 10, color: "b", kind: "used" },
  { name: "free", tokens: 93000, color: "c", kind: "free" },
  { name: "buf", tokens: 4590, color: "d", kind: "buffer" },
];

test("cells fill the width and keep small rows visible", () => {
  for (const w of [10, 40, 60]) {
    const out = cells(rows, w);
    expect(out.reduce((a, b) => a + b, 0)).toBe(w);
    expect(out[1]).toBeGreaterThanOrEqual(1);
  }
});

test("freePercent is free over total", () => {
  expect(freePercent(rows)).toBe(93);
});
