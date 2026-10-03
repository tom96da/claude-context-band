export const DEFAULT_WIDTH = 100;
const MIN_WIDTH = 10;
const MAX_WIDTH = 200;

const USAGE = [
  "usage: /context-band width [<n>|reset]",
  "       /context-band legend [on|off]",
  "       /context-band particles [on|off]",
].join("\n");

export type Settings = { width: number; legend: boolean; particles: boolean };
export type Change = Partial<Settings>;

const onOff = (on: boolean) => (on ? "on" : "off");

/** What `/context-band <args>` answers and the settings it changes, if any. */
export function runCommand(args: string, current: Settings): { text: string } & Change {
  const [sub, value, ...rest] = args.trim().split(/\s+/).filter(Boolean);

  if (sub === undefined) {
    const note = current.width === DEFAULT_WIDTH ? "default" : `default ${DEFAULT_WIDTH}`;
    return {
      text: [
        "context-band",
        `  width: ${current.width} (${note})`,
        `  legend: ${onOff(current.legend)}`,
        `  particles: ${onOff(current.particles)}`,
        USAGE,
      ].join("\n"),
    };
  }
  if (rest.length > 0) return { text: USAGE };

  if (sub === "legend" || sub === "particles") {
    if (value === undefined) return { text: `Context bar ${sub}: ${onOff(current[sub])}` };
    if (value !== "on" && value !== "off") return { text: USAGE };

    const on = value === "on";
    return {
      text: `Context bar ${sub}: ${value}`,
      ...(sub === "legend" ? { legend: on } : { particles: on }),
    };
  }

  if (sub !== "width") return { text: USAGE };
  if (value === undefined) return { text: `Context bar max width: ${current.width}` };

  const n = value === "reset" ? DEFAULT_WIDTH : Math.round(Number(value));
  if (!Number.isFinite(n)) return { text: `Not a number: ${value}\n${USAGE}` };

  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
  return { text: `Context bar max width: ${width}`, width };
}
