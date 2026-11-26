import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // Local LangSmith tracing. Tracing must never stop the server from starting.
    if (process.env.LANGSMITH_TRACING === "true") {
      try {
        const { langsmithTracingStatus, registerLangsmithTracing } = await import("./src/services/ai/tracing/langsmithTracer");
        const status = langsmithTracingStatus(process.env);
        const registered = registerLangsmithTracing();
        console.info(registered ? "LangSmith tracing is on (local)." : `LangSmith tracing is off. ${status.enabled ? "" : status.reason}`.trim());
      } catch {
        console.warn("LangSmith tracing is off: it could not be loaded.");
      }
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
