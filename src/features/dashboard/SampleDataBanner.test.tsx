import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SampleDataBanner } from "./SampleDataBanner";

describe("SampleDataBanner", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing while loading or when no sample data is found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: 0, tasks: 0, meetings: 0, documents: 0, total: 0 }),
    }));

    const { container } = render(<SampleDataBanner canRemove={true} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a non-admin caller even if sample data exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ projects: 1, tasks: 2, meetings: 1, documents: 0, total: 4 }),
    }));

    const { container } = render(<SampleDataBanner canRemove={false} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a real count and requires a confirm step before removal", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ projects: 1, tasks: 2, meetings: 1, documents: 0, total: 4 }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ removed: { projects: 1, tasks: 2, meetings: 1, documentsArchived: 0 }, failures: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<SampleDataBanner canRemove={true} />);
    expect(await screen.findByText(/4 sample records/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove sample data/i }));
    expect(screen.getByRole("button", { name: /confirm removal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm removal/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/onboarding/sample-data", expect.objectContaining({ method: "DELETE" })));
    expect(await screen.findByText(/Removed 4 sample records/)).toBeInTheDocument();
  });
});
