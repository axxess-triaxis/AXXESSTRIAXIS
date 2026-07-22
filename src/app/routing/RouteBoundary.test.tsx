import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteBoundary } from "./RouteBoundary";
import type { AppRoute } from "./routes";

const route: AppRoute = {
  id: "approvals",
  section: "approvals",
  path: "approvals",
  label: "Approvals & Governance",
  module: "approvals",
  description: "test",
  access: "organization-protected",
  requiresAuth: true,
};

describe("RouteBoundary (Sprint 3 -- permission state, no protected-data leak)", () => {
  it("renders the protected children when the user has access", () => {
    render(
      <RouteBoundary route={route} hasAccess>
        <div>Protected workspace content</div>
      </RouteBoundary>,
    );

    expect(screen.getByText("Protected workspace content")).toBeInTheDocument();
  });

  it("shows a permission-aware access-restricted state, never the protected children, for an insufficiently authorized role", () => {
    render(
      <RouteBoundary route={route} hasAccess={false}>
        <div>Protected workspace content</div>
      </RouteBoundary>,
    );

    expect(screen.getByText("Access restricted")).toBeInTheDocument();
    expect(screen.getByText(/does not include permission/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected workspace content")).not.toBeInTheDocument();
  });
});
