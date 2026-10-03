# context-band

A [Claude Code](https://claude.com/claude-code) mod that keeps `/context` in view: a coloured
bar above the prompt with one segment per category, the free space left, and a legend.

```
                                  █████▒░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  free 92%
■ System prompt 2.3k   ■ System tools 30.0k   ■ Memory files 3.8k   ■ Skills 5.7k   ■ Messages 1.8k
```

The band is right-aligned and updates whenever the context fills. The engine's `[-]` button
at its top right collapses it (ctrl+x ctrl+a brings it back).

## Install

Add the marketplace and install the mod from a terminal:

```
claude plugin marketplace add tom96da/claude-context-band
claude plugin install context-band@tom96da
```

Then run `/reload-plugins` in a running session, or start a new one.

Update with `claude plugin marketplace update tom96da` and
`claude plugin update context-band`. Remove with `claude plugin uninstall context-band`.

## Usage

| Command                              | Effect                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/context-band`                      | show the settings and usage                                                                                                                                  |
| `/context-band width`                | show the maximum bar width                                                                                                                                   |
| `/context-band width <n>`            | set it in columns (10–200, default 100, kept across sessions)                                                                                                |
| `/context-band width reset`          | back to the default                                                                                                                                          |
| `/context-band legend`               | show whether the legend is on                                                                                                                                |
| `/context-band legend on` / `off`    | show or hide the legend line (kept across sessions)                                                                                                          |
| `/context-band particles`            | show whether the growth dots are on                                                                                                                          |
| `/context-band particles on` / `off` | draw what the Messages segment grows by while Claude works as fading dots that turn solid when the turn ends, or always draw it solid (kept across sessions) |

The bar shrinks below that width when the terminal is narrow.

## Development

Requires Node.js and [pnpm](https://pnpm.io).

```
pnpm install
pnpm types      # lays .claude-plugin/types (the engine's API types, not committed)
pnpm check      # oxlint, oxfmt, tsc, plugin validate, plugin test
```

`pnpm types` loads the mod once through `claude -p` (one small haiku call).
To try changes live, start Claude Code with `claude --plugin-dir .`; saved edits reload
without a restart. Uninstall the marketplace copy first so the mod is not loaded twice.

## License

MIT. See [LICENSE](./LICENSE).
