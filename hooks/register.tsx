import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import { cells, freePercent, short } from "./bar";
import type { Row } from "../types";

const DEFAULT_WIDTH = 60;
// "  free 100%" plus the 4 cells under the engine's "[-]" collapse button
const LABEL_ROOM = 16;
const GLYPH = { used: "█", free: "░", buffer: "▒" } as const;

const rowsAtom = atom({ plugin: "context-band", key: "rows" } as const, null);
const widthAtom = atom({ plugin: "context-band", key: "maxWidth" } as const, DEFAULT_WIDTH);

async function refresh($: EngineInterface) {
  const { context } = await $.session.usage({ breakdown: "summary" });
  const rows: Row[] = (context.breakdown?.categories ?? [])
    .filter((c) => c.kind !== "deferred")
    .map((c) => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind as Row["kind"] }));
  await update($, rowsAtom, () => rows);
}

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "context-band",
      description: "Show or set the max width of the context bar (columns)",
    });
    const saved = Number(await $.store.get("maxWidth"));
    await update($, widthAtom, () => (saved > 0 ? saved : DEFAULT_WIDTH));
    await refresh($);

    return next(e);
  });

  on("session.measure", async ($, e, next) => {
    if (e.changed.includes("context")) await refresh($);

    return next(e);
  });

  on("command.run", { command: "context-band" }, async ($, e) => {
    const arg = e.args.trim();
    if (arg === "") return { text: `Context bar max width: ${await read($, widthAtom)}` };

    const n = Math.round(Number(arg));
    if (!Number.isFinite(n)) return { text: `Not a number: ${arg}` };

    const width = Math.min(200, Math.max(10, n));
    await $.store.set("maxWidth", width);
    await update($, widthAtom, () => width);

    return { text: `Context bar max width: ${width}` };
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const rows = await read($, rowsAtom);
    if (e.props.hasSurvey || !rows || rows.length === 0) return next(e);

    const { Box, Text } = $.ui.resolve(e);
    const maxWidth = await read($, widthAtom);
    const width = Math.max(1, Math.min(maxWidth, e.props.bodyColumns - LABEL_ROOM));
    const sizes = cells(rows, width);
    const used = rows.filter((r) => r.kind === "used" && r.tokens > 0);

    return (
      <Box flexDirection="column" alignItems="flex-end">
        <Box>
          {rows.map((r, i) => (
            <Text color={r.color}>{GLYPH[r.kind].repeat(sizes[i] ?? 0)}</Text>
          ))}
          <Text dimColor>{`  free ${freePercent(rows)}%    `}</Text>
        </Box>
        <Box>
          {used.map((r) => (
            <Text color={r.color}>{`■ ${r.name} ${short(r.tokens)}   `}</Text>
          ))}
        </Box>
      </Box>
    );
  });
};
