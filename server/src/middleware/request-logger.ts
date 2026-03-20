import type { Request, Response, NextFunction } from "express";

function padTwo(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(): string {
  const now = new Date();
  return `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}`;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${formatTime()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}
