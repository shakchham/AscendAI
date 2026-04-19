import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
      <div className="absolute right-0 top-36 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
      <section className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-blue-200">
              Ascend AI - Trial Ready Preview
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-5xl">
              Modern Test Prep Platform For Students And Consultancies
            </h1>
            <p className="mb-8 max-w-xl text-slate-300">
              AI-powered mock tests, adaptive assessments, white-labeled consultancy dashboards, reports, and analytics in one unified system.
            </p>
            <div className="mb-8 flex flex-wrap gap-3">
              <Link className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500" to="/login">Login</Link>
              <Link className="rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 font-medium text-white transition hover:bg-white/20" to="/signup">Create Account</Link>
              <Link className="rounded-lg border border-white/25 bg-white/10 px-5 py-2.5 font-medium text-white transition hover:bg-white/20" to="/reset-password">Reset Password</Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="rounded-full border border-white/20 px-3 py-1">IELTS, GMAT, GRE, PTE</span>
              <span className="rounded-full border border-white/20 px-3 py-1">Consultancy White Label</span>
              <span className="rounded-full border border-white/20 px-3 py-1">Analytics + Reports</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-xs text-slate-300">Active Students</p>
                <p className="text-2xl font-bold text-white">1,284</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-xs text-slate-300">Avg Score Lift</p>
                <p className="text-2xl font-bold text-white">+18%</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="mb-2 text-sm font-semibold text-white">Platform Highlights</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Adaptive CAT exam logic</li>
                <li>AI essay + speaking feedback</li>
                <li>Roster, tasks, fee reminders, certificates</li>
                <li>PWA offline test sync baseline</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
