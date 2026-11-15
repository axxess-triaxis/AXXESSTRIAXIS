import { describe, expect, it } from "vitest";
import { createUnsubscribeToken, renderOutreachEmail, verifyUnsubscribeToken } from "./outreachEmail";

const SECRET = "test-secret-at-least-32-characters-long";
const sender = { name: "Asha Rao", company: "Triaxis Ventures Private Limited", postalAddress: "Guwahati, Assam, India" };
const lead = { contactName: "Ravi Kumar", organizationName: "Acme Pvt Ltd" };

describe("unsubscribe tokens", () => {
  it("round-trips the organization and identifier", () => {
    const token = createUnsubscribeToken(SECRET, { organizationId: "org-1", identifier: "ravi@acme.in" });
    expect(verifyUnsubscribeToken(SECRET, token)).toEqual({ organizationId: "org-1", identifier: "ravi@acme.in" });
  });

  it("rejects a tampered token, a wrong secret, and junk", () => {
    const token = createUnsubscribeToken(SECRET, { organizationId: "org-1", identifier: "ravi@acme.in" });
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ o: "org-2", i: "ravi@acme.in" })).toString("base64url");
    expect(verifyUnsubscribeToken(SECRET, `${forged}.${sig}`)).toBeNull();
    expect(verifyUnsubscribeToken("another-secret-that-is-also-long-enough", token)).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, `${payload}`)).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, "not.a-token")).toBeNull();
  });

  it("refuses a short secret", () => {
    expect(() => createUnsubscribeToken("short", { organizationId: "o", identifier: "a@b.in" })).toThrow(/secret/);
  });
});

describe("renderOutreachEmail", () => {
  const unsubscribeUrl = "https://app.example.com/api/outreach/unsubscribe?token=abc";

  it("fills merge fields and adds sender identity, address and unsubscribe to every email", () => {
    const email = renderOutreachEmail({
      template: { subject: "Quick question for {{company}}", body: "Hi {{first_name}},\n\nAre follow-ups slipping at {{company}}?" },
      lead, sender, unsubscribeUrl,
    });
    expect(email.subject).toBe("Quick question for Acme Pvt Ltd");
    expect(email.text).toContain("Hi Ravi,\n\nAre follow-ups slipping at Acme Pvt Ltd?");
    for (const part of [email.text, email.html]) {
      expect(part).toContain("Asha Rao");
      expect(part).toContain("Triaxis Ventures Private Limited");
      expect(part).toContain("Guwahati, Assam, India");
      expect(part).toContain(unsubscribeUrl);
    }
    expect(email.headers).toEqual({
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("escapes HTML from lead data", () => {
    const email = renderOutreachEmail({
      template: { subject: "Hi", body: "Hello {{company}}" },
      lead: { contactName: "R", organizationName: "<script>x</script>" }, sender, unsubscribeUrl,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("refuses unknown merge fields and missing values rather than sending blanks", () => {
    expect(() => renderOutreachEmail({ template: { subject: "{{revenue}}", body: "x" }, lead, sender, unsubscribeUrl }))
      .toThrow(/unknown merge field: revenue/);
    expect(() => renderOutreachEmail({
      template: { subject: "Hi {{first_name}}", body: "x" }, lead: { organizationName: "Acme" }, sender, unsubscribeUrl,
    })).toThrow(/no value for first_name/);
  });
});
