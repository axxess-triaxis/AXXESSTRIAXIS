
  import { Suspense } from "react";
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./components/feedback/ErrorBoundary";
  import { LoadingState } from "./components/feedback/LoadingState";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  );
  
