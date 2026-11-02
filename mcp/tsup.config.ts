import { defineConfig } from "tsup";

// One file with the library code bundled in, so the published server has no dependencies.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node18",
  banner: { js: "#!/usr/bin/env node" },
  noExternal: [/.*/],
  clean: true,
});
