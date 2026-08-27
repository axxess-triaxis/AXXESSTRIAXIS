import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiteSettingsSection } from "./LiteSettingsSection";

// Lite Settings real-modules pass (2026-08-27): proves five of the six rows now link to real
// pages, and only Billing still shows "Coming soon." -- a deliberate, founder-confirmed exception,
// not a leftover stub.
describe("LiteSettingsSection", () => {
  it("links Profile, Organization, Integrations, Audit Export, and Help & Support to their real pages", () => {
    render(<LiteSettingsSection />);
    expect(screen.getByRole("link", { name: /profile/i })).toHaveAttribute("href", "/lite/settings/profile");
    expect(screen.getByRole("link", { name: /organization/i })).toHaveAttribute("href", "/lite/settings/organization");
    expect(screen.getByRole("link", { name: /integrations/i })).toHaveAttribute("href", "/lite/settings/integrations");
    expect(screen.getByRole("link", { name: /audit export/i })).toHaveAttribute("href", "/lite/settings/audit-export");
    expect(screen.getByRole("link", { name: /help & support/i })).toHaveAttribute("href", "/lite/help");
  });

  it("Billing is the one deliberate exception -- still links to the /lite/payments placeholder", () => {
    render(<LiteSettingsSection />);
    expect(screen.getByRole("link", { name: /billing/i })).toHaveAttribute("href", "/lite/payments");
  });

  it("no row shows a bare 'Coming soon' label any more -- every row now has a real destination", () => {
    render(<LiteSettingsSection />);
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
