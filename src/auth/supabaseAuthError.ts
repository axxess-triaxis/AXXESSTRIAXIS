export class SupabaseAuthError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.name = "SupabaseAuthError";
    this.status = status;
    this.code = code;
  }
}

// Supabase Auth error bodies vary by endpoint/version: signup/token errors use
// `error_code`/`msg`, some legacy paths use `code`/`error_description`. We check all of
// them so callers can branch on a stable `code` (e.g. "user_already_exists",
// "email_not_confirmed") instead of re-parsing the response body themselves.
export async function parseSupabaseAuthErrorResponse(response: Response): Promise<SupabaseAuthError> {
  const text = await response.text().catch(() => "");
  let code: string | undefined;
  let message = `Supabase Auth request failed: ${response.status}`;

  if (text) {
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      code = typeof body.error_code === "string"
        ? body.error_code
        : typeof body.code === "string"
          ? body.code
          : undefined;
      const bodyMessage = typeof body.msg === "string"
        ? body.msg
        : typeof body.error_description === "string"
          ? body.error_description
          : typeof body.message === "string"
            ? body.message
            : undefined;
      if (bodyMessage) message = bodyMessage;
    } catch {
      // Non-JSON body -- keep the generic status-based message.
    }
  }

  return new SupabaseAuthError(response.status, code, message);
}
