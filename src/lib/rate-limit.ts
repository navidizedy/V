import { NextRequest } from "next/server";

// Simple in-memory rate limiter for API routes
// In production, use Redis or a dedicated rate limiting service
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): { success: boolean; remaining: number; reset: number } => {
    const identifier = getIdentifier(request);
    const now = Date.now();
    const key = `${identifier}:${config.interval}`;

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + config.interval,
      };
      return {
        success: true,
        remaining: config.maxRequests - 1,
        reset: store[key].resetTime,
      };
    }

    store[key].count++;

    const success = store[key].count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - store[key].count);

    return {
      success,
      remaining,
      reset: store[key].resetTime,
    };
  };
}

function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for reverse proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return "unknown";
}

// Preset configurations
export const rateLimitPresets = {
  // Strict for auth routes
  auth: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  }),
  // Moderate for API routes
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),
  // Lenient for public routes
  public: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 120,
  }),
};
