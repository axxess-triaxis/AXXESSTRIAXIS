// Bundles handler.ts (and the shared core it imports from src/ and scripts/) into dist/handler.mjs.
// Chromium and playwright-core stay external (installed into dist/ by `sam build` from
// dist/package.json); Secrets Manager comes from the nodejs22.x runtime's SDK. The Bedrock runtime
// and AgentCore clients are bundled (2026-11-18): the runtime's SDK may predate InvokeWebSearch.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });

await build({
  entryPoints: [here("./handler.ts")],
  outfile: here("./dist/handler.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  external: ["@aws-sdk/client-secrets-manager", "playwright-core", "@sparticuz/chromium"],
  // esbuild's ESM output needs require() for any CommonJS left in the bundle.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  legalComments: "none",
});

writeFileSync(
  new URL("./dist/package.json", import.meta.url),
  JSON.stringify({ name: pkg.name, version: pkg.version ?? "1.0.0", private: true, type: "module", dependencies: pkg.dependencies }, null, 2) + "\n",
);
console.log("Built dist/handler.mjs");
