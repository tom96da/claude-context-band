export type Row = { name: string; tokens: number; color: string; kind: "used" | "free" | "buffer" };

declare module "claude-code" {
  interface PluginState {
    "context-band": { rows: Row[] | null; maxWidth: number };
  }
}
