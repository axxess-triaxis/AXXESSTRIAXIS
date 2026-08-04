import { describe, expect, it } from "vitest";
import { brandIcons } from "./brandIcons";

describe("brandIcons", () => {
  it("every entry present is a real simple-icons shape, not a placeholder", () => {
    for (const [id, icon] of Object.entries(brandIcons)) {
      if (!icon) continue;
      // "M" (absolute) or "m" (relative) are both valid SVG moveto commands -- Vercel's real
      // simple-icons path (`m12 1.608 12 20.784H0Z`) uses lowercase, which is fine to render (the
      // first moveto in a path is equivalent either way, since there's no prior point to be
      // relative to). Rejecting it here isn't a real safety check, just an untested assumption.
      expect(icon.path.startsWith("M") || icon.path.startsWith("m")).toBe(true);
      expect(icon.hex).toMatch(/^[0-9A-Fa-f]{6}$/);
      expect(icon.title.length).toBeGreaterThan(0);
      expect(id).toBeTruthy();
    }
  });

  it("has a real logo for every pilot-enabled provider that has one available in simple-icons, so tiles aren't left generic by accident", () => {
    const expectedPresent = [
      "gmail", "google_calendar", "zoom", "google_drive", "calendly", "whatsapp_business",
      "notion", "linear", "github", "hubspot", "airtable", "google_sheets", "google_docs",
      "google_slides", "x_twitter", "razorpay", "anthropic",
    ];
    for (const id of expectedPresent) {
      expect(brandIcons[id]).toBeDefined();
    }
  });

  it("deliberately omits providers with no unencumbered brand mark, rather than approximating a trademarked logo", () => {
    // Slack, Microsoft (Outlook/Teams), Salesforce, DocuSign, and OpenAI have all been removed
    // from (or never had an accurate entry in) simple-icons following brand-owner requests --
    // a missing entry here is a deliberate safety choice, not an oversight to "fix" later.
    const expectedAbsent = ["slack", "outlook", "teams", "salesforce", "docusign", "openai", "microsoft_copilot", "mssql", "s3"];
    for (const id of expectedAbsent) {
      expect(brandIcons[id]).toBeUndefined();
    }
  });
});
