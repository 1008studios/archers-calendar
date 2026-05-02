import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length > 500) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
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

    // Check if exactly this code already has a short ID
    // We hash the code by taking a simple SHA-256 or just storing `hash:${code}` -> id
    // Since ac3 codes are short (< 100 chars), we can literally use it as a key.
    const hashKey = `design_hash:${code}`;
    const existingId = await redis.get<string>(hashKey);
    
    if (existingId) {
      return NextResponse.json({ id: existingId });
    }

    // Generate a new short numeric ID (5 to 6 digits)
    let newId = "";
    let attempts = 0;
    while (attempts < 10) {
      newId = Math.floor(10000 + Math.random() * 90000).toString(); // 10000 to 99999
      const exists = await redis.exists(`design:${newId}`);
      if (!exists) break;
      attempts++;
    }

    if (attempts >= 10) {
      // If we are insanely lucky/unlucky and collide 10 times, extend the length
      newId = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Store in Redis
    // design:ID -> the full code string (e.g. ac3.bk~gradient...)
    // design_hash:CODE -> the ID
    const pipeline = redis.pipeline();
    pipeline.set(`design:${newId}`, code, { ex: 30 * 24 * 60 * 60 }); // 30 days
    pipeline.set(hashKey, newId, { ex: 30 * 24 * 60 * 60 }); // 30 days
    
    await pipeline.exec();

    return NextResponse.json({ id: newId });
  } catch (error) {
    console.error("Save design error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
