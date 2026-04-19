CREATE TYPE "UserRole" AS ENUM ('student', 'consultancy_admin', 'teacher', 'super_admin');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE,
  "phone" TEXT UNIQUE,
  "role" "UserRole" NOT NULL DEFAULT 'student',
  "consultancy_id" TEXT,
  "parent_id" TEXT,
  "terms_accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "consultancies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "logo_url" TEXT,
  "primary_color" TEXT,
  "custom_domain" TEXT,
  "subscription_plan" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "students" (
  "user_id" TEXT PRIMARY KEY,
  "target_score" DOUBLE PRECISION,
  "current_score" DOUBLE PRECISION DEFAULT 0,
  "batch_id" TEXT
);

CREATE TABLE "batches" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "name" TEXT NOT NULL
);

CREATE TABLE "mock_tests" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "time_limit" INTEGER NOT NULL
);

CREATE TABLE "test_attempts" (
  "id" TEXT PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "test_id" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "answers" JSONB NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "essays" (
  "id" TEXT PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "ai_feedback" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "payment_method" TEXT NOT NULL,
  "transaction_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "messages" (
  "id" TEXT PRIMARY KEY,
  "from_user_id" TEXT NOT NULL,
  "to_user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "certificates" (
  "id" TEXT PRIMARY KEY,
  "student_id" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verification_code" TEXT NOT NULL UNIQUE
);

ALTER TABLE "essays"
ADD CONSTRAINT "essays_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
