import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

let redis: Redis | null = null;

function getRedis() {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  if (!url || !token) return null;

  if (!redis) {
    redis = new Redis({ url, token, automaticDeserialization: false });
  }

  return redis;
}

export async function GET(req: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Share links are not configured on this server." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || typeof id !== "string" || !/^\d{4,8}$/.test(id)) {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 });
    }

    // Rate limiting: 200 reads per hour per IP
    let ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown";
    ip = ip.split(",")[0].trim();
    if (ip !== "unknown") {
      const rlKey = `rl:design:get:${ip}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, 3600);
      if (count > 200) {
        return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
      }
    }

    const code = await redis.get<string>(`design:${id}`);

    if (!code) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Get design error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
