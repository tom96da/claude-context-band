# context-band

A coloured context-usage bar above the Claude Code prompt: one segment per `/context`
category, `free NN%`, and a legend. Right-aligned; the bar is at most 60 columns and
shrinks with the terminal.

```
claude --plugin-dir /workspaces/claude-context-band
```

| Command                     | Effect                                                       |
| --------------------------- | ------------------------------------------------------------ |
| `/context-band`             | show the settings and usage                                  |
| `/context-band width`       | show the maximum bar width                                   |
| `/context-band width <n>`   | set it in columns (10–200, default 60, kept across sessions) |
| `/context-band width reset` | back to the default                                          |

## Development

```
pnpm install
pnpm types      # lays .claude-plugin/types (engine API types, not committed)
pnpm check      # oxlint, tsc, plugin validate, plugin test
```

`pnpm types` loads the mod once through `claude -p` (one small haiku call).

## License

MIT. See [LICENSE](./LICENSE).
