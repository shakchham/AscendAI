import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

const sanitize = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(/<[^>]*>/g, "").trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v);
    return out;
  }
  return value;
};

export const validateBody = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = sanitize(req.body);
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Invalid request body", errors: error.flatten() });
    }
    return res.status(400).json({ message: "Invalid request body" });
  }
};
