import { PaymentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ieltsQuestions } from "../data/ieltsMock";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireTermsAccepted } from "../middleware/requireTerms";
import { requireRole } from "../middleware/roles";
import { validateBody } from "../middleware/validate";

const submitSchema = z.object({
  answers: z.record(z.string()),
});

const ieltsType = "IELTS";
const oneMonthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
};

export const mockTestRouter = Router();
mockTestRouter.use(requireAuth, userRateLimiter, requireTermsAccepted, requireRole("student"));

mockTestRouter.get("/ielts", async (_req, res) => {
  const existing = await prisma.mockTest.findFirst({ where: { type: ieltsType } });
  if (!existing) {
    await prisma.mockTest.create({
      data: {
        type: ieltsType,
        questions: ieltsQuestions.map((q) => ({ id: q.id, question: q.question, options: q.options })),
        answers: ieltsQuestions.reduce<Record<string, string>>((acc, q) => {
          acc[q.id] = q.answer;
          return acc;
        }, {}),
        timeLimit: 1800,
      },
    });
  }

  res.json({
    type: ieltsType,
    timeLimit: 1800,
    questions: ieltsQuestions.map((q) => ({ id: q.id, question: q.question, options: q.options })),
  });
});

mockTestRouter.post("/ielts/submit", validateBody(submitSchema), async (req, res) => {
  const userId = req.authUser!.id;
  const attemptsThisMonth = await prisma.testAttempt.count({
    where: { studentId: userId, completedAt: { gte: oneMonthAgo() } },
  });
  const hasPaidPass = await prisma.payment.findFirst({
    where: { userId, amount: 250, status: PaymentStatus.paid, paymentMethod: "esewa_placeholder" },
    orderBy: { createdAt: "desc" },
  });

  if (attemptsThisMonth >= 1 && !hasPaidPass) {
    return res.status(402).json({
      message: "Free tier used. Please complete dummy Esewa payment of NPR 250 for another test.",
      code: "PAYMENT_REQUIRED",
    });
  }

  const test = await prisma.mockTest.findFirst({ where: { type: ieltsType } });
  if (!test) return res.status(500).json({ message: "Mock test not initialized" });

  const correctMap = test.answers as Record<string, string>;
  const answers = (req.body as { answers: Record<string, string> }).answers;
  const total = Object.keys(correctMap).length;
  const correct = Object.entries(correctMap).filter(([id, ans]) => answers[id] === ans).length;
  const percentage = (correct / total) * 100;
  const bandScore = Number((4 + (percentage / 100) * 5).toFixed(1));

  const attempt = await prisma.testAttempt.create({
    data: {
      studentId: userId,
      testId: test.id,
      score: bandScore,
      answers,
    },
  });

  await prisma.student.upsert({
    where: { userId },
    update: { currentScore: bandScore },
    create: { userId, currentScore: bandScore },
  });

  res.json({ attemptId: attempt.id, score: bandScore, correct, total });
});
