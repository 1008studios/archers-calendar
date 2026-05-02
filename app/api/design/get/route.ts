import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || typeof id !== "string" || !/^\d{4,8}$/.test(id)) {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 });
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
