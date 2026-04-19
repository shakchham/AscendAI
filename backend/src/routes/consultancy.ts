import { PaymentStatus, TaskStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import { parse } from "csv-parse/sync";
import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { encryptText, decryptText } from "../lib/crypto";
import { prisma } from "../lib/prisma";
import { io } from "../lib/socket";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireRole } from "../middleware/roles";
import { validateBody } from "../middleware/validate";

const profileSchema = z.object({
  name: z.string().min(2),
  logoUrl: z
    .string()
    .refine((v) => /^https?:\/\//.test(v) || /^data:image\/(png|jpeg|jpg|webp);base64,/.test(v), "Invalid logo URL")
    .optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  customDomain: z.string().optional(),
  subscriptionPlan: z.string().optional(),
});

const studentSchema = z.object({
  id: z.string().min(6),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  targetScore: z.number().min(0).max(9).optional(),
  batchId: z.string().optional(),
  parentId: z.string().optional(),
});

const csvImportSchema = z.object({
  csv: z.string().min(5),
});

const batchSchema = z.object({
  branch: z.string().min(2),
  name: z.string().min(2),
});

const taskSchema = z.object({
  counsellorId: z.string().min(6),
  studentId: z.string().min(6),
  title: z.string().min(3),
  dueAt: z.string().datetime().optional(),
});

const scheduleSchema = z.object({
  batchId: z.string().min(6),
  testType: z.string().min(3),
  scheduledAt: z.string().datetime(),
});

const feeSchema = z.object({
  studentId: z.string().min(6),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
});

const feeStatusSchema = z.object({
  status: z.enum(["pending", "paid", "failed"]),
});

const messageSchema = z.object({
  toUserId: z.string().min(6),
  content: z.string().min(1).max(5000),
});

const bookingSchema = z.object({
  studentId: z.string().min(6),
  slotAt: z.string().datetime(),
});

const logoUploadSchema = z.object({
  fileName: z.string().min(3),
  mimeType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  base64Data: z.string().min(32),
});

const ensureConsultancy = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.consultancyId) return null;
  return prisma.consultancy.findUnique({ where: { id: user.consultancyId } });
};

export const consultancyRouter = Router();

consultancyRouter.use(requireAuth, userRateLimiter);

consultancyRouter.get("/branding", async (req, res) => {
  const domain = String(req.query.domain ?? "");
  if (!domain) return res.status(400).json({ message: "domain query is required" });
  const consultancy = await prisma.consultancy.findFirst({ where: { customDomain: domain } });
  if (!consultancy) return res.status(404).json({ message: "Branding not found" });
  return res.json({
    name: consultancy.name,
    logoUrl: consultancy.logoUrl,
    cssVariables: {
      "--primary": consultancy.primaryColor ?? "#2563eb",
    },
  });
});

consultancyRouter.get(
  "/profile",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  async (req, res) => {
    const consultancy = await ensureConsultancy(req.authUser!.id);
    if (!consultancy) return res.status(404).json({ message: "Consultancy not linked" });
    return res.json({ consultancy });
  },
);

consultancyRouter.put(
  "/profile",
  requireRole("consultancy_admin", "super_admin"),
  validateBody(profileSchema),
  async (req, res) => {
    const { name, logoUrl, primaryColor, customDomain, subscriptionPlan } = req.body as z.infer<typeof profileSchema>;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const consultancy = await prisma.consultancy.update({
      where: { id: user.consultancyId },
      data: { name, logoUrl, primaryColor, customDomain, subscriptionPlan },
    });
    return res.json({ consultancy });
  },
);

consultancyRouter.post(
  "/logo-upload",
  requireRole("consultancy_admin", "super_admin"),
  validateBody(logoUploadSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });

    const { fileName, mimeType, base64Data } = req.body as z.infer<typeof logoUploadSchema>;
    const bytes = Buffer.from(base64Data, "base64");
    if (bytes.length > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File exceeds 10MB limit" });
    }

    // ClamAV placeholder hook for malware scanning
    const clamAvScanResult = "clean";
    if (clamAvScanResult !== "clean") {
      return res.status(400).json({ message: "File scan failed" });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const logoUrl = `data:${mimeType};base64,${base64Data}`;
    await prisma.consultancy.update({
      where: { id: user.consultancyId },
      data: { logoUrl },
    });

    return res.json({
      uploaded: true,
      storage: "placeholder_data_url",
      fileName: safeName,
      logoUrl,
    });
  },
);

consultancyRouter.get("/cname-instructions", requireRole("consultancy_admin", "super_admin"), (_req, res) => {
  res.json({
    provider: "DNS",
    instructions: [
      "Create a CNAME record for your custom domain.",
      "Point it to your Vercel project domain.",
      "Add the domain in Vercel dashboard and verify ownership.",
      "Update consultancy.custom_domain in Ascend AI profile.",
    ],
  });
});

consultancyRouter.post(
  "/students",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(studentSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof studentSchema>;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });

    const studentUser = await prisma.user.upsert({
      where: { id: body.id },
      update: {
        email: body.email,
        phone: body.phone,
        role: "student",
        consultancyId: user.consultancyId,
        parentId: body.parentId,
      },
      create: {
        id: body.id,
        email: body.email,
        phone: body.phone,
        role: "student",
        consultancyId: user.consultancyId,
        parentId: body.parentId,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: { targetScore: body.targetScore, batchId: body.batchId },
      create: {
        userId: studentUser.id,
        targetScore: body.targetScore,
        batchId: body.batchId,
      },
    });

    res.json({ studentUser, student });
  },
);

consultancyRouter.get("/students", requireRole("consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });

  const students = await prisma.user.findMany({
    where: { consultancyId: user.consultancyId, role: "student" },
    include: { payments: { take: 5, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  const ids = students.map((s) => s.id);
  const studentProfiles = await prisma.student.findMany({ where: { userId: { in: ids } } });
  res.json({ students, studentProfiles });
});

consultancyRouter.put(
  "/students/:id",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(studentSchema.partial()),
  async (req, res) => {
    const id = req.params.id;
    const body = req.body as Partial<z.infer<typeof studentSchema>>;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const existing = await prisma.user.findUnique({ where: { id }, select: { consultancyId: true, role: true } });
    if (!existing || existing.role !== "student" || existing.consultancyId !== user.consultancyId) {
      return res.status(403).json({ message: "Student does not belong to your consultancy" });
    }

    const studentUser = await prisma.user.update({
      where: { id },
      data: {
        email: body.email,
        phone: body.phone,
        parentId: body.parentId,
        consultancyId: user.consultancyId,
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: id },
      update: { targetScore: body.targetScore, batchId: body.batchId },
      create: { userId: id, targetScore: body.targetScore, batchId: body.batchId },
    });
    res.json({ studentUser, student });
  },
);

consultancyRouter.delete(
  "/students/:id",
  requireRole("consultancy_admin", "super_admin"),
  async (req, res) => {
    const id = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const existing = await prisma.user.findUnique({ where: { id }, select: { consultancyId: true, role: true } });
    if (!existing || existing.role !== "student" || existing.consultancyId !== user.consultancyId) {
      return res.status(403).json({ message: "Student does not belong to your consultancy" });
    }
    await prisma.student.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.json({ deleted: true });
  },
);

consultancyRouter.post(
  "/students/import-csv",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(csvImportSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const body = req.body as z.infer<typeof csvImportSchema>;
    const records = parse(body.csv, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
    let imported = 0;
    for (const row of records) {
      const id = row.id || randomUUID();
      await prisma.user.upsert({
        where: { id },
        update: {
          email: row.email || null,
          phone: row.phone || null,
          role: "student",
          consultancyId: user.consultancyId,
        },
        create: {
          id,
          email: row.email || null,
          phone: row.phone || null,
          role: "student",
          consultancyId: user.consultancyId,
        },
      });
      await prisma.student.upsert({
        where: { userId: id },
        update: { targetScore: row.targetScore ? Number(row.targetScore) : undefined, batchId: row.batchId || undefined },
        create: { userId: id, targetScore: row.targetScore ? Number(row.targetScore) : null, batchId: row.batchId || null },
      });
      imported += 1;
    }
    res.json({ imported });
  },
);

consultancyRouter.post(
  "/batches",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(batchSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const { branch, name } = req.body as z.infer<typeof batchSchema>;
    const batch = await prisma.batch.create({ data: { consultancyId: user.consultancyId, branch, name } });
    res.json({ batch });
  },
);

consultancyRouter.get("/batches", requireRole("consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const batches = await prisma.batch.findMany({ where: { consultancyId: user.consultancyId } });
  res.json({ batches });
});

consultancyRouter.post(
  "/tasks",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(taskSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const body = req.body as z.infer<typeof taskSchema>;
    const task = await prisma.counsellorTask.create({
      data: {
        consultancyId: user.consultancyId,
        counsellorId: body.counsellorId,
        studentId: body.studentId,
        title: body.title,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
      },
    });
    res.json({ task });
  },
);

consultancyRouter.patch("/tasks/:id/complete", requireRole("consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const task = await prisma.counsellorTask.update({
    where: { id: req.params.id },
    data: { status: TaskStatus.completed },
  });
  res.json({ task });
});

consultancyRouter.post(
  "/mock-schedules",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(scheduleSchema),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const body = req.body as z.infer<typeof scheduleSchema>;
    const schedule = await prisma.testSchedule.create({
      data: {
        consultancyId: user.consultancyId,
        batchId: body.batchId,
        testType: body.testType,
        scheduledAt: new Date(body.scheduledAt),
      },
    });
    res.json({
      schedule,
      notifications: {
        email: "placeholder queued",
        sms: "placeholder queued",
      },
    });
  },
);

consultancyRouter.post(
  "/reports/weekly",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const students = await prisma.user.findMany({
      where: { consultancyId: user.consultancyId, role: "student" },
      take: 5,
    });

    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.fontSize(18).text("Weekly Progress Report");
    doc.moveDown().fontSize(12).text(`Generated at: ${new Date().toISOString()}`);
    doc.moveDown().text(`Consultancy ID: ${user.consultancyId}`);
    students.forEach((s) => doc.moveDown().text(`Student: ${s.email ?? s.phone ?? s.id}`));
    doc.end();
    const pdfBuffer: Buffer = await new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

    const reports = await Promise.all(
      students.map((s) =>
        prisma.weeklyReport.create({
          data: {
            consultancyId: user.consultancyId!,
            studentId: s.id,
            pdfUrl: `data:application/pdf;base64,${pdfBuffer.toString("base64").slice(0, 100)}`,
            sentEmail: true,
          },
        }),
      ),
    );

    res.json({
      generated: reports.length,
      emailStatus: "placeholder sent",
      samplePdfBase64Head: pdfBuffer.toString("base64").slice(0, 120),
    });
  },
);

consultancyRouter.get("/analytics/teacher-performance", requireRole("consultancy_admin", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const teachers = await prisma.user.findMany({ where: { consultancyId: user.consultancyId, role: "teacher" } });
  const tasks = await prisma.counsellorTask.findMany({ where: { consultancyId: user.consultancyId } });

  const byTeacher = teachers.map((t) => {
    const mine = tasks.filter((x: { counsellorId: string; status: TaskStatus }) => x.counsellorId === t.id);
    const completed = mine.filter((x: { counsellorId: string; status: TaskStatus }) => x.status === TaskStatus.completed).length;
    const completionRate = mine.length ? Number(((completed / mine.length) * 100).toFixed(1)) : 0;
    return { teacherId: t.id, teacherEmail: t.email, assigned: mine.length, completed, completionRate, avgStudentImprovement: 0 };
  });
  res.json({ teachers: byTeacher });
});

consultancyRouter.post("/fees", requireRole("consultancy_admin", "teacher", "super_admin"), validateBody(feeSchema), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const body = req.body as z.infer<typeof feeSchema>;
  const fee = await prisma.feeRecord.create({
    data: {
      consultancyId: user.consultancyId,
      studentId: body.studentId,
      amount: body.amount,
      dueDate: new Date(body.dueDate),
    },
  });
  res.json({ fee });
});

consultancyRouter.get("/fees", requireRole("consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const fees = await prisma.feeRecord.findMany({ where: { consultancyId: user.consultancyId }, orderBy: { createdAt: "desc" } });
  res.json({ fees });
});

consultancyRouter.patch(
  "/fees/:id/status",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(feeStatusSchema),
  async (req, res) => {
    const { status } = req.body as z.infer<typeof feeStatusSchema>;
    const fee = await prisma.feeRecord.update({ where: { id: req.params.id }, data: { status } });
    res.json({ fee });
  },
);

consultancyRouter.post("/fees/reminders", requireRole("consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const overdue = await prisma.feeRecord.findMany({
    where: { consultancyId: user.consultancyId, status: PaymentStatus.pending, dueDate: { lt: new Date() } },
  });
  await prisma.feeRecord.updateMany({
    where: { id: { in: overdue.map((o: { id: string }) => o.id) } },
    data: { reminderSent: true },
  });
  res.json({ remindersSent: overdue.length, channel: "email placeholder" });
});

consultancyRouter.post(
  "/messages",
  requireRole("consultancy_admin", "teacher", "student", "super_admin"),
  validateBody(messageSchema),
  async (req, res) => {
    const { toUserId, content } = req.body as z.infer<typeof messageSchema>;
    const encrypted = encryptText(content);
    const message = await prisma.message.create({
      data: {
        fromUserId: req.authUser!.id,
        toUserId,
        content: encrypted,
      },
    });
    io?.to(toUserId).emit("message:new", {
      id: message.id,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      content,
      createdAt: message.createdAt,
    });
    res.json({ messageId: message.id, encrypted: true });
  },
);

consultancyRouter.get("/messages/:peerUserId", requireRole("consultancy_admin", "teacher", "student", "super_admin"), async (req, res) => {
  const peerUserId = req.params.peerUserId;
  const myId = req.authUser!.id;
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: myId, toUserId: peerUserId },
        { fromUserId: peerUserId, toUserId: myId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json({
    messages: messages.map((m) => ({
      ...m,
      content: decryptText(m.content),
    })),
  });
});

consultancyRouter.post(
  "/certificates/issue",
  requireRole("consultancy_admin", "teacher", "super_admin"),
  validateBody(
    z.object({
      studentId: z.string().min(6),
    }),
  ),
  async (req, res) => {
    const { studentId } = req.body as { studentId: string };
    const verificationCode = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const cert = await prisma.certificate.create({ data: { studentId, verificationCode } });
    res.json({ certificate: cert, verifyUrl: `/api/consultancy/certificates/verify/${verificationCode}` });
  },
);

consultancyRouter.get("/certificates/verify/:code", async (req, res) => {
  const cert = await prisma.certificate.findUnique({ where: { verificationCode: req.params.code } });
  if (!cert) return res.status(404).json({ valid: false });
  res.json({ valid: true, certificate: cert });
});

consultancyRouter.post(
  "/bookings",
  requireRole("consultancy_admin", "teacher", "student", "super_admin"),
  validateBody(bookingSchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof bookingSchema>;
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
    const booking = await prisma.classBooking.create({
      data: {
        consultancyId: user.consultancyId,
        studentId: body.studentId,
        slotAt: new Date(body.slotAt),
      },
    });
    res.json({ booking, calendarIntegration: "google calendar placeholder" });
  },
);

consultancyRouter.get("/bookings", requireRole("consultancy_admin", "teacher", "student", "super_admin"), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!user?.consultancyId) return res.status(404).json({ message: "Consultancy not linked" });
  const bookings = await prisma.classBooking.findMany({ where: { consultancyId: user.consultancyId }, orderBy: { slotAt: "asc" } });
  res.json({ bookings });
});

consultancyRouter.get("/parent/progress/:studentId", requireRole("student", "consultancy_admin", "teacher", "super_admin"), async (req, res) => {
  const studentId = req.params.studentId;
  const requester = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
  if (!requester) return res.status(401).json({ message: "Unauthorized" });

  if (requester.role === "student" && requester.id !== studentId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const attempts = await prisma.testAttempt.findMany({ where: { studentId }, orderBy: { completedAt: "desc" }, take: 10 });
  const essays = await prisma.essay.findMany({ where: { studentId }, orderBy: { submittedAt: "desc" }, take: 10 });
  const student = await prisma.student.findUnique({ where: { userId: studentId } });
  res.json({
    studentId,
    targetScore: student?.targetScore ?? null,
    currentScore: student?.currentScore ?? null,
    attempts,
    essays: essays.map((e) => ({ ...e, content: e.content.slice(0, 300) })),
    readOnly: true,
  });
});
