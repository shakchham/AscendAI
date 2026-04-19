import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input, Select, Textarea } from "./components/ui/fields";
import { EmptyState, LoadingBlock } from "./components/ui/state";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ConsultancyPortal } from "./pages/ConsultancyPortal";
import { LandingPage } from "./pages/LandingPage";
import { Phase3Lab } from "./pages/Phase3Lab";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignupPage } from "./pages/SignupPage";
import { apiGet, apiPost } from "./lib/api";
import { supabase } from "./lib/supabase";

type SessionUser = { id: string; email?: string };
type UserRole = "student" | "consultancy_admin" | "teacher" | "super_admin";
type DashboardData = { targetScore: number; currentScore: number; progressChart: Array<{ attempt: number; score: number }> };
type MockQuestion = { id: string; question: string; options: string[] };
type ConsultancyBrand = { name: string; logoUrl?: string | null; primaryColor?: string | null } | null;

const studentNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Mock Test", path: "/mock-test" },
  { label: "Essay AI", path: "/essay-ai" },
  { label: "Self Assessment", path: "/self-assessment" },
  { label: "Recommendations", path: "/recommendations" },
  { label: "Analytics", path: "/analytics" },
  { label: "Phase 3 Lab", path: "/phase3" },
];

const consultancyNavItems = [{ label: "Consultancy Dashboard", path: "/consultancy" }];

function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold">{title}</h1>
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-line">{body}</p>
      </div>
    </main>
  );
}

function AppShell({
  user,
  role,
  consultancyBrand,
  onLogout,
  children,
}: {
  user: SessionUser;
  role: UserRole;
  consultancyBrand: ConsultancyBrand;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const navItems = role === "student" ? studentNavItems : consultancyNavItems;
  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      {open ? <button aria-label="Close menu backdrop" className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)} /> : null}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 shadow-sm transition-transform duration-200 md:static md:w-64 md:translate-x-0 md:border-b-0`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {role !== "student" && consultancyBrand?.logoUrl ? (
                <img src={consultancyBrand.logoUrl} alt="Consultancy logo" className="h-8 w-8 rounded object-cover" />
              ) : null}
              <p className="text-lg font-bold">{role === "student" ? "Ascend AI" : consultancyBrand?.name ?? "Consultancy"}</p>
            </div>
            <p className="text-xs text-slate-500">{role === "student" ? "Student Portal" : "White-labeled Portal"}</p>
          </div>
          <button className="rounded border px-2 py-1 text-xs md:hidden" onClick={() => setOpen(false)}>Close</button>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => goTo(item.path)}
              className={`w-full rounded px-3 py-2 text-left text-sm transition ${location.pathname === item.path ? "text-white shadow-sm" : "hover:bg-slate-100"}`}
              style={location.pathname === item.path ? { backgroundColor: "var(--brand-primary, #2563eb)" } : undefined}
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => goTo("/terms")} className="w-full rounded px-3 py-2 text-left text-sm transition hover:bg-slate-100">Terms</button>
          <button onClick={() => goTo("/privacy")} className="w-full rounded px-3 py-2 text-left text-sm transition hover:bg-slate-100">Privacy</button>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button className="rounded border px-3 py-1.5 text-sm md:hidden" onClick={() => setOpen((v) => !v)}>Menu</button>
          <p className="text-sm text-slate-600">{user.email ?? user.id}</p>
          <Button variant="neutral" className="text-sm" onClick={() => void onLogout()}>Logout</Button>
        </header>
        <main className="space-y-6 p-5">{children}</main>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<UserRole>("student");
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");
  const [consultancyBrand, setConsultancyBrand] = useState<ConsultancyBrand>(null);
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
        } else {
          await loadConsultancyBranding();
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

  async function loadConsultancyBranding() {
    try {
      const res = await apiGet<{ consultancy: { name: string; logoUrl?: string | null; primaryColor?: string | null } }>("/api/consultancy/profile");
      setConsultancyBrand(res.consultancy);
      if (res.consultancy.primaryColor) {
        document.documentElement.style.setProperty("--brand-primary", res.consultancy.primaryColor);
      }
    } catch {
      // non-blocking for student users
    }
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
    return <LoadingBlock className="mx-auto mt-12 h-24 w-11/12" />;
  }

  if (!user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
        <div className="absolute -left-20 top-12 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
        <form className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl" onSubmit={loginWithOtp}>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Ascend AI</p>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-slate-300">Login with OTP or continue with Google.</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/20 bg-white/5 p-1">
            <button type="button" className={`rounded px-2 py-2 text-sm ${otpTarget === "email" ? "bg-blue-600 text-white" : "text-slate-200"}`} onClick={() => setOtpTarget("email")}>Email OTP</button>
            <button type="button" className={`rounded px-2 py-2 text-sm ${otpTarget === "phone" ? "bg-blue-600 text-white" : "text-slate-200"}`} onClick={() => setOtpTarget("phone")}>Phone OTP</button>
          </div>
          {otpTarget === "email" ? (
            <input className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-slate-300 focus:border-blue-400 focus:outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          ) : (
            <input className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-slate-300 focus:border-blue-400 focus:outline-none" placeholder="Phone (+977...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            I accept Terms, Privacy, Refund and Cookie Policy. Age 16+.
          </label>
          <Select className="w-full border-white/20 bg-white/10 p-3 text-white focus:ring-white/10" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as UserRole)}>
            <option value="student">Student</option>
            <option value="consultancy_admin">Consultancy Admin</option>
            <option value="teacher">Teacher</option>
          </Select>
          <button className="w-full rounded-lg bg-blue-600 px-3 py-2.5 font-medium text-white transition hover:bg-blue-500" type="submit">Send OTP</button>
          <button className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 font-medium text-white transition hover:bg-white/20" type="button" onClick={loginWithGoogle}>
            Continue with Google
          </button>
          <div className="flex justify-between text-sm text-slate-200">
            <button type="button" className="text-blue-300 underline" onClick={() => navigate("/signup")}>Create account</button>
            <button type="button" className="text-blue-300 underline" onClick={() => navigate("/reset-password")}>Reset password</button>
          </div>
        </form>
      </main>
    );
  }

  if (!termsAccepted) {
    return (
      <main className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold">Accept Legal Policies</h1>
        <p className="mb-4 text-sm text-slate-600">
          You must accept legal documents before first login. This platform follows Nepal ETA compliance and supports users age 16+.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="neutral" onClick={() => navigate("/terms")}>Read Terms</Button>
          <Button variant="neutral" onClick={() => navigate("/privacy")}>Read Privacy</Button>
          <Button variant="neutral" onClick={() => navigate("/refund")}>Read Refund</Button>
          <Button variant="neutral" onClick={() => navigate("/cookie-policy")}>Read Cookie Policy</Button>
        </div>
        <Button onClick={() => void acceptTermsAndContinue()}>
          Accept and Continue
        </Button>
      </main>
    );
  }

  return (
    <AppShell user={user} role={role} consultancyBrand={consultancyBrand} onLogout={logout}>
      <Routes>
        <Route path="/consultancy" element={<ConsultancyPortal />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/phase3" element={<Phase3Lab />} />
        <Route
          path="/dashboard"
          element={
            <div className="space-y-6">
              <Card title="Progress Overview">
                {!dashboard ? (
                  <LoadingBlock className="h-16" />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <p>Current IELTS Score: <b>{dashboard.currentScore}</b></p>
                    <p>Target Score: <b>{dashboard.targetScore}</b></p>
                    <div className="md:col-span-2">
                      <p className="mb-2 text-sm text-slate-600">Mock Progress (latest attempts)</p>
                      {dashboard.progressChart.length ? (
                        <div className="flex items-end gap-2">
                          {dashboard.progressChart.map((p) => (
                            <div key={p.attempt} className="flex-1">
                              <div className="rounded-t bg-blue-400 transition-all hover:bg-blue-500" style={{ height: `${p.score * 12}px` }} />
                              <p className="text-center text-xs">{p.score}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No progress data yet" description="Complete a mock test to view your chart." />
                      )}
                    </div>
                  </div>
                )}
              </Card>
              <Card title="Set Target Score">
                <div className="flex flex-wrap gap-2">
                  <Input className="w-40" value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
                  <Button onClick={() => void submitTarget()}>
                    Save
                  </Button>
                </div>
              </Card>
            </div>
          }
        />
        <Route
          path="/mock-test"
          element={
            <Card title={`IELTS MCQ Mock Test (Timer: ${timeLabel})`} className="space-y-4">
              <div className="space-y-4">
                {questions.length ? (
                  questions.map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
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
                  ))
                ) : (
                  <EmptyState title="No questions loaded" description="Reload or check your connectivity and try again." />
                )}
                <Button variant="success" onClick={() => void submitTest()}>
                  Submit and Auto-Score
                </Button>
              </div>
            </Card>
          }
        />
        <Route
          path="/essay-ai"
          element={
            <Card title="AI Essay Analysis (Groq)">
              <Textarea
                className="h-48"
                placeholder="Write your IELTS essay..."
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Button onClick={() => void analyzeEssay()}>
                  Analyze Essay
                </Button>
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
              <Textarea
                className="h-48"
                placeholder="Write your own assessment using the rubric..."
                value={selfAssessment}
                onChange={(e) => setSelfAssessment(e.target.value)}
              />
              <Button variant="neutral" className="mt-3" onClick={() => toast.success("Self-assessment saved locally")}>
                Save
              </Button>
            </Card>
          }
        />
        <Route
          path="/recommendations"
          element={
            <Card title="University Recommendations (Hardcoded)">
              {recommendations.length ? (
                <ul className="space-y-2">
                  {recommendations.map((u) => (
                    <li key={u.name} className="rounded border p-2">
                      <b>{u.name}</b> - {u.country}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No matches yet" description="Update your score or complete tests to get recommendations." />
              )}
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
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<App />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard/*" element={<App />} />
      <Route path="/mock-test" element={<App />} />
      <Route path="/essay-ai" element={<App />} />
      <Route path="/self-assessment" element={<App />} />
      <Route path="/recommendations" element={<App />} />
      <Route path="/analytics" element={<App />} />
      <Route path="/consultancy" element={<App />} />
      <Route path="/phase3" element={<App />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
