import { render, screen } from "@testing-library/react";
import { FileStack } from "lucide-react";
import { describe, expect, it } from "vitest";
import { LitePlaceholderSection } from "./LitePlaceholderSection";

// XL-6 (2026-08-06): Lite Files (src/app/lite/files/page.tsx) still renders this component this
// pass -- real chunked-upload wiring was judged too complex to build safely alongside the rest of
// XL-6's scope in one pass (see the XL-6 closeout's "What Did Not Move" section). Proves the
// honest-pending-state contract: no demo file names, no fabricated file list, no fake success.
describe("LitePlaceholderSection (used by Lite Files this pass)", () => {
  it("shows an honest pending state, never a demo file or fabricated content", () => {
    render(<LitePlaceholderSection title="Files" description="Documents and notes you upload will show up here." icon={FileStack} />);

    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText(/upcoming update/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing shown here is placeholder data pretending to be real/i)).toBeInTheDocument();

    // No demo dataset content of any kind.
    expect(screen.queryByText(/North East Health Mission/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ananya Rao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\.pdf|\.docx|\.xlsx/i)).not.toBeInTheDocument();
  });
});
