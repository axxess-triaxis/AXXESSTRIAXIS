import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiteAskSection } from "./LiteAskSection";

// XL-6 (2026-08-06): proves LiteAskSection calls the real, already-allowlisted POST /api/rag/query
// (XL-4) and never exposes the AI Review Inbox or agentic MCP vocabulary -- a plain question box,
// nothing else.
describe("LiteAskSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows an honest pending state before any question is asked", () => {
    render(<LiteAskSection />);
    expect(screen.getByText(/Ask a question above/)).toBeInTheDocument();
  });

  it("calls the real /api/rag/query endpoint and renders the cited answer", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      answer: "Your invoice policy is net 30.",
      citations: [{ title: "Vendor Policy.pdf", documentId: "doc-1" }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<LiteAskSection />);
    fireEvent.change(screen.getByPlaceholderText("What would you like to know?"), { target: { value: "What is our invoice policy?" } });
    fireEvent.click(screen.getByText("Ask"));

    await waitFor(() => expect(screen.getByText("Your invoice policy is net 30.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/rag/query", expect.objectContaining({ method: "POST" }));
    expect(screen.getByText("Vendor Policy.pdf")).toBeInTheDocument();
  });

  it("shows an honest error, not a fabricated answer, when the query fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "No documents indexed yet." }), { status: 400 })));

    render(<LiteAskSection />);
    fireEvent.change(screen.getByPlaceholderText("What would you like to know?"), { target: { value: "Anything?" } });
    fireEvent.click(screen.getByText("Ask"));

    await waitFor(() => expect(screen.getByText("No documents indexed yet.")).toBeInTheDocument());
  });

  it("never exposes AI Review Inbox or agentic MCP vocabulary", () => {
    render(<LiteAskSection />);
    expect(screen.queryByText(/AI Review Inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/agentic/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MCP/i)).not.toBeInTheDocument();
  });
});
