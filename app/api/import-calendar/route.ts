import { NextResponse } from "next/server";
import {
  parseScheduleImport,
  sanitizeScheduleEntries,
  type ImportSource
} from "@/lib/import-calendar";
import type { ScheduleEntry } from "@/lib/schedule-parser";

export const runtime = "nodejs";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";
const MAX_AI_INPUT_CHARS = 30000;

type ImportCalendarResponse = {
  entries: ScheduleEntry[];
  source: ImportSource;
  message?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

function getGeminiModel() {
  return (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL).replace(/^models\//, "");
}

function jsonResponse(body: ImportCalendarResponse, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

function extractTextFromGeminiResponse(data: GeminiResponse) {
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function parseJsonFromModel(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON object from markdown code block or raw text
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* fall through */ }
    }
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try { return JSON.parse(objectMatch[0]); } catch { return null; }
  }
}

function getTextFromRequestBody(body: unknown) {
  return body && typeof body === "object" && "text" in body && typeof (body as { text?: unknown }).text === "string"
    ? (body as { text: string }).text
    : "";
}

function buildPrompt(text: string) {
  return `You are a DLSU (De La Salle University Manila) schedule extractor. Extract all class schedule entries from the pasted text and return them as JSON.

## Output format
Return ONLY valid JSON matching this exact shape, no markdown, no explanation:
{"entries":[{"timeSlot":"7:30 AM - 9:00 AM","day":"Mon","course":"GEGR1000 - GREAT BOOKS","room":"V508","teacher":"Juan Dela Cruz","section":"E37"}]}

## Field rules
- **timeSlot**: Normalize to "H:MM AM - H:MM PM" format (e.g. "7:30 AM - 9:00 AM", "1:00 PM - 2:30 PM"). Always include AM/PM for both start and end.
- **day**: Must be exactly one of: Mon, Tue, Wed, Thu, Fri, Sat, Sun
- **course**: Include both course code AND full title when available (e.g. "GESCOM1 - PURPOSIVE COMMUNICATION"). If only code, use just the code.
- **room**: Room code (e.g. "V508", "SJ101", "ONLINE"). Empty string if not found.
- **teacher**: Full teacher name. Empty string if not found.
- **section**: Section code (e.g. "E37", "A12"). Empty string if not found.

## Day code expansion (CRITICAL)
Expand compact day codes into separate entries (one per day):
- M = Mon
- T = Tue  
- W = Wed
- TH or H = Thu (IMPORTANT: in "TTH", the second T+H = Thu, not two Tuesdays)
- F = Fri
- S = Sat
- SUN = Sun
- MTH → Mon + Thu (separate entries, same time/course)
- TTH → Tue + Thu (separate entries)
- MWF → Mon + Wed + Fri (3 separate entries)
- MW → Mon + Wed
- TF → Tue + Fri
- MTWTHF → Mon + Tue + Wed + Thu + Fri

## Source formats you may encounter

### 1. ArchersHub "Schedule Week" table (most common)
Tab-separated columns: Time Slot | Mon | Tue | Wed | Thu | Fri | Sat
Each cell may contain: COURSECODE - Course Title\\nRoom : V508 Teacher : Juan Dela Cruz Section : E37
Extract one entry per non-empty cell.

### 2. EAF (Enlistment Advice Form)
Format: Sr.No  CourseCode-CourseTitle  CourseType  Units  ...
Schedule appears as: DAY|STARTTIME-ENDTIME|ROOM
Example: "TTH|7:30AM-9:00AM|V508" → two entries (Tue and Thu, 7:30 AM - 9:00 AM, room V508)

### 3. Free-form / copy-pasted text
Lines like: "GESCOM1 - PURPOSIVE COMM  TTH  7:30-9:00 AM  V508  Juan Dela Cruz  E37"
Extract what you can, make one entry per day.

## What to ignore
- Navigation menus, login text, privacy notices, page headers/footers
- "Please Select" placeholder text
- Total units, GPA, balance, financial info
- If the text is clearly not a class schedule, return {"entries":[]}

## Pasted text:
${text.slice(0, MAX_AI_INPUT_CHARS)}`;
}

async function parseWithGemini(text: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("AI fallback is not configured.");
  }

  const model = getGeminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(text) }]
          }
        ],
        generationConfig: {
          temperature: 0,
          topP: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            propertyOrdering: ["entries"],
            properties: {
              entries: {
                type: "array",
                items: {
                  type: "object",
                  propertyOrdering: ["timeSlot", "day", "course", "room", "teacher", "section"],
                  properties: {
                    timeSlot: {
                      type: "string",
                      description: "Normalized time range, e.g. '7:30 AM - 9:00 AM'"
                    },
                    day: {
                      type: "string",
                      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                    },
                    course: {
                      type: "string",
                      description: "Course code and title, e.g. 'GEGR1000 - GREAT BOOKS'"
                    },
                    room: { type: "string" },
                    teacher: { type: "string" },
                    section: { type: "string" }
                  },
                  required: ["timeSlot", "day", "course", "room", "teacher", "section"]
                }
              }
            },
            required: ["entries"]
          },
          thinkingConfig: {
            thinkingBudget: 1024
          }
        }
      })
    }
  );

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || "AI fallback request failed.");
  }

  const textResponse = extractTextFromGeminiResponse(data);
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
      { entries: [], source: "local", message: "Invalid import request." },
      { status: 400 }
    );
  }

  const text = getTextFromRequestBody(body);
  const local = parseScheduleImport(text);

  if (local.entries.length && !local.shouldUseAi) {
    return jsonResponse({ entries: local.entries, source: "local" });
  }

  if (!local.scheduleLike) {
    return jsonResponse({
      entries: [],
      source: "local",
      message: local.message ?? "No schedule details found in the pasted text."
    });
  }

  try {
    const aiEntries = await parseWithGemini(text);

    if (aiEntries.length) {
      return jsonResponse({ entries: aiEntries, source: "ai" });
    }

    if (local.entries.length) {
      return jsonResponse({
        entries: local.entries,
        source: "local",
        message: "AI fallback found no extra classes, so the local import was used."
      });
    }

    return jsonResponse({
      entries: [],
      source: "ai",
      message: "No classes were found in the pasted schedule."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI fallback failed.";

    if (local.entries.length) {
      return jsonResponse({
        entries: local.entries,
        source: "local",
        message: `${message} Imported the local parser results instead.`
      });
    }

    return jsonResponse(
      {
        entries: [],
        source: "ai",
        message
      },
      { status: 502 }
    );
  }
}
