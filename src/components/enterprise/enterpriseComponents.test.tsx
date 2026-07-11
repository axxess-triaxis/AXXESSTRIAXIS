import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ApprovalCard,
  ConfidenceBadge,
  DataStateBadge,
  DemoDataNotice,
  DocumentCard,
  MetricCard,
  ModuleHeader,
} from "./index";

describe("enterprise components", () => {
  it("renders module headers with state badges", () => {
    render(
      <ModuleHeader
        title="Executive Dashboard"
        description="Portfolio command center"
        badges={[<DataStateBadge key="demo" state="Demo" />]}
      />,
    );

    expect(screen.getByText("Executive Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Portfolio command center")).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("renders metric, confidence, approval, document, and demo notice primitives", () => {
    render(
      <div>
        <MetricCard label="Pending approvals" value="42" detail="7 executive reviews" />
        <ConfidenceBadge score={0.87} />
        <ApprovalCard title="Biomedical variance" requestor="Mission Secretariat" risk="High risk" />
        <DocumentCard title="Dibrugarh Oxygen Risk Register" tags={["oxygen", "risk"]} />
        <DemoDataNotice />
      </div>,
    );

    expect(screen.getByText("Pending approvals")).toBeInTheDocument();
    expect(screen.getByText("Confidence 87%")).toBeInTheDocument();
    expect(screen.getByText("Biomedical variance")).toBeInTheDocument();
    expect(screen.getByText("Dibrugarh Oxygen Risk Register")).toBeInTheDocument();
    expect(screen.getByText(/Investor Preview/)).toBeInTheDocument();
  });
});
