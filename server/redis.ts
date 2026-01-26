import { Redis } from '@upstash/redis';
import 'dotenv/config';

// Initialize Redis client using environment variables
// Vercel KV usually sets KV_REST_API_URL and KV_REST_API_TOKEN
// We fall back to explicit checks if needed, but 'fromEnv' is also an option.
// Given strict types and .env names, specific init is safer.

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
    console.warn("Redis URL or Token is missing in environment variables. Caching will be disabled.");
}

export const redis = (redisUrl && redisToken)
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

/**
 * Helper to get or set cache
 * @param key Cache key
 * @param fetchFn Function to fetch data if cache miss
 * @param ttlSeconds TTL in seconds
 */
export async function getOrSetCache<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    if (!redis) {
        return fetchFn();
    }

    try {
        const cached = await redis.get<T>(key);
        if (cached) {
            // console.log(`[Cache HIT] ${key}`);
            return cached;
        }

        // console.log(`[Cache MISS] ${key}`);
        const freshData = await fetchFn();

        if (freshData) {
            await redis.set(key, freshData, { ex: ttlSeconds });
        }

        return freshData;
    } catch (error) {
        console.error(`[Redis Error] ${key}:`, error);
        return fetchFn(); // Fallback to fresh fetch on redis error
    }
}

/**
 * Helper to invalidate cache keys using a pattern
 * Upstash Redis (HTTP) scan/del pattern is a bit different than TCP request.
 * We can use 'keys' command (careful in prod) or just delete specific keys.
 * For this project, we might need specific keys or use a set to track related keys.
 * 
 * Simplified invalidation for now: just delete specific key if known, 
 * or if pattern needed, we fetch keys then del.
 */
export async function invalidatePattern(pattern: string) {
    if (!redis) return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`[Cache Invalidate] Pattern: ${pattern}, Deleted: ${keys.length}`);
        }
    } catch (error) {
        console.error(`[Redis Invalidate Error] Pattern ${pattern}:`, error);
    }
}
