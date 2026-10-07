// Lightweight In-Memory Rate Limiter Middleware
const requestCounts = new Map();

export function rateLimiter({ windowMs = 60 * 1000, maxRequests = 100 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const now = Date.now();

    const record = requestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    requestCounts.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests, please try again in a moment.',
          status: 429,
        },
      });
    }

    next();
  };
}
