import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EscalateReviewModal } from "./EscalateReviewModal";
import type { Stakeholder } from "../../domain";

const stakeholders: Stakeholder[] = [
  { id: "stakeholder-1", organizationId: "org-1", name: "District Coordinator", affiliation: "Health Mission", influenceScore: 0.7, engagementLevel: "high" },
  { id: "stakeholder-2", organizationId: "org-1", name: "Finance Controller", affiliation: "Health Mission", influenceScore: 0.5, engagementLevel: "medium" },
];

describe("EscalateReviewModal (A-102)", () => {
  it("renders nothing when closed", () => {
    render(<EscalateReviewModal open={false} stakeholders={stakeholders} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText("Who should this go to?")).not.toBeInTheDocument();
  });

  it("shows the 3 escalation choices first", () => {
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("A mapped stakeholder")).toBeInTheDocument();
    expect(screen.getByText("An external email address")).toBeInTheDocument();
    expect(screen.getByText("An internal person not yet mapped as a stakeholder")).toBeInTheDocument();
  });

  it("mapped stakeholder path: lists real stakeholders and confirms with the selected one", () => {
    const onConfirm = vi.fn();
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText("A mapped stakeholder"));
    expect(screen.getByText("Finance Controller")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "stakeholder-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Escalate" }));

    expect(onConfirm).toHaveBeenCalledWith({
      escalationType: "mapped_stakeholder",
      escalationTarget: { stakeholderId: "stakeholder-2", stakeholderName: "Finance Controller" },
    });
  });

  it("mapped stakeholder path: Escalate is disabled until a stakeholder is chosen", () => {
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("A mapped stakeholder"));
    expect(screen.getByRole("button", { name: "Escalate" })).toBeDisabled();
  });

  it("external email path: requires a valid-looking email before confirming", () => {
    const onConfirm = vi.fn();
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText("An external email address"));
    expect(screen.getByRole("button", { name: "Escalate" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "external@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Escalate" }));

    expect(onConfirm).toHaveBeenCalledWith({
      escalationType: "external_email",
      escalationTarget: { email: "external@example.com" },
    });
  });

  it("internal unmapped path: requires at least email or employee code, not both", () => {
    const onConfirm = vi.fn();
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText("An internal person not yet mapped as a stakeholder"));
    expect(screen.getByRole("button", { name: "Escalate" })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Employee code"), { target: { value: "EMP-042" } });
    fireEvent.click(screen.getByRole("button", { name: "Escalate" }));

    expect(onConfirm).toHaveBeenCalledWith({
      escalationType: "internal_unmapped",
      escalationTarget: { employeeCode: "EMP-042" },
    });
  });

  it("Back returns to the choice step from any sub-step", () => {
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("An external email address"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Who should this go to?")).toBeInTheDocument();
  });

  it("Cancel from the choice step calls onCancel", () => {
    const onCancel = vi.fn();
    render(<EscalateReviewModal open stakeholders={stakeholders} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
