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
import { EnterpriseWorkflowJourney } from "./EnterpriseWorkflowJourney";
import { getFallbackLiveWorkspaceMetrics } from "../../services/live-platform/livePlatform";
import { buildEnterpriseGoldenPathSnapshot } from "../../services/workflows/enterpriseGoldenPath";

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

  it("renders the enterprise golden path journey with next actions", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: getFallbackLiveWorkspaceMetrics(),
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 2,
    });

    render(<EnterpriseWorkflowJourney snapshot={snapshot} />);

    expect(screen.getByText("Enterprise golden path")).toBeInTheDocument();
    expect(screen.getByText("Review AI output before action")).toBeInTheDocument();
    expect(screen.getByText("Next best action")).toBeInTheDocument();
    expect(screen.getByText("Review pending AI output")).toBeInTheDocument();
  });
});
