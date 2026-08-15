import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatbotConfirmCard } from "./ChatbotConfirmCard";

describe("ChatbotConfirmCard", () => {
  it("renders the summary and calls onConfirm/onCancel exactly once each", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ChatbotConfirmCard summary='Create task "Ship the report".' onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByText('Create task "Ship the report".')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons when disabled is set", () => {
    render(<ChatbotConfirmCard summary="Create task." onConfirm={vi.fn()} onCancel={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
