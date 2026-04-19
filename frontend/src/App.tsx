import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "./components/ui/card";
import { ConsultancyPortal } from "./pages/ConsultancyPortal";
import { apiGet, apiPost } from "./lib/api";
import { supabase } from "./lib/supabase";

type SessionUser = { id: string; email?: string };
type UserRole = "student" | "consultancy_admin" | "teacher" | "super_admin";
type DashboardData = { targetScore: number; currentScore: number; progressChart: Array<{ attempt: number; score: number }> };
type MockQuestion = { id: string; question: string; options: string[] };

const studentNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Mock Test", path: "/mock-test" },
  { label: "Essay AI", path: "/essay-ai" },
  { label: "Self Assessment", path: "/self-assessment" },
  { label: "Recommendations", path: "/recommendations" },
];

const consultancyNavItems = [{ label: "Consultancy Dashboard", path: "/consultancy" }];

function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <p className="rounded-xl border border-slate-200 bg-white p-4 whitespace-pre-line">{body}</p>
    </main>
  );
}

function AppShell({
  user,
  role,
  onLogout,
  children,
}: {
  user: SessionUser;
  role: UserRole;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const navItems = role === "student" ? studentNavItems : consultancyNavItems;

  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? "block" : "hidden"} w-full border-b bg-white p-4 md:block md:w-64 md:border-b-0 md:border-r`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">Ascend AI</p>
            <p className="text-xs text-slate-500">Student Portal</p>
          </div>
          <button className="md:hidden" onClick={() => setOpen(false)}>Close</button>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full rounded px-3 py-2 text-left ${location.pathname === item.path ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"}`}
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => navigate("/terms")} className="w-full rounded px-3 py-2 text-left hover:bg-slate-100">Terms</button>
          <button onClick={() => navigate("/privacy")} className="w-full rounded px-3 py-2 text-left hover:bg-slate-100">Privacy</button>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)}>Menu</button>
          <p className="text-sm text-slate-600">{user.email ?? user.id}</p>
          <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => void onLogout()}>Logout</button>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole>("student");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpTarget, setOtpTarget] = useState<"email" | "phone">("email");

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [targetScore, setTargetScore] = useState("7");

  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [essay, setEssay] = useState("");
  const [essayFeedback, setEssayFeedback] = useState("");
  const [recommendations, setRecommendations] = useState<Array<{ name: string; country: string }>>([]);
  const [selfAssessment, setSelfAssessment] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? undefined });
        await initializeUser();
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!questions.length) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [questions.length]);

  async function initializeUser() {
    try {
      await apiPost("/api/auth/sync", { role: selectedRole, termsAccepted });
      const me = await apiGet<{ user: { role?: UserRole; termsAcceptedAt?: string | null } | null }>("/api/auth/me");
      const accepted = Boolean(me.user?.termsAcceptedAt);
      if (me.user?.role) setRole(me.user.role);
      if (accepted) setTermsAccepted(true);
      if (accepted || termsAccepted) {
        if ((me.user?.role ?? role) === "student") {
          await Promise.all([loadDashboard(), loadMockTest(), loadRecommendations()]);
        }
      }
    } catch {
      // intentionally silent to avoid noisy auth callback errors
    }
  }

  async function loadDashboard() {
    const res = await apiGet<DashboardData>("/api/student/dashboard");
    setDashboard(res);
    setTargetScore(String(res.targetScore));
  }

  async function loadMockTest() {
    const res = await apiGet<{ questions: MockQuestion[]; timeLimit: number }>("/api/mock-tests/ielts");
    setQuestions(res.questions);
    setTimeLeft(res.timeLimit);
  }

  async function loadRecommendations() {
    const res = await apiGet<{ universities: Array<{ name: string; country: string }> }>("/api/student/recommendations");
    setRecommendations(res.universities);
  }

  const timeLabel = useMemo(() => `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`, [timeLeft]);

  async function loginWithOtp(e: FormEvent) {
    e.preventDefault();
    const payload =
      otpTarget === "email" ? { email, options: { shouldCreateUser: true } } : { phone, options: { shouldCreateUser: true } };
    const { error } = await supabase.auth.signInWithOtp(payload);
    if (error) toast.error(error.message);
    else toast.success("OTP sent. Verify from Supabase magic link/OTP flow.");
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) toast.error(error.message);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setTermsAccepted(false);
    navigate("/login");
  }

  async function submitTarget() {
    await apiPost("/api/student/target", { targetScore: Number(targetScore) });
    await loadDashboard();
    toast.success("Target updated");
  }

  async function submitTest() {
    try {
      const res = await apiPost<{ score: number }>("/api/mock-tests/ielts/submit", { answers });
      toast.success(`Test submitted. Score: ${res.score}`);
      await Promise.all([loadDashboard(), loadRecommendations()]);
    } catch {
      const init = await apiPost<{ paymentId: string }>("/api/payments/initiate", {
        amount: 250,
        paymentMethod: "esewa_placeholder",
      });
      await apiPost("/api/payments/verify", { paymentId: init.paymentId, success: true });
      toast.success("Dummy Esewa payment completed. Please submit again.");
    }
  }

  async function analyzeEssay() {
    const res = await apiPost<{ feedback: string; disclaimer: string }>("/api/essays/analyze", { content: essay });
    setEssayFeedback(`${res.feedback}\n\nDisclaimer: ${res.disclaimer}`);
  }

  async function acceptTermsAndContinue() {
    await apiPost("/api/legal/accept", {});
    setTermsAccepted(true);
    await initializeUser();
    navigate("/dashboard");
  }

  if (loading) {
    return <div className="mx-auto mt-12 h-24 w-11/12 animate-pulse rounded-xl bg-slate-200" />;
  }

  if (!user) {
    return (
      <main className="mx-auto mt-8 max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="mb-4 text-2xl font-bold">Ascend AI Login</h1>
        <form className="space-y-3" onSubmit={loginWithOtp}>
          <div className="flex gap-2">
            <button type="button" className="rounded border px-2 py-1" onClick={() => setOtpTarget("email")}>Email OTP</button>
            <button type="button" className="rounded border px-2 py-1" onClick={() => setOtpTarget("phone")}>Phone OTP</button>
          </div>
          {otpTarget === "email" ? (
            <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          ) : (
            <input className="w-full rounded border p-2" placeholder="Phone (+977...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            I accept Terms, Privacy, Refund and Cookie Policy. Age 16+.
          </label>
          <select className="w-full rounded border p-2" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as UserRole)}>
            <option value="student">Student</option>
            <option value="consultancy_admin">Consultancy Admin</option>
            <option value="teacher">Teacher</option>
          </select>
          <button className="w-full rounded bg-blue-600 px-3 py-2 text-white" type="submit">Send OTP</button>
          <button className="w-full rounded bg-slate-900 px-3 py-2 text-white" type="button" onClick={loginWithGoogle}>
            Continue with Google
          </button>
        </form>
      </main>
    );
  }

  if (!termsAccepted) {
    return (
      <main className="mx-auto mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="mb-3 text-2xl font-bold">Accept Legal Policies</h1>
        <p className="mb-4 text-sm text-slate-600">
          You must accept legal documents before first login. This platform follows Nepal ETA compliance and supports users age 16+.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2" onClick={() => navigate("/terms")}>Read Terms</button>
          <button className="rounded border px-3 py-2" onClick={() => navigate("/privacy")}>Read Privacy</button>
          <button className="rounded border px-3 py-2" onClick={() => navigate("/refund")}>Read Refund</button>
          <button className="rounded border px-3 py-2" onClick={() => navigate("/cookie-policy")}>Read Cookie Policy</button>
        </div>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => void acceptTermsAndContinue()}>
          Accept and Continue
        </button>
      </main>
    );
  }

  return (
    <AppShell user={user} role={role} onLogout={logout}>
      <Routes>
        <Route path="/consultancy" element={<ConsultancyPortal />} />
        <Route
          path="/dashboard"
          element={
            <div className="space-y-4">
              <Card title="Progress Overview">
                {!dashboard ? (
                  <div className="h-16 animate-pulse rounded bg-slate-200" />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <p>Current IELTS Score: <b>{dashboard.currentScore}</b></p>
                    <p>Target Score: <b>{dashboard.targetScore}</b></p>
                    <div className="md:col-span-2">
                      <p className="mb-2 text-sm text-slate-600">Mock Progress (latest attempts)</p>
                      <div className="flex items-end gap-2">
                        {dashboard.progressChart.map((p) => (
                          <div key={p.attempt} className="flex-1">
                            <div className="rounded-t bg-blue-400" style={{ height: `${p.score * 12}px` }} />
                            <p className="text-center text-xs">{p.score}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
              <Card title="Set Target Score">
                <div className="flex gap-2">
                  <input className="rounded border p-2" value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
                  <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => void submitTarget()}>
                    Save
                  </button>
                </div>
              </Card>
            </div>
          }
        />
        <Route
          path="/mock-test"
          element={
            <Card title={`IELTS MCQ Mock Test (Timer: ${timeLabel})`}>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded border p-3">
                    <p className="font-medium">{q.question}</p>
                    <div className="mt-2 grid gap-2">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((v) => ({ ...v, [q.id]: opt }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="rounded bg-green-600 px-4 py-2 text-white" onClick={() => void submitTest()}>
                  Submit and Auto-Score
                </button>
              </div>
            </Card>
          }
        />
        <Route
          path="/essay-ai"
          element={
            <Card title="AI Essay Analysis (Groq)">
              <textarea
                className="h-48 w-full rounded border p-3"
                placeholder="Write your IELTS essay..."
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => void analyzeEssay()}>
                  Analyze Essay
                </button>
              </div>
              <p className="mt-2 text-xs text-red-600">Disclaimer: Not legal advice</p>
              {essayFeedback ? <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-100 p-3 text-sm">{essayFeedback}</pre> : null}
            </Card>
          }
        />
        <Route
          path="/self-assessment"
          element={
            <Card title="Manual Self-Assessment (Writing / Speaking)">
              <p className="mb-2 text-sm text-slate-600">Rubric checklist: Task response, coherence, grammar, vocabulary, fluency.</p>
              <textarea
                className="h-48 w-full rounded border p-3"
                placeholder="Write your own assessment using the rubric..."
                value={selfAssessment}
                onChange={(e) => setSelfAssessment(e.target.value)}
              />
              <button className="mt-2 rounded bg-slate-900 px-4 py-2 text-white" onClick={() => toast.success("Self-assessment saved locally")}>
                Save
              </button>
            </Card>
          }
        />
        <Route
          path="/recommendations"
          element={
            <Card title="University Recommendations (Hardcoded)">
              <ul className="space-y-2">
                {recommendations.map((u) => (
                  <li key={u.name} className="rounded border p-2">
                    <b>{u.name}</b> - {u.country}
                  </li>
                ))}
              </ul>
            </Card>
          }
        />
        <Route path="*" element={<Navigate to={role === "student" ? "/dashboard" : "/consultancy"} replace />} />
      </Routes>
    </AppShell>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<App />} />
      <Route path="/dashboard/*" element={<App />} />
      <Route path="/mock-test" element={<App />} />
      <Route path="/essay-ai" element={<App />} />
      <Route path="/self-assessment" element={<App />} />
      <Route path="/recommendations" element={<App />} />
      <Route path="/consultancy" element={<App />} />
      <Route
        path="/terms"
        element={
          <LegalPage
            title="Terms & Conditions"
            body={
              "By using Ascend AI, you agree to lawful use under Nepal Electronic Transactions Act (ETA).\nUsers must be at least 16 years old.\nMock results and AI outputs are educational only.\nNo warranty is provided for admissions outcomes."
            }
          />
        }
      />
      <Route
        path="/privacy"
        element={
          <LegalPage
            title="Privacy Policy"
            body={
              "We collect profile, assessment, and usage data to provide services.\nData is processed with consent and protected with access control.\nWe do not sell personal data.\nUsers may request account deletion as per applicable law."
            }
          />
        }
      />
      <Route
        path="/refund"
        element={
          <LegalPage
            title="Refund Policy"
            body={
              "Digital service payments are generally non-refundable after usage.\nDuplicate or failed charges may be refunded after review.\nContact support with transaction ID for dispute handling."
            }
          />
        }
      />
      <Route
        path="/cookie-policy"
        element={
          <LegalPage
            title="Cookie Policy"
            body={
              "Cookies are used for session security and analytics.\nYou can control cookies through browser settings.\nDisabling cookies may impact login and dashboard features."
            }
          />
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
