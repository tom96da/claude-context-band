import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript"],
  categories: { correctness: "error" },
  ignorePatterns: [".claude-plugin/types"],
});
