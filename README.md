# Ascend AI (Phase 1 MVP)

Ascend AI is a multi-tenant test prep and consultancy platform. This delivery includes **Phase 1 (Student MVP)**.

## Tech Stack

- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + Prisma + PostgreSQL + Redis
- Auth: Supabase Auth (email OTP, phone OTP, Google OAuth)
- AI: Groq (Llama 3 via `groq-sdk`)
- Payments: Dummy Esewa placeholder for Phase 1

## Project Structure

- `frontend` - web app (Vite)
- `backend` - API server (Express + Prisma)
- `backend/postman/ascend-ai-phase1.postman_collection.json` - Postman collection

## Environment Variables

Use placeholders and never hardcode secrets.

- Backend template: `backend/.env.example`
- Frontend template: `frontend/.env.example`

## Setup

1. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure environment files:

```bash
cd backend
copy .env.example .env
cd ../frontend
copy .env.example .env
```

3. Configure PostgreSQL and run migration:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

4. Run backend:

```bash
cd backend
npm run dev
```

5. Run frontend:

```bash
cd frontend
npm run dev
```

## Phase 1 Features Implemented

- Student auth integration with Supabase token validation
- Role sync endpoint (`student`, `consultancy_admin`, `teacher`, `super_admin`)
- Legal acceptance gate before student features
- IELTS MCQ mock test with timer and auto-scoring
- Free tier control: 1 mock test per month, then NPR 250 dummy Esewa pay-per-use
- Student dashboard with progress chart + target score update
- Manual self-assessment UI (writing/speaking rubric notes)
- Essay analysis endpoint using Groq with fallback + disclaimer "Not legal advice"
- University recommendation endpoint (hardcoded 10 universities by score range)
- Legal pages:
  - `/terms`
  - `/privacy`
  - `/refund`
  - `/cookie-policy`
- Security baseline:
  - Helmet
  - CORS
  - Rate limit (100 req/min per IP and per user)
  - Zod validation + sanitization
  - Prisma parameterized queries (SQL injection prevention)

## API Collection

Import:

- `backend/postman/ascend-ai-phase1.postman_collection.json`

Set:

- `baseUrl` = `http://localhost:4000`
- `token` = Supabase access token

## Super Admin Credentials (Provisioning)

Phase 1 does not hardcode admin credentials. To create a super admin safely:

1. Create a Supabase user (email/password or OTP).
2. Upsert that user via `/api/auth/sync`.
3. Update role in DB:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your_admin_email@example.com';
```

## Deploy Targets (for later phases)

- Frontend: Vercel
- Backend: Render
- Database/Auth/Storage: Supabase
