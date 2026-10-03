export const DEFAULT_WIDTH = 60;
const MIN_WIDTH = 10;
const MAX_WIDTH = 200;

const USAGE = "usage: /context-band width [<n>|reset]";

/** What `/context-band <args>` answers and the width it sets, if any. */
export function runCommand(args: string, current: number): { text: string; width?: number } {
  const [sub, value, ...rest] = args.trim().split(/\s+/).filter(Boolean);

  if (sub === undefined) {
    const note = current === DEFAULT_WIDTH ? "default" : `default ${DEFAULT_WIDTH}`;
    return { text: `context-band\n  width: ${current} (${note})\n${USAGE}` };
  }
  if (sub !== "width" || rest.length > 0) return { text: USAGE };
  if (value === undefined) return { text: `Context bar max width: ${current}` };

  const n = value === "reset" ? DEFAULT_WIDTH : Math.round(Number(value));
  if (!Number.isFinite(n)) return { text: `Not a number: ${value}\n${USAGE}` };

  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  return { text: `Context bar max width: ${width}`, width };
}
