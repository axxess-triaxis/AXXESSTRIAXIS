import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Codebase De-Bloat Sprint 1 (2026-08-11): a naive `git ls-files | xargs wc -l` sum counts every
// byte-as-a-newline in binary files as if it were a real line of code. This session found that bug
// firsthand -- it inflated this repo's reported LOC by 173,921 "lines" (51.7% of the naive total),
// entirely from 57 tracked PNG/PDF/ZIP files. Real text LOC and naive LOC must never be conflated
// again; every script in this repo:size:* family excludes these extensions from any LOC sum.
export const binaryExtensions = new Set([
  "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "tiff",
  "pdf", "zip", "gz", "tar", "7z",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp3", "mp4", "mov", "avi", "webm",
  "wasm",
]);

export function isBinaryPath(path) {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? binaryExtensions.has(ext) : false;
}

/** Every tracked file path, git-ls-files order, NUL-separated to survive spaces in path names
 *  (this repo has a top-level directory with spaces in its name -- see the audit doc). */
export function listTrackedFiles() {
  const raw = execFileSync("git", ["ls-files", "-z"], { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
  return raw.toString("utf8").split("\0").filter(Boolean);
}

export function countLines(absolutePath) {
  try {
    const content = readFileSync(absolutePath, "utf8");
    if (content.length === 0) return 0;
    // Match `wc -l` semantics exactly (counts '\n' characters, not "number of visual lines") for
    // consistency with every prior LOC figure already cited in this program's docs.
    return content.split("\n").length - 1;
  } catch {
    return null; // unreadable as text (e.g. genuinely binary despite extension, or permissions) -- excluded, not zero.
  }
}

export function topLevelDir(path) {
  const idx = path.indexOf("/");
  return idx === -1 ? "(root)" : path.slice(0, idx);
}

export function extensionOf(path) {
  const base = path.split("/").pop() ?? path;
  const idx = base.lastIndexOf(".");
  return idx <= 0 ? "(none)" : base.slice(idx + 1).toLowerCase();
}
