import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiter (auth endpoints stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  message: 'Too many requests, try again later'
});

// General limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Helmet config
export const helmetMiddleware = helmet();