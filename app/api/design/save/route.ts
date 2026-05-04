import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

let redis: Redis | null = null;
const DESIGN_TTL_DAYS = 30;
const DESIGN_TTL_SECONDS = DESIGN_TTL_DAYS * 24 * 60 * 60;
const DESIGN_PIN_WINDOWS = [
  { digits: 4, attempts: 30 },
  { digits: 5, attempts: 30 },
  { digits: 6, attempts: 30 }
] as const;

function getRedis() {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;

  if (!redis) {
    redis = new Redis({ url, token, automaticDeserialization: false });
  }

  return redis;
}

async function hashDesignCode(code: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function makeNumericPin(digits: number) {
  const min = 10 ** (digits - 1);
  const range = 9 * min;
  return Math.floor(min + Math.random() * range).toString();
}

async function reserveDesignId(client: Redis, id: string, code: string) {
  const result = await client.set(`design:${id}`, code, {
    ex: DESIGN_TTL_SECONDS,
    nx: true
  });
  return result === "OK";
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length > 500) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Short share links are not configured on this server." },
        { status: 503 }
      );
    }

    // Rate Limiting by IP
    let ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    ip = ip.split(",")[0].trim();
    
    if (ip !== "unknown") {
      const rlKey = `rl:design:${ip}`;
      const count = await redis.incr(rlKey);
      if (count === 1) {
        await redis.expire(rlKey, 3600); // 1 hour
      }
      if (count > 50) {
        return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
      }
    }

    // Check if exactly this code already has a short ID without using the whole code as a Redis key.
    const hashKey = `design_hash:${await hashDesignCode(code)}`;
    const existingId = await redis.get<string>(hashKey);
    
    if (existingId) {
      return NextResponse.json({ id: existingId, expiresInDays: DESIGN_TTL_DAYS });
    }

    // Generate a short numeric PIN and reserve it atomically so two designs cannot share an ID.
    let newId = "";
    for (const { digits, attempts } of DESIGN_PIN_WINDOWS) {
      for (let attempt = 0; attempt < attempts; attempt++) {
        const candidate = makeNumericPin(digits);
        if (await reserveDesignId(redis, candidate, code)) {
          newId = candidate;
          break;
        }
      }
      if (newId) break;
    }

    if (!newId) {
      return NextResponse.json({ error: "Could not allocate a unique PIN. Try again." }, { status: 503 });
    }

    // The reserve call already stored design:ID -> code for 30 days.
    // Store design_hash:CODE -> ID for the same TTL so repeated shares reuse the PIN.
    await redis.set(hashKey, newId, { ex: DESIGN_TTL_SECONDS });

    return NextResponse.json({ id: newId, expiresInDays: DESIGN_TTL_DAYS });
  } catch (error) {
    console.error("Save design error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
