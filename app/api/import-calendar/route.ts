import { NextResponse } from "next/server";
import {
  parseScheduleImport,
  sanitizeScheduleEntries,
  type ImportSource
} from "@/lib/import-calendar";
import type { ScheduleEntry } from "@/lib/schedule-parser";
import { hitRateLimit } from "@/lib/server/redis";

export const runtime = "nodejs";

const DEFAULT_MODEL = "deepseek/deepseek-chat";
const MAX_AI_INPUT_CHARS = 30000;

type ImportCalendarResponse = {
  entries: ScheduleEntry[];
  source: ImportSource;
  message?: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() ?? "";
}

function getModel() {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

function jsonResponse(body: ImportCalendarResponse, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

function extractTextFromResponse(data: OpenRouterResponse) {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function parseJsonFromModel(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* fall through */ }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try { return JSON.parse(objectMatch[0]); } catch { return null; }
  }
}

function containsJailbreakAttempt(text: string) {
  const lower = text.toLowerCase();
  const triggers = [
    "ignore previous",
    "disregard previous",
    "forget previous",
    "ignore all instructions",
    "new instructions",
    "system prompt",
    "bypass instructions",
  ];
  return triggers.some((trigger) => lower.includes(trigger));
}

function getTextFromRequestBody(body: unknown) {
  return body && typeof body === "object" && "text" in body && typeof (body as { text?: unknown }).text === "string"
    ? (body as { text: string }).text
    : "";
}

function buildPrompt(text: string) {
  return `Extract class schedules from <pasted_text> as JSON. 
Format: {"entries":[{"timeSlot":"7:30 AM - 9:00 AM","day":"Mon","course":"Code - Title","room":"","teacher":"","section":""}]}

Rules (Philippines Universities):
- course: Format as "CODE - FULL TITLE". Title is a long description (e.g., "Purposive Communication"). Code is short (e.g., "GECOMM").
- room: Short code/building (e.g., "ST 201", "OZ 502", "PH 4205", "V508"). DO NOT put this in course title.
- timeSlot: Always "H:MM AM - H:MM PM". Estimate 1.5h if only start time exists.
- Expand days: M=Mon, T=Tue, W=Wed, TH/H=Thu, F=Fri, S=Sat. UP/AdU: TTh=Tue+Thu, WF=Wed+Fri.
- Mapua: M-W-F = 3 separate entries for Mon, Wed, Fri.

<pasted_text>
${text.slice(0, MAX_AI_INPUT_CHARS)}
</pasted_text>`;
}

async function parseWithAI(text: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("AI not configured.");

  const model = getModel();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: buildPrompt(text) }],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.1
    })
  });

  const data = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "AI request failed.");
  }

  const textResponse = extractTextFromResponse(data);
  const parsed = parseJsonFromModel(textResponse);
  const rawEntries = parsed && typeof parsed === "object" && "entries" in parsed
    ? (parsed as { entries?: unknown }).entries
    : parsed;

  return sanitizeScheduleEntries(rawEntries);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { entries: [], source: "local", message: "Invalid request." },
      { status: 400 }
    );
  }

  const text = getTextFromRequestBody(body);
  if (text.length > 50000) {
    return jsonResponse(
      { entries: [], source: "local", message: "Input too long." },
      { status: 413 }
    );
  }

  if (containsJailbreakAttempt(text)) {
    return jsonResponse(
      { entries: [], source: "local", message: "Invalid input detected." },
      { status: 400 }
    );
  }

  const local = parseScheduleImport(text);

  if (local.entries.length && !local.shouldUseAi) {
    return jsonResponse({ entries: local.entries, source: "local" });
  }

  if (!local.scheduleLike) {
    return jsonResponse({
      entries: [],
      source: "local",
      message: "No schedule found."
    });
  }

  // Only rate-limit AI fallback attempts. Confident local parsing stays fast and avoids Redis latency.
  try {
    if (await hitRateLimit(request, "import", 10, 60 * 60)) {
      return jsonResponse(
        { entries: [], source: "local", message: "Too many requests." },
        { status: 429 }
      );
    }
  } catch (error) {
    console.error("Redis rate limit error:", error);
  }

  try {
    const aiEntries = await parseWithAI(text);

    if (aiEntries.length) {
      return jsonResponse({ entries: aiEntries, source: "ai" });
    }

    if (local.entries.length) {
      return jsonResponse({
        entries: local.entries,
        source: "local",
        message: "AI found no classes, used local."
      });
    }

    return jsonResponse({
      entries: [],
      source: "ai",
      message: "No classes found."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI failed.";

    if (local.entries.length) {
      return jsonResponse({
        entries: local.entries,
        source: "local",
        message: "AI failed, used local."
      });
    }

    return jsonResponse(
      { entries: [], source: "ai", message: "AI failed." },
      { status: 502 }
    );
  }
}
