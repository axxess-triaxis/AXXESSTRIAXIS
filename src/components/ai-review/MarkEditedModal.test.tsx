import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkEditedModal } from "./MarkEditedModal";

describe("MarkEditedModal (A-102)", () => {
  it("renders nothing when closed", () => {
    render(<MarkEditedModal open={false} originalAnswer="Original text." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText("Edit this answer")).not.toBeInTheDocument();
  });

  it("pre-fills the textarea with the original answer", () => {
    render(<MarkEditedModal open originalAnswer="The original AI answer." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("The original AI answer.");
  });

  it("calls onConfirm with the edited (trimmed) text, not the original", () => {
    const onConfirm = vi.fn();
    render(<MarkEditedModal open originalAnswer="Original text." onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Corrected text.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save edited answer" }));

    expect(onConfirm).toHaveBeenCalledWith("Corrected text.");
  });

  it("disables the confirm button when the text is emptied out", () => {
    render(<MarkEditedModal open originalAnswer="Original text." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Save edited answer" })).toBeDisabled();
  });

  it("calls onCancel without calling onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<MarkEditedModal open originalAnswer="Original text." onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("re-seeds the textarea when opened for a different review's answer", () => {
    const { rerender } = render(<MarkEditedModal open originalAnswer="First review's answer." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Edited but not saved." } });

    rerender(<MarkEditedModal open={false} originalAnswer="First review's answer." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    rerender(<MarkEditedModal open originalAnswer="Second review's answer." onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("Second review's answer.");
  });
});
