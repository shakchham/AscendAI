import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const requireTermsAccepted = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.authUser) return res.status(401).json({ message: "Unauthorized" });

  const user = await prisma.user.findUnique({
    where: { id: req.authUser.id },
    select: { termsAcceptedAt: true },
  });

  if (!user?.termsAcceptedAt) {
    return res.status(403).json({ message: "Terms and privacy must be accepted before first login." });
  }

  return next();
};
