import type { Request, Response, NextFunction } from "express";

export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
): (req: Request, res: Response, next: NextFunction) => void {
  const requests = new Map<string, number[]>();

  // Periodically prune stale entries to prevent memory leaks
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, timestamps] of requests) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, recent);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = requests.get(ip) ?? [];
    const recent = timestamps.filter((t) => t > windowStart);

    if (recent.length >= maxRequests) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    recent.push(now);
    requests.set(ip, recent);

    next();
  };
}
