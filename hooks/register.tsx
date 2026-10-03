import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import { bar, bufferLast, freePercent, short } from "./bar";
import { DEFAULT_WIDTH, runCommand } from "./command";
import type { Row } from "../types";

// "  free 100%" plus the 4 cells under the engine's "[-]" collapse button
const LABEL_ROOM = 16;

const rowsAtom = atom({ plugin: "context-band", key: "rows" } as const, null);
const widthAtom = atom({ plugin: "context-band", key: "maxWidth" } as const, DEFAULT_WIDTH);
const legendAtom = atom({ plugin: "context-band", key: "legend" } as const, true);

async function refresh($: EngineInterface) {
  const { context } = await $.session.usage({ breakdown: "summary" });
  const rows: Row[] = bufferLast(
    (context.breakdown?.categories ?? [])
      .filter((c) => c.kind !== "deferred")
      .map((c) => ({
        name: c.name,
        tokens: c.tokens,
        color: c.color,
        kind: c.kind as Row["kind"],
      })),
  );
  await update($, rowsAtom, () => rows);
}

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "context-band",
      description: "Show or set the context bar options (width, legend)",
    });
    const saved = Number(await $.store.get("maxWidth"));
    await update($, widthAtom, () => (saved > 0 ? saved : DEFAULT_WIDTH));
    const legend = await $.store.get("legend");
    await update($, legendAtom, () => legend !== false);
    await refresh($);

    return next(e);
  });

  on("session.measure", async ($, e, next) => {
    if (e.changed.includes("context")) await refresh($);

    return next(e);
  });

  on("command.run", { command: "context-band" }, async ($, e) => {
    const current = { width: await read($, widthAtom), legend: await read($, legendAtom) };
    const { text, width, legend } = runCommand(e.args, current);
    if (width !== undefined) {
      await $.store.set("maxWidth", width);
      await update($, widthAtom, () => width);
    }
    if (legend !== undefined) {
      await $.store.set("legend", legend);
      await update($, legendAtom, () => legend);
    }

    return { text };
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const rows = await read($, rowsAtom);
    if (e.props.hasSurvey || !rows || rows.length === 0) return next(e);

    const { Box, Text } = $.ui.resolve(e);
    const maxWidth = await read($, widthAtom);
    const hasLegend = await read($, legendAtom);
    const width = Math.max(1, Math.min(maxWidth, e.props.bodyColumns - LABEL_ROOM));
    const used = rows.filter((r) => r.kind === "used" && r.tokens > 0);

    return (
      <Box flexDirection="column" alignItems="flex-end">
        <Box>
          {bar(rows, width).map((r) =>
            r.bg === undefined ? (
              <Text color={r.color}>{r.text}</Text>
            ) : (
              <Text color={r.color} backgroundColor={r.bg}>
                {r.text}
              </Text>
            ),
          )}
          <Text dimColor>{`  free ${freePercent(rows)}%    `}</Text>
        </Box>
        {hasLegend && (
          <Box>
            {used.map((r) => (
              <Text color={r.color}>{`■ ${r.name} ${short(r.tokens)}   `}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  });
};
