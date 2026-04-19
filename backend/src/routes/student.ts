import { Router } from "express";
import { z } from "zod";
import { universities } from "../data/universities";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireTermsAccepted } from "../middleware/requireTerms";
import { requireRole } from "../middleware/roles";
import { validateBody } from "../middleware/validate";

const targetSchema = z.object({
  targetScore: z.number().min(0).max(9),
});

export const studentRouter = Router();

studentRouter.use(requireAuth, userRateLimiter, requireTermsAccepted, requireRole("student"));

studentRouter.get("/dashboard", async (req, res) => {
  const student = await prisma.student.findUnique({ where: { userId: req.authUser!.id } });
  const attempts = await prisma.testAttempt.findMany({
    where: { studentId: req.authUser!.id },
    orderBy: { completedAt: "asc" },
    take: 10,
  });

  const chart = attempts.map((a: { score: number }, i: number) => ({ attempt: i + 1, score: a.score }));

  res.json({
    targetScore: student?.targetScore ?? 7,
    currentScore: student?.currentScore ?? 0,
    attempts,
    progressChart: chart.length ? chart : [{ attempt: 1, score: 5.5 }, { attempt: 2, score: 6.0 }],
  });
});

studentRouter.post("/target", validateBody(targetSchema), async (req, res) => {
  const { targetScore } = req.body as { targetScore: number };
  const student = await prisma.student.upsert({
    where: { userId: req.authUser!.id },
    update: { targetScore },
    create: { userId: req.authUser!.id, targetScore },
  });
  res.json({ student });
});

studentRouter.get("/recommendations", async (_req, res) => {
  const student = await prisma.student.findUnique({
    where: { userId: _req.authUser!.id },
    select: { currentScore: true, targetScore: true },
  });
  const score = student?.currentScore ?? student?.targetScore ?? 6;
  const matched = universities.filter((u) => score >= u.minIelts && score <= u.maxIelts);
  res.json({ score, universities: matched.length ? matched : universities.slice(0, 5) });
});
