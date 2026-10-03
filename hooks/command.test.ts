import { test, expect } from "claude-code/testing";

import { runCommand } from "./command";

const now = { width: 60, legend: true };

test("no args shows the settings and usage", () => {
  const out = runCommand("", now);
  expect(out.width).toBeUndefined();
  expect(out.legend).toBeUndefined();
  expect(out.text).toContain("width: 60 (default)");
  expect(out.text).toContain("legend: on");
  expect(out.text).toContain("usage: /context-band width");
  expect(runCommand("  ", { width: 30, legend: false }).text).toContain("width: 30 (default 60)");
  expect(runCommand("", { width: 30, legend: false }).text).toContain("legend: off");
});

test("width shows, sets, clamps and resets", () => {
  expect(runCommand("width", { ...now, width: 40 })).toEqual({ text: "Context bar max width: 40" });
  expect(runCommand("width 80", now).width).toBe(80);
  expect(runCommand("width  80", now).width).toBe(80);
  expect(runCommand("width 3", now).width).toBe(10);
  expect(runCommand("width 999", now).width).toBe(200);
  expect(runCommand("width 12.6", now).width).toBe(13);
  expect(runCommand("width reset", { ...now, width: 30 }).width).toBe(60);
});

test("legend shows and switches on and off", () => {
  expect(runCommand("legend", now)).toEqual({ text: "Context bar legend: on" });
  expect(runCommand("legend", { ...now, legend: false }).text).toBe("Context bar legend: off");
  expect(runCommand("legend off", now).legend).toBe(false);
  expect(runCommand("legend on", { ...now, legend: false }).legend).toBe(true);
  expect(runCommand("legend off", now).width).toBeUndefined();
});

test("bad input answers with usage and sets nothing", () => {
  const bad = [
    "width abc",
    "width 1 2",
    "30",
    "colour",
    "width Infinity",
    "legend maybe",
    "legend on off",
  ];
  for (const args of bad) {
    const out = runCommand(args, now);
    expect(out.width).toBeUndefined();
    expect(out.legend).toBeUndefined();
    expect(out.text).toContain("usage: /context-band width");
  }
});
