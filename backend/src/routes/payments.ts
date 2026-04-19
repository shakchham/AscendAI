import { PaymentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireTermsAccepted } from "../middleware/requireTerms";
import { validateBody } from "../middleware/validate";

const initSchema = z.object({
  amount: z.number().min(1),
  paymentMethod: z.literal("esewa_placeholder"),
});

const verifySchema = z.object({
  paymentId: z.string().min(1),
  success: z.boolean(),
});

export const paymentRouter = Router();
paymentRouter.use(requireAuth, userRateLimiter, requireTermsAccepted);

paymentRouter.post("/initiate", validateBody(initSchema), async (req, res) => {
  const { amount, paymentMethod } = req.body as { amount: number; paymentMethod: "esewa_placeholder" };
  const payment = await prisma.payment.create({
    data: {
      userId: req.authUser!.id,
      amount,
      status: PaymentStatus.pending,
      paymentMethod,
      transactionId: `DUMMY-ESEWA-${Date.now()}`,
    },
  });

  res.json({
    paymentId: payment.id,
    transactionId: payment.transactionId,
    status: payment.status,
    redirectUrl: "https://example.com/esewa-placeholder",
  });
});

paymentRouter.post("/verify", validateBody(verifySchema), async (req, res) => {
  const { paymentId, success } = req.body as { paymentId: string; success: boolean };
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: success ? PaymentStatus.paid : PaymentStatus.failed },
  });
  res.json({ payment });
});
