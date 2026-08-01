import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandIcon } from "./BrandIcon";

describe("BrandIcon", () => {
  it("renders the icon's own path and brand color, not a hardcoded placeholder", () => {
    const { container } = render(<BrandIcon icon={{ path: "M1 2 L3 4", hex: "FF00AA", title: "Acme" }} size={22} />);
    const svg = container.querySelector("svg");
    const path = container.querySelector("path");

    expect(svg).toHaveAttribute("width", "22");
    expect(svg).toHaveAttribute("height", "22");
    expect(svg).toHaveAttribute("fill", "#FF00AA");
    expect(svg).toHaveAttribute("aria-label", "Acme logo");
    expect(path).toHaveAttribute("d", "M1 2 L3 4");
  });

  it("defaults to size 18 when none is given", () => {
    const { container } = render(<BrandIcon icon={{ path: "M0 0", hex: "000000", title: "X" }} />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "18");
  });
});
