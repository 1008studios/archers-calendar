import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

export function getRedisClient() {
  if (redis !== undefined) return redis;

  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  redis = url && token ? new Redis({ url, token, automaticDeserialization: false }) : null;
  return redis;
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || "unknown";
}

export async function hitRateLimit(request: Request, prefix: string, limit: number, windowSeconds: number) {
  const client = getRedisClient();
  if (!client) return false;

  const ip = getRequestIp(request);
  if (ip === "unknown") return false;

  const key = `rl:${prefix}:${ip}`;
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, windowSeconds);
  return count > limit;
}
