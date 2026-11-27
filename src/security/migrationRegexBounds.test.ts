import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const directory = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(directory).filter((name) => name.endsWith(".sql")).sort();
const read = (name: string) => readFileSync(join(directory, name), "utf8");

// PostgreSQL allows at most 255 repetitions in a regular expression. A larger bound is accepted when
// the check is created and fails with 2201B on the first value (staging, 2026-11-24).
const BOUND = /'[^'\n]*\{(\d+)(?:,(\d*))?\}[^'\n]*'/g;
const tooLarge = (sql: string) =>
  [...sql.matchAll(BOUND)].some((match) => Math.max(Number(match[1]), Number(match[2] || 0)) > 255);

// Applied to staging before the mistake was found, so it is corrected by a later migration, not edited.
const CORRECTED = "20261120140000_org_agent_settings_details.sql";

describe("migration regular expressions", () => {
  it.each(migrations.filter((name) => name !== CORRECTED))("%s stays within 255 repetitions", (name) => {
    expect(tooLarge(read(name))).toBe(false);
  });

  it("a later migration replaces the WhatsApp template check that no value could pass", () => {
    const later = migrations.filter((name) => name > CORRECTED).map(read).join("\n");
    expect(tooLarge(read(CORRECTED))).toBe(true);
    expect(later).toContain("drop constraint if exists org_agent_settings_whatsapp_template_check");
    expect(later).toContain("whatsapp_template ~ '^[a-z0-9_]+$'");
    expect(later).toContain("length(whatsapp_template) <= 512");
  });
});
