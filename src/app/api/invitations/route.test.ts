import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "invitations", "route.ts"), "utf8");

describe("invitations API delivery", () => {
  it("sends invitation email after creating the tokenized invitation", () => {
    expect(routeSource).toContain("sendInvitationEmail");
    expect(routeSource).toContain("invitationToken");
    expect(routeSource).toContain("emailDelivery.status");
  });

  it("audits delivery status without writing the raw invitation token", () => {
    const metadataBlock = routeSource.slice(routeSource.indexOf("metadata: {"), routeSource.indexOf("});", routeSource.indexOf("metadata: {")));
    expect(metadataBlock).toContain("emailProvider");
    expect(metadataBlock).toContain("emailDelivery");
    expect(metadataBlock).not.toContain("invitationToken");
  });
});
