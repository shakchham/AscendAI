import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  ESEWA_MERCHANT_ID: z.string().min(1),
  KHALTI_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  SENDGRID_API_KEY: z.string().min(1),
  SPARROW_SMS_TOKEN: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
