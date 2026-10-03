import { test, expect } from "claude-code/testing";

import type { Row } from "../types";
import { bar, bufferLast, cells, freePercent } from "./bar";

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

const two = (a: number, b: number): Row[] => [
  { name: "a", tokens: a, color: "A", kind: "used" },
  { name: "b", tokens: b, color: "B", kind: "free" },
];
const text = (rows: Row[], width: number) =>
  bar(rows, width)
    .map((r) => r.text)
    .join("");

test("bar is one character per cell", () => {
  for (const w of [1, 7, 10, 60]) {
    expect(Array.from(text(rows, w)).length).toBe(w);
  }
});

test("bar draws a shared cell as a half block over the next colour", () => {
  expect(bar(two(55, 45), 10)).toEqual([
    { text: "█████", color: "A" },
    { text: "▌", color: "A", bg: "B" },
    { text: "░░░░", color: "B" },
  ]);
  expect(text(two(50, 50), 10)).toBe("█████░░░░░");
  expect(text(two(1, 7), 1)).toBe("▌");
});

test("bar of empty rows draws nothing", () => {
  expect(bar([], 10)).toEqual([]);
  expect(bar(two(0, 0), 10)).toEqual([]);
  expect(bar(two(1, 1), 0)).toEqual([]);
});

test("bar shows every non-empty row", () => {
  const real: Row[] = [
    { name: "sys", tokens: 2400, color: "c1", kind: "used" },
    { name: "tools", tokens: 20100, color: "c2", kind: "used" },
    { name: "mcp", tokens: 717, color: "c3", kind: "used" },
    { name: "mem", tokens: 4600, color: "c4", kind: "used" },
    { name: "skills", tokens: 5700, color: "c5", kind: "used" },
    { name: "msg", tokens: 188000, color: "c6", kind: "used" },
    { name: "free", tokens: 745500, color: "c7", kind: "free" },
    { name: "buf", tokens: 33000, color: "c8", kind: "buffer" },
  ];
  for (const w of [30, 60, 100]) {
    const colors = new Set(bar(real, w).flatMap((r) => [r.color, r.bg ?? r.color]));
    for (const row of real) expect(colors.has(row.color)).toBe(true);
  }
});
