CREATE TYPE "TaskStatus" AS ENUM ('pending', 'completed');

CREATE TABLE "counsellor_tasks" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "counsellor_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'pending',
  "due_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "test_schedules" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "test_type" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "weekly_reports" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "pdf_url" TEXT,
  "sent_email" BOOLEAN NOT NULL DEFAULT false,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "fee_records" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "class_bookings" (
  "id" TEXT PRIMARY KEY,
  "consultancy_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "slot_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'booked',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
