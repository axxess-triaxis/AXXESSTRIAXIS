import { AuthProvider } from "../../../auth/AuthProvider";
import { AIReviewInboxPage } from "../../../features/ai-workspace/AIReviewInboxPage";
import { AnalyticsProviderShell } from "../../../services/analytics";

export default function ReviewInboxRoute() {
  return (
    <AnalyticsProviderShell>
      <AuthProvider>
        <AIReviewInboxPage />
      </AuthProvider>
    </AnalyticsProviderShell>
  );
}
