import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const syncSchema = z.object({
  role: z.enum(["student", "consultancy_admin", "teacher", "super_admin"]).default("student"),
  termsAccepted: z.boolean(),
  consultancyId: z.string().uuid().optional(),
});

export const authRouter = Router();

authRouter.post("/sync", requireAuth, validateBody(syncSchema), async (req, res) => {
  const { role, termsAccepted, consultancyId } = req.body as {
    role: UserRole;
    termsAccepted: boolean;
    consultancyId?: string;
  };
  const user = req.authUser!;

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email,
      phone: user.phone,
      role,
      consultancyId,
      termsAcceptedAt: termsAccepted ? new Date() : undefined,
    },
    create: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role,
      consultancyId,
      termsAcceptedAt: termsAccepted ? new Date() : null,
    },
  });

  if (role === "student") {
    await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, currentScore: 0 },
    });
  }

  res.json({ user: dbUser });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.authUser!.id },
    include: { essays: { take: 5, orderBy: { submittedAt: "desc" } } },
  });
  res.json({ user: dbUser });
});
