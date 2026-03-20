import type { Request, Response, NextFunction } from "express";

export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
): (req: Request, res: Response, next: NextFunction) => void {
  const requests = new Map<string, number[]>();

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
