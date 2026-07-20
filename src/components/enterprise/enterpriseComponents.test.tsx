import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
import { TenantHealthCommandCenter } from "./TenantHealthCommandCenter";
import { WorkflowTimelinePanel } from "./WorkflowTimelinePanel";
import { getFallbackLiveWorkspaceMetrics } from "../../services/live-platform/livePlatform";
import { buildEnterpriseGoldenPathSnapshot } from "../../services/workflows/enterpriseGoldenPath";
import { fallbackWorkflowTimelineEvents } from "../../services/workflows/workflowEvidence";

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

  it("collapses the golden path to an on-demand summary until the user opts to expand it", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: getFallbackLiveWorkspaceMetrics(),
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 2,
    });

    render(<EnterpriseWorkflowJourney snapshot={snapshot} displayMode="on-demand" />);

    expect(screen.getByText("Enterprise golden path")).toBeInTheDocument();
    expect(screen.queryByText("Review AI output before action")).not.toBeInTheDocument();
    expect(screen.getByText(/View recommended setup path/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/View recommended setup path/));
    expect(screen.getByText("Review AI output before action")).toBeInTheDocument();
    expect(screen.getByText("Hide guided view")).toBeInTheDocument();
  });

  it("lets a user persist their preference to always see the guided journey", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: getFallbackLiveWorkspaceMetrics(),
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 2,
    });
    const onDisplayModeChange = vi.fn();

    render(<EnterpriseWorkflowJourney snapshot={snapshot} displayMode="guided" onDisplayModeChange={onDisplayModeChange} />);

    fireEvent.click(screen.getByText("Make this optional (on-demand)"));
    expect(onDisplayModeChange).toHaveBeenCalledWith("on-demand");
  });

  it("explains why a blocked or locked step can't be actioned yet", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: {
        ...getFallbackLiveWorkspaceMetrics(),
        ragReadyDocuments: 0,
      },
      userRole: "Employee",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 1,
    });

    render(<EnterpriseWorkflowJourney snapshot={snapshot} />);

    expect(screen.getByText(/Upload at least one document in Knowledge Hub/)).toBeInTheDocument();
    expect(screen.getAllByText(/Requires Super Admin or Organization Admin/).length).toBeGreaterThan(0);
  });

  it("renders tenant health indicators for the pilot golden path", () => {
    const metrics = getFallbackLiveWorkspaceMetrics();
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics,
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 1,
    });

    render(<TenantHealthCommandCenter snapshot={snapshot} metrics={metrics} />);

    expect(screen.getByText("Tenant Health Command Center")).toBeInTheDocument();
    expect(screen.getByText("Onboarding completion")).toBeInTheDocument();
    expect(screen.getByText("Documents indexed")).toBeInTheDocument();
    expect(screen.getByText("Pending AI reviews")).toBeInTheDocument();
    expect(screen.getByText("Audit coverage")).toBeInTheDocument();
  });

  it("renders workflow timeline evidence", () => {
    render(<WorkflowTimelinePanel events={fallbackWorkflowTimelineEvents("org-demo")} />);

    expect(screen.getByText("Workflow timeline")).toBeInTheDocument();
    expect(screen.getByText("District review note imported")).toBeInTheDocument();
    expect(screen.getByText("Human reviewer approved action")).toBeInTheDocument();
    expect(screen.getByText("Audit evidence recorded")).toBeInTheDocument();
  });
});
