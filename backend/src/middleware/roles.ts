import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export const requireRole = (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.authUser) return res.status(401).json({ message: "Unauthorized" });
  if (!roles.includes(req.authUser.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};
