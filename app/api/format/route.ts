import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { MockFormatterError, mockFormat } from "@/lib/mock-formatter";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { ResponseValidationError, validateFormatResponse } from "@/lib/validate-response";

// Route segment config must be a statically analyzable literal, so this can't
// read from lib/config.ts directly — keep it in sync with routeMaxDurationSeconds there.
export const maxDuration = 55;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSessionToken(session)) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.text !== "string" ||
    typeof body.sourceName !== "string" ||
    body.text.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "Request must include a non-empty 'text' string and a 'sourceName' string." },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  let raw: unknown;

  if (!webhookUrl) {
    try {
      raw = await mockFormat(body.text, body.sourceName);
    } catch (error) {
      const status = error instanceof MockFormatterError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Mock formatter failed.";
      return NextResponse.json({ error: message }, { status });
    }
  } else {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(webhookSecret ? { "X-Webhook-Secret": webhookSecret } : {}),
        },
        body: JSON.stringify({ text: body.text, sourceName: body.sourceName }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      const message = controller.signal.aborted
        ? "The formatting run took too long and timed out."
        : "Could not reach the formatting service.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Formatting service returned an error (${response.status}).${detail ? ` ${detail}` : ""}` },
        { status: response.status }
      );
    }

    raw = await response.json().catch(() => null);
  }

  try {
    const validated = validateFormatResponse(raw);
    return NextResponse.json(validated);
  } catch (error) {
    const message =
      error instanceof ResponseValidationError
        ? `Malformed response from the formatting service: ${error.message}`
        : "Malformed response from the formatting service.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
