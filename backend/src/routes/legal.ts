import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const legalRouter = Router();

legalRouter.post("/accept", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { termsAcceptedAt: new Date() },
  });
  res.json({ accepted: Boolean(updated.termsAcceptedAt) });
});
