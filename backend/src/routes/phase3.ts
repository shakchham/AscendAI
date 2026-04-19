import { createHash, randomBytes } from "crypto";
import { parse } from "csv-parse/sync";
import { PaymentStatus, SubscriptionPlan, WebhookProvider } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { examBanks } from "../data/examBanks";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireRole } from "../middleware/roles";
import { validateBody } from "../middleware/validate";

const supportedExams = ["IELTS", "GMAT", "GRE", "PTE"] as const;
const examEnum = z.enum(supportedExams);

const submitSchema = z.object({
  answers: z.record(z.string()),
});

const speakingSchema = z.object({
  transcript: z.string().optional(),
  audioBase64: z.string().optional(),
});

const planSchema = z.object({
  plan: z.enum(["monthly_1500", "yearly_15000", "consultancy_per_student_1000"]),
});

const proctorSchema = z.object({
  attemptId: z.string().optional(),
  eventType: z.string().min(3),
  metadata: z.any().optional(),
});

const bankUploadSchema = z.object({
  examType: examEnum,
  title: z.string().min(3),
  csv: z.string().min(5),
});

const apiKeySchema = z.object({
  label: z.string().min(2),
});

const offlineSyncSchema = z.object({
  attempts: z.array(
    z.object({
      examType: examEnum,
      answers: z.record(z.string()),
      completedAt: z.string().datetime(),
    }),
  ),
});

const catStartSchema = z.object({
  examType: examEnum.default("GMAT"),
});

const catAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

const webhookSchema = z.object({
  payload: z.any(),
});

const addAudit = async (userId: string | null, action: string, targetType: string, targetId?: string, metadata?: unknown) => {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      targetType,
      targetId,
      metadata: metadata as object | undefined,
    },
  });
};

const scoreExam = (examType: keyof typeof examBanks, answers: Record<string, string>) => {
  const questions = examBanks[examType];
  const total = questions.length;
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const score = Number(((correct / total) * 100).toFixed(1));
  return { total, correct, score };
};

export const phase3Router = Router();
phase3Router.use(requireAuth, userRateLimiter);

phase3Router.get("/mock-tests/:type", requireRole("student"), (req, res) => {
  const type = req.params.type.toUpperCase() as keyof typeof examBanks;
  const questions = examBanks[type];
  if (!questions) return res.status(404).json({ message: "Unsupported exam type" });
  res.json({
    type,
    adaptiveAvailable: true,
    questions: questions.map((q) => ({ id: q.id, question: q.question, options: q.options, difficulty: q.difficulty })),
  });
});

phase3Router.post("/mock-tests/:type/submit", requireRole("student"), validateBody(submitSchema), async (req, res) => {
  const type = req.params.type.toUpperCase() as keyof typeof examBanks;
  if (!examBanks[type]) return res.status(404).json({ message: "Unsupported exam type" });
  const { answers } = req.body as z.infer<typeof submitSchema>;
  const result = scoreExam(type, answers);

  const test = await prisma.mockTest.findFirst({ where: { type } });
  const testId =
    test?.id ??
    (
      await prisma.mockTest.create({
        data: {
          type,
          questions: examBanks[type].map((q) => ({ id: q.id, question: q.question, options: q.options })),
          answers: examBanks[type].reduce<Record<string, string>>((acc, q) => {
            acc[q.id] = q.answer;
            return acc;
          }, {}),
          timeLimit: 1800,
        },
      })
    ).id;

  const attempt = await prisma.testAttempt.create({
    data: {
      studentId: req.authUser!.id,
      testId,
      score: result.score,
      answers,
      completedAt: new Date(),
    },
  });
  await addAudit(req.authUser!.id, "mock_submit", "test_attempt", attempt.id, { examType: type, score: result.score });
  res.json({ attemptId: attempt.id, ...result });
});

phase3Router.post("/cat/start", requireRole("student"), validateBody(catStartSchema), async (req, res) => {
  const { examType } = req.body as z.infer<typeof catStartSchema>;
  const questions = examBanks[examType];
  const session = await prisma.adaptiveAttempt.create({
    data: {
      userId: req.authUser!.id,
      examType,
      currentDifficulty: 2,
      questionIndex: 0,
      score: 0,
      state: { asked: [], answers: {} },
    },
  });
  const first = questions.find((q) => q.difficulty === 2) ?? questions[0];
  res.json({ sessionId: session.id, question: { id: first.id, question: first.question, options: first.options, difficulty: first.difficulty } });
});

phase3Router.post("/cat/:sessionId/answer", requireRole("student"), validateBody(catAnswerSchema), async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, answer } = req.body as z.infer<typeof catAnswerSchema>;
  const session = await prisma.adaptiveAttempt.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ message: "Session not found" });
  const bank = examBanks[session.examType as keyof typeof examBanks];
  const question = bank.find((q) => q.id === questionId);
  if (!question) return res.status(400).json({ message: "Invalid question" });

  const state = (session.state as { asked: string[]; answers: Record<string, string> }) ?? { asked: [], answers: {} };
  state.asked.push(questionId);
  state.answers[questionId] = answer;
  const isCorrect = answer === question.answer;
  const nextDifficulty = Math.max(1, Math.min(3, session.currentDifficulty + (isCorrect ? 1 : -1)));

  const remaining = bank.filter((q) => !state.asked.includes(q.id));
  const nextQ = remaining.find((q) => q.difficulty === nextDifficulty) ?? remaining[0];
  const completed = !nextQ;
  const answeredTotal = Object.keys(state.answers).length;
  const correct = Object.entries(state.answers).filter(([id, ans]) => bank.find((q) => q.id === id)?.answer === ans).length;
  const score = Number(((correct / Math.max(1, answeredTotal)) * 100).toFixed(1));

  const updated = await prisma.adaptiveAttempt.update({
    where: { id: sessionId },
    data: {
      currentDifficulty: nextDifficulty,
      questionIndex: session.questionIndex + 1,
      score,
      completed,
      state,
    },
  });

  res.json({
    session: { id: updated.id, score: updated.score, completed: updated.completed },
    nextQuestion: nextQ ? { id: nextQ.id, question: nextQ.question, options: nextQ.options, difficulty: nextQ.difficulty } : null,
  });
});

phase3Router.post("/speaking/evaluate", requireRole("student"), validateBody(speakingSchema), async (req, res) => {
  const { transcript, audioBase64 } = req.body as z.infer<typeof speakingSchema>;
  const feedback =
    "Speaking evaluation placeholder (Whisper/Groq): Fluency moderate, pronunciation acceptable, coherence can improve. Practice timed responses.";
  const attempt = await prisma.speakingAttempt.create({
    data: {
      userId: req.authUser!.id,
      transcript,
      aiFeedback: feedback,
      audioRef: audioBase64 ? `inline:${audioBase64.slice(0, 32)}` : null,
    },
  });
  await addAudit(req.authUser!.id, "speaking_evaluate", "speaking_attempt", attempt.id);
  res.json({ attemptId: attempt.id, feedback, provider: "groq-whisper-placeholder" });
});

phase3Router.post("/payments/webhooks/:provider", validateBody(webhookSchema), async (req, res) => {
  const provider = req.params.provider as WebhookProvider;
  if (!["esewa", "khalti", "stripe"].includes(provider)) {
    return res.status(400).json({ message: "Unsupported provider" });
  }
  const event = await prisma.paymentWebhookEvent.create({
    data: { provider, payload: req.body, processed: true },
  });
  await addAudit(req.authUser?.id ?? null, "webhook_received", "payment_webhook_event", event.id, { provider });
  res.json({ received: true, eventId: event.id });
});

phase3Router.post("/subscriptions/create", validateBody(planSchema), async (req, res) => {
  const { plan } = req.body as z.infer<typeof planSchema>;
  const amount = plan === "monthly_1500" ? 1500 : plan === "yearly_15000" ? 15000 : 1000;
  const sub = await prisma.subscription.create({
    data: {
      userId: req.authUser!.id,
      plan: plan as SubscriptionPlan,
      amount,
      status: PaymentStatus.pending,
    },
  });
  await addAudit(req.authUser!.id, "subscription_create", "subscription", sub.id, { plan, amount });
  res.json({ subscription: sub });
});

phase3Router.get("/subscriptions/me", async (req, res) => {
  const subscriptions = await prisma.subscription.findMany({ where: { userId: req.authUser!.id }, orderBy: { createdAt: "desc" } });
  res.json({ subscriptions });
});

phase3Router.post("/proctor/events", requireRole("student"), validateBody(proctorSchema), async (req, res) => {
  const body = req.body as z.infer<typeof proctorSchema>;
  const event = await prisma.proctorEvent.create({
    data: {
      userId: req.authUser!.id,
      attemptId: body.attemptId,
      eventType: body.eventType,
      metadata: body.metadata as object | undefined,
    },
  });
  res.json({ stored: true, eventId: event.id, note: "basic proctoring placeholder" });
});

phase3Router.post("/question-bank/upload-csv", requireRole("consultancy_admin", "teacher", "super_admin"), validateBody(bankUploadSchema), async (req, res) => {
  const { examType, title, csv } = req.body as z.infer<typeof bankUploadSchema>;
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
  const questions = rows.map((r, idx) => ({
    id: r.id ?? `q${idx + 1}`,
    question: r.question,
    options: [r.option1, r.option2, r.option3, r.option4].filter(Boolean),
    answer: r.answer,
    difficulty: Number(r.difficulty ?? 2),
  }));
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(400).json({ message: "Consultancy required" });
  const bank = await prisma.questionBank.create({
    data: { consultancyId: user.consultancyId, examType, title, questions, createdBy: req.authUser!.id },
  });
  await addAudit(req.authUser!.id, "question_bank_upload", "question_bank", bank.id, { count: questions.length });
  res.json({ questionBankId: bank.id, count: questions.length });
});

phase3Router.post("/api-keys/generate", requireRole("consultancy_admin", "super_admin"), validateBody(apiKeySchema), async (req, res) => {
  const { label } = req.body as z.infer<typeof apiKeySchema>;
  const raw = `ak_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const key = await prisma.apiKey.create({
    data: { userId: req.authUser!.id, label, keyHash, active: true },
  });
  await addAudit(req.authUser!.id, "api_key_generate", "api_key", key.id);
  res.json({ id: key.id, label: key.label, apiKey: raw });
});

phase3Router.get("/api-keys", requireRole("consultancy_admin", "super_admin"), async (req, res) => {
  const keys = await prisma.apiKey.findMany({ where: { userId: req.authUser!.id }, orderBy: { createdAt: "desc" } });
  res.json({ keys: keys.map((k) => ({ id: k.id, label: k.label, active: k.active, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })) });
});

phase3Router.get("/institute/data", async (req, res) => {
  const rawKey = req.headers["x-api-key"];
  if (!rawKey || typeof rawKey !== "string") return res.status(401).json({ message: "Missing API key" });
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await prisma.apiKey.findFirst({ where: { keyHash: hash, active: true } });
  if (!apiKey) return res.status(401).json({ message: "Invalid API key" });
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  res.json({ ok: true, dataset: "institute-readonly-placeholder" });
});

phase3Router.post("/offline-sync/attempts", requireRole("student"), validateBody(offlineSyncSchema), async (req, res) => {
  const { attempts } = req.body as z.infer<typeof offlineSyncSchema>;
  let synced = 0;
  for (const a of attempts) {
    const exam = examBanks[a.examType];
    const test = await prisma.mockTest.findFirst({ where: { type: a.examType } });
    const testId =
      test?.id ??
      (
        await prisma.mockTest.create({
          data: {
            type: a.examType,
            questions: exam.map((q) => ({ id: q.id, question: q.question, options: q.options })),
            answers: exam.reduce<Record<string, string>>((acc, q) => {
              acc[q.id] = q.answer;
              return acc;
            }, {}),
            timeLimit: 1800,
          },
        })
      ).id;
    const score = scoreExam(a.examType, a.answers).score;
    await prisma.testAttempt.create({
      data: {
        studentId: req.authUser!.id,
        testId,
        score,
        answers: a.answers,
        completedAt: new Date(a.completedAt),
      },
    });
    synced += 1;
  }
  res.json({ synced });
});

phase3Router.post("/account/delete-request", async (req, res) => {
  const processBy = new Date();
  processBy.setDate(processBy.getDate() + 30);
  const request = await prisma.deletionRequest.create({
    data: {
      userId: req.authUser!.id,
      processBy,
    },
  });
  await addAudit(req.authUser!.id, "delete_request_create", "deletion_request", request.id, { processBy });
  res.json({ requestId: request.id, processBy });
});

phase3Router.post("/account/delete-request/:id/process", requireRole("super_admin"), async (req, res) => {
  const reqId = req.params.id;
  const request = await prisma.deletionRequest.findUnique({ where: { id: reqId } });
  if (!request) return res.status(404).json({ message: "Request not found" });

  await prisma.user.update({
    where: { id: request.userId },
    data: {
      email: null,
      phone: null,
      parentId: null,
      termsAcceptedAt: null,
    },
  });
  await prisma.deletionRequest.update({
    where: { id: reqId },
    data: { status: "completed", completedAt: new Date() },
  });
  await addAudit(req.authUser!.id, "delete_request_process", "deletion_request", reqId, { anonymizedUserId: request.userId });
  res.json({ processed: true, anonymizedUserId: request.userId });
});
