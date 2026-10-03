export const DEFAULT_WIDTH = 100;
const MIN_WIDTH = 10;
const MAX_WIDTH = 200;

const USAGE = "usage: /context-band width [<n>|reset]\n       /context-band legend [on|off]";

export type Settings = { width: number; legend: boolean };

/** What `/context-band <args>` answers and the settings it changes, if any. */
export function runCommand(
  args: string,
  current: Settings,
): { text: string; width?: number; legend?: boolean } {
  const [sub, value, ...rest] = args.trim().split(/\s+/).filter(Boolean);

  if (sub === undefined) {
    const note = current.width === DEFAULT_WIDTH ? "default" : `default ${DEFAULT_WIDTH}`;
    const legend = current.legend ? "on" : "off";
    return {
      text: `context-band\n  width: ${current.width} (${note})\n  legend: ${legend}\n${USAGE}`,
    };
  }
  if (rest.length > 0) return { text: USAGE };

  if (sub === "legend") {
    if (value === undefined)
      return { text: `Context bar legend: ${current.legend ? "on" : "off"}` };
    if (value !== "on" && value !== "off") return { text: USAGE };

    return { text: `Context bar legend: ${value}`, legend: value === "on" };
  }

  if (sub !== "width") return { text: USAGE };
  if (value === undefined) return { text: `Context bar max width: ${current.width}` };

  const n = value === "reset" ? DEFAULT_WIDTH : Math.round(Number(value));
  if (!Number.isFinite(n)) return { text: `Not a number: ${value}\n${USAGE}` };

  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  return { text: `Context bar max width: ${width}`, width };
}
