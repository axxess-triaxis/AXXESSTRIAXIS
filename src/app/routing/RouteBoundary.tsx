import type { ReactNode } from "react";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorBoundary } from "../../components/feedback/ErrorBoundary";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Card } from "../../components/ui/Card";
import type { AppRoute } from "./routes";

type RouteBoundaryProps = {
  route: AppRoute;
  hasAccess: boolean;
  children: ReactNode;
};

function RouteErrorFallback({ label }: { label: string }) {
  return (
    <Card className="p-8 flex items-center justify-center">
      <EmptyState
        title={`${label} unavailable`}
        message="This module could not render. The rest of the workspace is still available."
      />
    </Card>
  );
}

function AccessDeniedSection() {
  return (
    <Card className="p-8 flex items-center justify-center">
      <EmptyState
        icon={<ShieldCheck size={32} />}
        title="Access restricted"
        message="Your current role does not include permission to view this workspace."
      />
    </Card>
  );
}

export function RouteBoundary({ route, hasAccess, children }: RouteBoundaryProps) {
  const fallback = <LoadingState label={`Loading ${route.label}`} />;

  return (
    <ErrorBoundary fallback={<RouteErrorFallback label={route.label} />}>
      <Suspense fallback={fallback}>
        {hasAccess ? children : <AccessDeniedSection />}
      </Suspense>
    </ErrorBoundary>
  );
}
