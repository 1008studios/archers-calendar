import { NextResponse } from "next/server";
import { getRedisClient, hitRateLimit } from "@/lib/server/redis";

export const runtime = "edge";

export async function GET(req: Request) {
  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "Share links are not configured on this server." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || typeof id !== "string" || !/^\d{4,8}$/.test(id)) {
      return NextResponse.json({ error: "Invalid design ID" }, { status: 400 });
    }

    if (await hitRateLimit(req, "design:get", 200, 3600)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
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
