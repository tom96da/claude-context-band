import { test, expect } from "claude-code/testing";

import { runCommand } from "./command";

test("no args shows the settings and usage", () => {
  const out = runCommand("", 60);
  expect(out.width).toBeUndefined();
  expect(out.text).toContain("width: 60 (default)");
  expect(out.text).toContain("usage: /context-band width");
  expect(runCommand("  ", 30).text).toContain("width: 30 (default 60)");
});

test("width shows, sets, clamps and resets", () => {
  expect(runCommand("width", 40)).toEqual({ text: "Context bar max width: 40" });
  expect(runCommand("width 80", 60).width).toBe(80);
  expect(runCommand("width  80", 60).width).toBe(80);
  expect(runCommand("width 3", 60).width).toBe(10);
  expect(runCommand("width 999", 60).width).toBe(200);
  expect(runCommand("width 12.6", 60).width).toBe(13);
  expect(runCommand("width reset", 30).width).toBe(60);
});

test("bad input answers with usage and sets nothing", () => {
  for (const args of ["width abc", "width 1 2", "30", "colour", "width Infinity"]) {
    const out = runCommand(args, 60);
    expect(out.width).toBeUndefined();
    expect(out.text).toContain("usage: /context-band width");
  }
});
