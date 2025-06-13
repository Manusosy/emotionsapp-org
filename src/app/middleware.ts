import { NextResponse, type NextRequest } from 'next/server';

// Define rate limit window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute

// Simple in-memory store for rate limiting
// In production, use Redis or another persistent store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Rate limiting middleware
 * Implements IP-based rate limiting for API routes
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Only apply rate limiting to API routes
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return response;
  }
  
  // Get IP address from request
  const ip = request.ip || 'anonymous';
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  
  // Initialize or get current rate limit data
  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
  }
  
  // Increment the request count
  rateLimitStore[key].count += 1;
  
  // Set headers to communicate rate limit status
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - rateLimitStore[key].count).toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitStore[key].resetTime / 1000).toString());
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (rateLimitStore[key].count > MAX_REQUESTS_PER_WINDOW) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Rate limit exceeded, please try again later' 
      }), 
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(
            (rateLimitStore[key].resetTime - now) / 1000
          ).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitStore[key].resetTime / 1000).toString(),
        }
      }
    );
  }
  
  return response;
}

export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
  ],
}; 