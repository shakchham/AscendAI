import { Router } from "express";
import { z } from "zod";
import { groq } from "../lib/groq";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { userRateLimiter } from "../middleware/rateLimiters";
import { requireTermsAccepted } from "../middleware/requireTerms";
import { requireRole } from "../middleware/roles";
import { validateBody } from "../middleware/validate";

const essaySchema = z.object({
  content: z.string().min(100).max(5000),
});

export const essayRouter = Router();
essayRouter.use(requireAuth, userRateLimiter, requireTermsAccepted, requireRole("student"));

essayRouter.post("/analyze", validateBody(essaySchema), async (req, res) => {
  const { content } = req.body as { content: string };
  let aiFeedback = "AI feedback unavailable right now. Please try again shortly.";

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an IELTS writing coach. Return concise feedback with sections: Grammar, Structure, Vocabulary, and Actionable Next Steps.",
        },
        { role: "user", content },
      ],
    });
    aiFeedback = completion.choices[0]?.message?.content ?? aiFeedback;
  } catch (_error) {
    aiFeedback =
      "Unable to reach Groq right now. Grammar: review sentence boundaries. Structure: include clear intro-body-conclusion. Vocabulary: avoid repetition.";
  }

  const essay = await prisma.essay.create({
    data: {
      studentId: req.authUser!.id,
      content,
      aiFeedback,
    },
  });

  res.json({
    essayId: essay.id,
    feedback: aiFeedback,
    disclaimer: "Not legal advice",
  });
});
