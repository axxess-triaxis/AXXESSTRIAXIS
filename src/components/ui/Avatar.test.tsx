import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

// MN-8 (2026-08-24): imageUrl is additive/optional -- this locks in that every one of the 8+
// existing call sites (which pass only `initials`) keeps rendering the initials div unchanged, and
// that a broken image URL falls back to initials via onError rather than showing a broken-image icon.
describe("Avatar (MN-8 imageUrl support)", () => {
  it("renders the initials div when no imageUrl is passed (every pre-existing call site)", () => {
    render(<Avatar initials="AR" />);
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders an <img> when imageUrl is passed", () => {
    render(<Avatar initials="AR" imageUrl="https://example.supabase.co/storage/v1/object/public/axxess-avatars/x.png" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.supabase.co/storage/v1/object/public/axxess-avatars/x.png");
    expect(screen.queryByText("AR")).not.toBeInTheDocument();
  });

  it("falls back to the initials div when the image fails to load", () => {
    render(<Avatar initials="AR" imageUrl="https://example.supabase.co/storage/v1/object/public/axxess-avatars/broken.png" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
