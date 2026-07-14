import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const shellRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(shellRoot, "..", "..");
const distDir = path.join(repoRoot, "dist");
const indexPath = path.join(distDir, "index.html");
const fallbackHtml = [
  "<!doctype html>",
  "<html lang=\"en\">",
  "  <head>",
  "    <meta charset=\"utf-8\" />",
  "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
  "    <title>AXXESS TRIaxis</title>",
  "  </head>",
  "  <body>",
  "    <main id=\"root\">AXXESS TRIaxis</main>",
  "  </body>",
  "</html>",
  "",
].join("\n");

fs.mkdirSync(distDir, { recursive: true });

try {
  fs.writeFileSync(indexPath, fallbackHtml, { flag: "wx" });
} catch (error) {
  if (error?.code !== "EEXIST") {
    throw error;
  }
}

console.log(`[mobile] Capacitor web assets available at ${path.relative(repoRoot, distDir)}.`);
