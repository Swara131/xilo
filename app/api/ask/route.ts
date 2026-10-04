import { NextResponse } from "next/server";
import { askFoodQuestion, type ChatTurn } from "@/lib/ask";

export const runtime = "nodejs";
export const maxDuration = 30;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function asTurn(value: unknown): ChatTurn | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.role !== "user" && record.role !== "assistant") return null;
  if (typeof record.content !== "string") return null;
  const content = record.content.trim().slice(0, 800);
  if (!content) return null;
  return { role: record.role, content };
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Type a question and try again.", 400);
    }
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const question = typeof record?.question === "string" ? record.question.trim() : "";
    if (!question || question.length > 500) {
      return jsonError("Ask a shorter question, up to a few sentences.", 400);
    }
    const history = Array.isArray(record?.history)
      ? record.history.map(asTurn).filter((turn): turn is ChatTurn => turn != null).slice(-6)
      : [];
    const context = typeof record?.context === "string" ? record.context.trim().slice(0, 2500) : "";

    const reply = await askFoodQuestion({ question, history, context });
    return NextResponse.json({ reply }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MISSING_API_KEY") {
      return jsonError("The assistant is not configured yet. Add the server API key and try again.", 500);
    }
    if (message === "AUTH_REJECTED") {
      return jsonError("The assistant rejected the request. Check that the server API key is valid.", 502);
    }
    if (message === "INSUFFICIENT_CREDITS") {
      return jsonError("The assistant does not have enough credits to answer right now. Please try again later.", 502);
    }
    if (message === "RATE_LIMITED") {
      return jsonError("The assistant is busy right now. Please wait a moment and try again.", 502);
    }
    if (message === "EMPTY_RESPONSE") {
      return jsonError("The assistant didn't return an answer. Please ask again.", 502);
    }
    console.error("Food question failed:", message === "PROVIDER_ERROR" ? message : "PROVIDER_ERROR");
    return jsonError("We couldn't answer that just now. Please try again in a moment.", 502);
  }
}
