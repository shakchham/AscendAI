import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Select, Textarea } from "../components/ui/fields";
import { EmptyState, LoadingBlock } from "../components/ui/state";
import { apiGet, apiPost } from "../lib/api";

type ExamType = "IELTS" | "GMAT" | "GRE" | "PTE";
type Question = { id: string; question: string; options: string[]; difficulty?: number };

export function Phase3Lab() {
  const [examType, setExamType] = useState<ExamType>("GMAT");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [catSessionId, setCatSessionId] = useState("");
  const [catQuestion, setCatQuestion] = useState<Question | null>(null);
  const [transcript, setTranscript] = useState("");
  const [speakingFeedback, setSpeakingFeedback] = useState("");
  const [loadingExam, setLoadingExam] = useState(false);

  async function loadExam() {
    setLoadingExam(true);
    const res = await apiGet<{ questions: Question[] }>(`/api/phase3/mock-tests/${examType}`);
    setQuestions(res.questions);
    setAnswers({});
    setLoadingExam(false);
  }

  async function submitExam() {
    const res = await apiPost<{ score: number; correct: number; total: number }>(`/api/phase3/mock-tests/${examType}/submit`, { answers });
    toast.success(`Submitted. Score ${res.score}% (${res.correct}/${res.total})`);
  }

  async function startCat() {
    const res = await apiPost<{ sessionId: string; question: Question }>("/api/phase3/cat/start", { examType });
    setCatSessionId(res.sessionId);
    setCatQuestion(res.question);
  }

  async function answerCat(opt: string) {
    if (!catSessionId || !catQuestion) return;
    const res = await apiPost<{ nextQuestion: Question | null; session: { score: number; completed: boolean } }>(
      `/api/phase3/cat/${catSessionId}/answer`,
      { questionId: catQuestion.id, answer: opt },
    );
    setCatQuestion(res.nextQuestion);
    if (!res.nextQuestion) toast.success(`CAT completed. Score ${res.session.score}%`);
  }

  async function evaluateSpeaking() {
    const res = await apiPost<{ feedback: string }>("/api/phase3/speaking/evaluate", { transcript });
    setSpeakingFeedback(res.feedback);
  }

  async function createSubscription(plan: "monthly_1500" | "yearly_15000") {
    await apiPost("/api/phase3/subscriptions/create", { plan });
    toast.success("Subscription created as pending (webhook placeholder)");
  }

  async function sendProctorEvent() {
    await apiPost("/api/phase3/proctor/events", { eventType: "fullscreen_exit", metadata: { source: "frontend-button" } });
    toast.success("Proctor event logged");
  }

  async function offlineSyncDemo() {
    await apiPost("/api/phase3/offline-sync/attempts", {
      attempts: [{ examType, answers, completedAt: new Date().toISOString() }],
    });
    toast.success("Offline attempts synced");
  }

  return (
    <div className="space-y-6">
      <Card title="Phase 3: Multi-Exam + CAT">
        <div className="mb-4 flex flex-wrap gap-2">
          <Select className="w-44" value={examType} onChange={(e) => setExamType(e.target.value as ExamType)}>
            <option value="IELTS">IELTS</option>
            <option value="GMAT">GMAT</option>
            <option value="GRE">GRE</option>
            <option value="PTE">PTE</option>
          </Select>
          <Button onClick={() => void loadExam()}>Load Exam</Button>
          <Button variant="success" onClick={() => void submitExam()}>Submit Exam</Button>
          <Button variant="neutral" onClick={() => void startCat()}>Start CAT</Button>
        </div>
        <div className="space-y-3">
          {loadingExam ? (
            <LoadingBlock className="h-24" />
          ) : questions.length ? (
            questions.map((q) => (
              <div key={q.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium">{q.question}</p>
                <div className="mt-2 grid gap-2">
                  {q.options.map((o) => (
                    <label className="flex items-center gap-2" key={o}>
                      <input type="radio" checked={answers[q.id] === o} onChange={() => setAnswers((v) => ({ ...v, [q.id]: o }))} />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No exam loaded yet" description="Select exam type and click Load Exam." />
          )}
        </div>
        {catQuestion ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold">CAT Question (difficulty {catQuestion.difficulty})</p>
            <p>{catQuestion.question}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catQuestion.options.map((o) => (
                <Button key={o} variant="neutral" className="px-2 py-1" onClick={() => void answerCat(o)}>{o}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="Speaking Evaluation Placeholder">
        <Textarea
          className="h-28"
          placeholder="Paste transcript or notes..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <Button className="mt-3" onClick={() => void evaluateSpeaking()}>
          Evaluate Speaking
        </Button>
        {speakingFeedback ? <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-100 p-2">{speakingFeedback}</pre> : null}
      </Card>

      <Card title="Subscriptions + Proctor + Offline Sync">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void createSubscription("monthly_1500")}>
            Subscribe NPR 1500/mo
          </Button>
          <Button variant="secondary" className="bg-indigo-800 hover:bg-indigo-700" onClick={() => void createSubscription("yearly_15000")}>
            Subscribe NPR 15000/yr
          </Button>
          <Button variant="warning" onClick={() => void sendProctorEvent()}>
            Log Proctor Event
          </Button>
          <Button variant="neutral" onClick={() => void offlineSyncDemo()}>
            Offline Sync Demo
          </Button>
        </div>
      </Card>
    </div>
  );
}
