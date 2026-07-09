import { MetricCard, Screen } from "../src/components/screen";

export default function Dashboard() {
  return (
    <Screen title="Dashboard" subtitle="Executive beta dashboard for tenant health and operational status.">
      <MetricCard label="Open risks" value="18" />
      <MetricCard label="Pending approvals" value="7" />
    </Screen>
  );
}
