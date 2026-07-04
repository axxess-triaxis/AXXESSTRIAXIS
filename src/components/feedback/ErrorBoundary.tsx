import { Component, type ErrorInfo, type ReactNode } from "react";
import { trackEvent } from "../../services/analytics";
import { EmptyState } from "./EmptyState";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    trackEvent("error_boundary_triggered", {
      component_stack_present: Boolean(errorInfo.componentStack),
      error_name: error.name,
    }, {
      module_name: "error-boundary",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    console.error("AXXESS UI boundary captured an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <EmptyState
            title="Workspace unavailable"
            message="The interface hit an unexpected rendering problem. Refresh the page to continue."
          />
        </div>
      );
    }

    return this.props.children;
  }
}
