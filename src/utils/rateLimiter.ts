interface RateLimitData {
  attempts: number;
  lastAttempt: number;
}

const SIGNUP_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SIGNUP_ATTEMPTS = 5;

class RateLimiter {
  private storage: Map<string, RateLimitData>;

  constructor() {
    this.storage = new Map();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, data] of this.storage.entries()) {
      if (now - data.lastAttempt >= SIGNUP_TIMEOUT) {
        this.storage.delete(key);
      }
    }
  }

  checkRateLimit(key: string): boolean {
    this.cleanup();
    
    const data = this.storage.get(key);
    const now = Date.now();

    if (!data) {
      this.storage.set(key, { attempts: 1, lastAttempt: now });
      return true;
    }

    if (now - data.lastAttempt >= SIGNUP_TIMEOUT) {
      this.storage.set(key, { attempts: 1, lastAttempt: now });
      return true;
    }

    if (data.attempts >= MAX_SIGNUP_ATTEMPTS) {
      return false;
    }

    this.storage.set(key, {
      attempts: data.attempts + 1,
      lastAttempt: now
    });

    return true;
  }

  getRemainingAttempts(key: string): number {
    const data = this.storage.get(key);
    if (!data) return MAX_SIGNUP_ATTEMPTS;
    
    const now = Date.now();
    if (now - data.lastAttempt >= SIGNUP_TIMEOUT) return MAX_SIGNUP_ATTEMPTS;
    
    return Math.max(0, MAX_SIGNUP_ATTEMPTS - data.attempts);
  }

  getTimeoutRemaining(key: string): number {
    const data = this.storage.get(key);
    if (!data) return 0;
    
    const now = Date.now();
    const timeElapsed = now - data.lastAttempt;
    if (timeElapsed >= SIGNUP_TIMEOUT) return 0;
    
    return SIGNUP_TIMEOUT - timeElapsed;
  }

  resetAttempts(key: string): void {
    this.storage.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
