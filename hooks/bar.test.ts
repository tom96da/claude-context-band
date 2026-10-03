import { test, expect } from "claude-code/testing";

import type { Row } from "../types";
import { bar, bufferLast, cells, dots, freePercent, messagesTokens } from "./bar";

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

const chat: Row[] = [
  { name: "System prompt", tokens: 2400, color: "c1", kind: "used" },
  { name: "Messages", tokens: 300000, color: "c2", kind: "used" },
  { name: "Free space", tokens: 664600, color: "c3", kind: "free" },
  { name: "Autocompact buffer", tokens: 33000, color: "c4", kind: "buffer" },
];
const braille = /[\u2800-\u28ff]/;
const count = (ch: string) => (ch.codePointAt(0) ?? 0x2800) - 0x2800;
const bits = (n: number) => n.toString(2).split("1").length - 1;

test("messagesTokens reads the Messages row", () => {
  expect(messagesTokens(chat)).toBe(300000);
  expect(messagesTokens([])).toBe(0);
});

const draw = (rows: Row[], width: number, baseline?: number) =>
  bar(rows, width, baseline)
    .map((r) => r.text)
    .join("");

test("bar draws no dots without a baseline or without growth", () => {
  expect(braille.test(draw(chat, 100))).toBe(false);
  expect(braille.test(draw(chat, 100, 300000))).toBe(false);
  expect(draw(chat, 100, 400000)).toBe(draw(chat, 100));
});

test("bar draws the cells gained since the baseline as dots that thin out", () => {
  const text = draw(chat, 100, 200000);
  const chars = Array.from(text);
  expect(chars.length).toBe(100);

  const firstDot = chars.findIndex((ch) => braille.test(ch));
  const lastDot = chars.findLastIndex((ch) => braille.test(ch));
  expect(firstDot).toBeGreaterThan(0);
  expect(lastDot - firstDot).toBeGreaterThan(5);
  expect(chars.slice(firstDot, lastDot + 1).every((ch) => braille.test(ch))).toBe(true);

  const tail = chars.slice(firstDot, lastDot + 1).map((ch) => bits(count(ch)));
  expect(tail.every((n) => n >= 3)).toBe(true);
  expect(tail.every((n, i) => i === 0 || n <= (tail[i - 1] ?? 8))).toBe(true);
  expect(draw(chat, 100, 200000)).toBe(text);
});

test("bar ends the dots with the next row's block and no half block", () => {
  for (const baseline of [200000, 250000, 290000]) {
    const chars = Array.from(draw(chat, 100, baseline));
    const lastDot = chars.findLastIndex((ch) => braille.test(ch));
    if (lastDot < 0) continue;
    expect(chars[lastDot + 1]).toBe("░");
  }
});

test("a cell the baseline reached stays solid as the row grows", () => {
  const baseline = 200000;
  let solid = new Set<number>();
  for (let growth = 1000; growth <= 100000; growth += 1000) {
    const grown = chat.map((r) =>
      r.name === "Messages"
        ? { ...r, tokens: baseline + growth }
        : r.kind === "free"
          ? { ...r, tokens: r.tokens - growth + 100000 }
          : r,
    );
    const chars = Array.from(draw(grown, 100, baseline));
    const now = new Set(chars.flatMap((ch, i) => (ch === "█" ? [i] : [])));
    for (const i of solid) expect(now.has(i)).toBe(true);
    solid = now;
  }
});

test("dots counts follow the density", () => {
  expect(bits(count(dots(3, 1)))).toBe(8);
  expect(bits(count(dots(3, 0.5)))).toBe(4);
  expect(bits(count(dots(3, 0)))).toBe(1);
  for (let c = 0; c < 20; c++) expect(bits(count(dots(c, 0.4)))).toBe(3);
});
