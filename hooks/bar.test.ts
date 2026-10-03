import { test, expect } from "claude-code/testing";

import type { Row } from "../types";
import { bufferLast, cells, freePercent } from "./bar";

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

test("bufferLast moves the buffer to the end and keeps the rest in order", () => {
  const input: Row[] = [
    { name: "sys", tokens: 1, color: "a", kind: "used" },
    { name: "buf", tokens: 2, color: "b", kind: "buffer" },
    { name: "msg", tokens: 3, color: "c", kind: "used" },
    { name: "free", tokens: 4, color: "d", kind: "free" },
  ];
  expect(bufferLast(input).map((r) => r.name)).toEqual(["sys", "msg", "free", "buf"]);
  expect(bufferLast(input.filter((r) => r.kind !== "buffer")).length).toBe(3);
});
