import { AuthProvider } from "../auth/AuthProvider";
import { AnalyticsProviderShell } from "../services/analytics";
import App from "./App";

export default function WorkspacePage() {
  return (
    <AnalyticsProviderShell>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AnalyticsProviderShell>
  );
}
