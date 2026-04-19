import rateLimit from "express-rate-limit";

export const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.authUser?.id ?? req.ip ?? "anonymous",
});
