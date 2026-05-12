import { NextResponse } from "next/server";
import { getRedisClient, hitRateLimit } from "@/lib/server/redis";

export const runtime = "edge";

const EVENT_TTL_SECONDS = 90 * 24 * 60 * 60;
const MAX_BODY_CHARS = 2048;

const ALLOWED_EVENTS = new Set([
  "app_open",
  "session_duration",
  "device_selected",
  "font_selected",
  "background_selected",
  "course_theme_selected",
  "auto_course_colors",
  "auto_background",
  "parse_success",
  "parse_failed",
  "export_completed",
  "bug_report_click"
]);

const ALLOWED_PROPS = new Set([
  "device",
  "font",
  "backgroundKind",
  "backgroundTone",
  "appTheme",
  "gradientPreset",
  "lineKind",
  "emoji",
  "courseTheme",
  "source",
  "entries",
  "reason",
  "exportVariant",
  "count",
  "delivery",
  "target",
  "mode",
  "seconds"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bucketNumber(name: string, value: number) {
  if (name === "seconds") {
    if (value <= 15) return "0-15s";
    if (value <= 60) return "16-60s";
    if (value <= 180) return "1-3m";
    if (value <= 600) return "3-10m";
    if (value <= 1800) return "10-30m";
    return "30m+";
  }

  if (name === "entries") {
    if (value <= 0) return "0";
    if (value <= 3) return "1-3";
    if (value <= 7) return "4-7";
    if (value <= 12) return "8-12";
    return "13+";
  }

  if (name === "count") {
    if (value <= 1) return "1";
    if (value <= 3) return "2-3";
    return "4+";
  }

  return String(Math.round(value));
}

function cleanValue(name: string, value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return bucketNumber(name, Math.max(0, value));
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[^a-zA-Z0-9\s#:/._-]/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const start = Date.now();
  const requestId = req.headers.get("x-vercel-id") ?? "";

  console.log(JSON.stringify({ level: "info", msg: "analytics_start", route: "/api/analytics", requestId }));

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 413 });
    }

    const body = JSON.parse(raw) as unknown;
    if (!isRecord(body) || typeof body.event !== "string" || !ALLOWED_EVENTS.has(body.event)) {
      return NextResponse.json({ ok: false, error: "Invalid event." }, { status: 400 });
    }

    if (await hitRateLimit(req, "analytics", 240, 10 * 60)) {
      return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ ok: true, stored: false });
    }

    const props = isRecord(body.props) ? body.props : {};
    const event = body.event;
    const day = new Date().toISOString().slice(0, 10);
    const dayEventKey = `analytics:${day}:events`;
    const allEventKey = "analytics:all:events";
    const writes: Promise<unknown>[] = [
      redis.hincrby(dayEventKey, event, 1),
      redis.expire(dayEventKey, EVENT_TTL_SECONDS),
      redis.hincrby(allEventKey, event, 1)
    ];

    for (const [name, rawValue] of Object.entries(props)) {
      if (!ALLOWED_PROPS.has(name)) continue;
      const value = cleanValue(name, rawValue);
      if (!value) continue;

      const propKey = `analytics:${day}:${name}`;
      writes.push(redis.hincrby(propKey, value, 1));
      writes.push(redis.expire(propKey, EVENT_TTL_SECONDS));
    }

    await Promise.all(writes);
    console.log(JSON.stringify({ level: "info", msg: "analytics_done", route: "/api/analytics", event, ms: Date.now() - start }));
    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      msg: "analytics_failed",
      route: "/api/analytics",
      error: error instanceof Error ? error.message : "unknown",
      ms: Date.now() - start
    }));
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}
