import { Component, type ErrorInfo, type ReactNode } from "react";
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
    // Sprint 1 keeps this local. Sprint 2 should route it to audit/telemetry.
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
