CREATE TYPE "SubscriptionPlan" AS ENUM ('monthly_1500', 'yearly_15000', 'consultancy_per_student_1000');
CREATE TYPE "DeletionStatus" AS ENUM ('pending', 'completed', 'rejected');
CREATE TYPE "WebhookProvider" AS ENUM ('esewa', 'khalti', 'stripe');

CREATE TABLE "subscriptions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payment_webhook_events" (
  "id" TEXT PRIMARY KEY,
  "provider" "WebhookProvider" NOT NULL,
  "payload" JSONB NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "question_banks" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "exam_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "api_keys" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3)
);

CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "deletion_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "status" "DeletionStatus" NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "process_by" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3)
);

CREATE TABLE "adaptive_attempts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "exam_type" TEXT NOT NULL,
  "current_difficulty" INTEGER NOT NULL DEFAULT 2,
  "question_index" INTEGER NOT NULL DEFAULT 0,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "state" JSONB,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "speaking_attempts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "transcript" TEXT,
  "ai_feedback" TEXT NOT NULL,
  "audio_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "proctor_events" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "attempt_id" TEXT,
  "event_type" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adaptive_attempts" ADD CONSTRAINT "adaptive_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "speaking_attempts" ADD CONSTRAINT "speaking_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proctor_events" ADD CONSTRAINT "proctor_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
