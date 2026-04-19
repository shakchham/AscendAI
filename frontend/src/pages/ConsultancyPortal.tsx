import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/card";
import { apiGet, apiPost } from "../lib/api";

type ConsultancyProfile = {
  id: string;
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
  subscriptionPlan?: string | null;
};

type StudentUser = { id: string; email?: string | null; phone?: string | null };
type Batch = { id: string; branch: string; name: string };
type Fee = { id: string; studentId: string; amount: number; status: string; dueDate: string };

export function ConsultancyPortal() {
  const [profile, setProfile] = useState<ConsultancyProfile | null>(null);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<string>("");

  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [batchBranch, setBatchBranch] = useState("");
  const [batchName, setBatchName] = useState("");
  const [scheduleBatchId, setScheduleBatchId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [messageTo, setMessageTo] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      const [profileRes, studentsRes, batchesRes, feesRes] = await Promise.all([
        apiGet<{ consultancy: ConsultancyProfile }>("/api/consultancy/profile"),
        apiGet<{ students: StudentUser[] }>("/api/consultancy/students"),
        apiGet<{ batches: Batch[] }>("/api/consultancy/batches"),
        apiGet<{ fees: Fee[] }>("/api/consultancy/fees"),
      ]);
      setProfile(profileRes.consultancy);
      setStudents(studentsRes.students ?? []);
      setBatches(batchesRes.batches ?? []);
      setFees(feesRes.fees ?? []);
    } catch {
      toast.error("Failed to load consultancy dashboard data");
    }
  }

  async function addStudent() {
    if (!newStudentId) return;
    await apiPost("/api/consultancy/students", { id: newStudentId, email: newStudentEmail || undefined });
    setNewStudentId("");
    setNewStudentEmail("");
    toast.success("Student added");
    await loadAll();
  }

  async function addBatch() {
    await apiPost("/api/consultancy/batches", { branch: batchBranch, name: batchName });
    setBatchBranch("");
    setBatchName("");
    toast.success("Batch added");
    await loadAll();
  }

  async function scheduleMock() {
    await apiPost("/api/consultancy/mock-schedules", {
      batchId: scheduleBatchId,
      testType: "IELTS",
      scheduledAt: new Date(scheduleAt).toISOString(),
    });
    toast.success("Mock scheduled with placeholder notifications");
  }

  async function generateWeeklyReport() {
    await apiPost("/api/consultancy/reports/weekly", {});
    toast.success("Weekly report generated (PDF + email placeholder)");
  }

  async function sendFeeReminder() {
    await apiPost("/api/consultancy/fees/reminders", {});
    toast.success("Fee reminders processed");
    await loadAll();
  }

  async function sendMessage() {
    await apiPost("/api/consultancy/messages", { toUserId: messageTo, content: messageBody });
    setMessageBody("");
    toast.success("Message sent (encrypted at rest)");
  }

  async function verifyCertificate() {
    const res = await apiGet<{ valid: boolean }>(`/api/consultancy/certificates/verify/${verifyCode}`);
    setVerifyResult(res.valid ? "Valid certificate" : "Invalid certificate");
  }

  return (
    <div className="space-y-4">
      <Card title="Consultancy Profile / White Label">
        <p>Name: <b>{profile?.name ?? "-"}</b></p>
        <p>Primary Color: <b>{profile?.primaryColor ?? "#2563eb"}</b></p>
        <p>Custom Domain: <b>{profile?.customDomain ?? "not set"}</b></p>
      </Card>

      <Card title="Student Roster Management">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="rounded border p-2" placeholder="Student ID" value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)} />
          <input className="rounded border p-2" placeholder="Email (optional)" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} />
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => void addStudent()}>Add Student</button>
        </div>
        <ul className="space-y-2">
          {students.slice(0, 10).map((s) => (
            <li key={s.id} className="rounded border p-2">{s.id} - {s.email ?? s.phone ?? "No contact"}</li>
          ))}
        </ul>
      </Card>

      <Card title="Branches / Batches">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="rounded border p-2" placeholder="Branch" value={batchBranch} onChange={(e) => setBatchBranch(e.target.value)} />
          <input className="rounded border p-2" placeholder="Batch Name" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => void addBatch()}>Add Batch</button>
        </div>
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id} className="rounded border p-2">{b.branch} - {b.name}</li>
          ))}
        </ul>
      </Card>

      <Card title="Mock Test Scheduler">
        <div className="flex flex-wrap gap-2">
          <select className="rounded border p-2" value={scheduleBatchId} onChange={(e) => setScheduleBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {batches.map((b) => (
              <option value={b.id} key={b.id}>{b.branch} - {b.name}</option>
            ))}
          </select>
          <input className="rounded border p-2" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => void scheduleMock()}>Schedule</button>
        </div>
      </Card>

      <Card title="Fees + Reminders">
        <button className="mb-2 rounded bg-amber-600 px-3 py-2 text-white" onClick={() => void sendFeeReminder()}>
          Send Overdue Fee Reminders
        </button>
        <ul className="space-y-2">
          {fees.slice(0, 10).map((f) => (
            <li key={f.id} className="rounded border p-2">Student: {f.studentId} | NPR {f.amount} | {f.status}</li>
          ))}
        </ul>
      </Card>

      <Card title="Weekly Reports + Certificates">
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="rounded bg-green-700 px-3 py-2 text-white" onClick={() => void generateWeeklyReport()}>
            Generate Weekly PDF Report
          </button>
          <input className="rounded border p-2" placeholder="Verification Code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={() => void verifyCertificate()}>Verify Certificate</button>
        </div>
        {verifyResult ? <p className="text-sm">{verifyResult}</p> : null}
      </Card>

      <Card title="Internal Messaging (Encrypted)">
        <div className="space-y-2">
          <input className="w-full rounded border p-2" placeholder="To User ID" value={messageTo} onChange={(e) => setMessageTo(e.target.value)} />
          <textarea className="h-24 w-full rounded border p-2" placeholder="Message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={() => void sendMessage()}>Send Message</button>
        </div>
      </Card>
    </div>
  );
}
