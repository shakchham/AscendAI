import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Select, Textarea } from "../components/ui/fields";
import { EmptyState, LoadingBlock } from "../components/ui/state";
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
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<string>("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    logoUrl: "",
    primaryColor: "#2563eb",
    customDomain: "",
    subscriptionPlan: "consultancy_per_student_1000",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [batchBranch, setBatchBranch] = useState("");
  const [batchName, setBatchName] = useState("");
  const [scheduleBatchId, setScheduleBatchId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [messageTo, setMessageTo] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [profileRes, studentsRes, batchesRes, feesRes] = await Promise.all([
        apiGet<{ consultancy: ConsultancyProfile }>("/api/consultancy/profile"),
        apiGet<{ students: StudentUser[] }>("/api/consultancy/students"),
        apiGet<{ batches: Batch[] }>("/api/consultancy/batches"),
        apiGet<{ fees: Fee[] }>("/api/consultancy/fees"),
      ]);
      setProfileForm({
        name: profileRes.consultancy.name ?? "",
        logoUrl: profileRes.consultancy.logoUrl ?? "",
        primaryColor: profileRes.consultancy.primaryColor ?? "#2563eb",
        customDomain: profileRes.consultancy.customDomain ?? "",
        subscriptionPlan: profileRes.consultancy.subscriptionPlan ?? "consultancy_per_student_1000",
      });
      setStudents(studentsRes.students ?? []);
      setBatches(batchesRes.batches ?? []);
      setFees(feesRes.fees ?? []);
    } catch {
      toast.error("Failed to load consultancy dashboard data");
    } finally {
      setLoading(false);
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

  async function saveBranding() {
    await apiPost("/api/consultancy/profile", profileForm);
    document.documentElement.style.setProperty("--brand-primary", profileForm.primaryColor || "#2563eb");
    toast.success("Branding profile saved");
    await loadAll();
  }

  async function uploadLogo() {
    if (!logoFile) return;
    const base64Data = await fileToBase64(logoFile);
    const res = await apiPost<{ logoUrl: string }>("/api/consultancy/logo-upload", {
      fileName: logoFile.name,
      mimeType: logoFile.type,
      base64Data,
    });
    setProfileForm((v) => ({ ...v, logoUrl: res.logoUrl }));
    toast.success("Logo uploaded");
    await saveBranding();
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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const b64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Consultancy Profile / White Label">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder="Consultancy name"
            value={profileForm.name}
            onChange={(e) => setProfileForm((v) => ({ ...v, name: e.target.value }))}
          />
          <Input
            placeholder="Custom domain (optional)"
            value={profileForm.customDomain}
            onChange={(e) => setProfileForm((v) => ({ ...v, customDomain: e.target.value }))}
          />
          <Input
            placeholder="Logo URL (optional)"
            value={profileForm.logoUrl}
            onChange={(e) => setProfileForm((v) => ({ ...v, logoUrl: e.target.value }))}
          />
          <Select
            value={profileForm.subscriptionPlan}
            onChange={(e) => setProfileForm((v) => ({ ...v, subscriptionPlan: e.target.value }))}
          >
            <option value="consultancy_per_student_1000">NPR 1000 / student / month</option>
            <option value="monthly_1500">NPR 1500 / month</option>
            <option value="yearly_15000">NPR 15000 / year</option>
          </Select>
          <div className="flex items-center gap-2">
            <input
              className="h-10 w-14 rounded-lg border border-slate-300 p-1 transition hover:scale-[1.02]"
              type="color"
              value={profileForm.primaryColor || "#2563eb"}
              onChange={(e) => setProfileForm((v) => ({ ...v, primaryColor: e.target.value }))}
            />
            <Input
              className="flex-1"
              value={profileForm.primaryColor}
              onChange={(e) => setProfileForm((v) => ({ ...v, primaryColor: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input className="text-sm" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
            <Button variant="neutral" onClick={() => void uploadLogo()}>Upload Logo</Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void saveBranding()}>
            Save White Label Settings
          </Button>
        </div>
        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: profileForm.primaryColor || "#2563eb" }}>
          <p className="text-sm text-slate-600">Live Preview</p>
          <div className="mt-2 flex items-center gap-3">
            {profileForm.logoUrl ? <img src={profileForm.logoUrl} alt="Logo preview" className="h-10 w-10 rounded object-cover" /> : null}
            <div>
              <p className="font-semibold" style={{ color: profileForm.primaryColor || "#2563eb" }}>{profileForm.name || "Your Consultancy"}</p>
              <p className="text-xs text-slate-500">{profileForm.customDomain || "no custom domain"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Student Roster Management">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input className="w-56" placeholder="Student ID" value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)} />
          <Input className="w-64" placeholder="Email (optional)" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} />
          <Button onClick={() => void addStudent()}>Add Student</Button>
        </div>
        <ul className="space-y-2">
          {loading ? (
            <LoadingBlock className="h-20" />
          ) : students.length ? (
            students.slice(0, 10).map((s) => (
              <li key={s.id} className="rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50">{s.id} - {s.email ?? s.phone ?? "No contact"}</li>
            ))
          ) : (
            <EmptyState title="No students yet" description="Add one student or import via CSV." />
          )}
        </ul>
      </Card>

      <Card title="Branches / Batches">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input className="w-56" placeholder="Branch" value={batchBranch} onChange={(e) => setBatchBranch(e.target.value)} />
          <Input className="w-56" placeholder="Batch Name" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
          <Button onClick={() => void addBatch()}>Add Batch</Button>
        </div>
        <ul className="space-y-2">
          {loading ? (
            <LoadingBlock className="h-20" />
          ) : batches.length ? (
            batches.map((b) => (
              <li key={b.id} className="rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50">{b.branch} - {b.name}</li>
            ))
          ) : (
            <EmptyState title="No batches found" description="Create branch and batch to begin scheduling tests." />
          )}
        </ul>
      </Card>

      <Card title="Mock Test Scheduler">
        <div className="flex flex-wrap gap-2">
          <Select className="w-64" value={scheduleBatchId} onChange={(e) => setScheduleBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {batches.map((b) => (
              <option value={b.id} key={b.id}>{b.branch} - {b.name}</option>
            ))}
          </Select>
          <Input className="w-56" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          <Button onClick={() => void scheduleMock()}>Schedule</Button>
        </div>
      </Card>

      <Card title="Fees + Reminders">
        <Button variant="warning" className="mb-3" onClick={() => void sendFeeReminder()}>
          Send Overdue Fee Reminders
        </Button>
        <ul className="space-y-2">
          {loading ? (
            <LoadingBlock className="h-20" />
          ) : fees.length ? (
            fees.slice(0, 10).map((f) => (
              <li key={f.id} className="rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50">Student: {f.studentId} | NPR {f.amount} | {f.status}</li>
            ))
          ) : (
            <EmptyState title="No fee records yet" description="Create fee records to send reminders and track payments." />
          )}
        </ul>
      </Card>

      <Card title="Weekly Reports + Certificates">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="success" onClick={() => void generateWeeklyReport()}>
            Generate Weekly PDF Report
          </Button>
          <Input className="w-64" placeholder="Verification Code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
          <Button variant="neutral" onClick={() => void verifyCertificate()}>Verify Certificate</Button>
        </div>
        {verifyResult ? <p className="text-sm">{verifyResult}</p> : null}
      </Card>

      <Card title="Internal Messaging (Encrypted)">
        <div className="space-y-2">
          <Input placeholder="To User ID" value={messageTo} onChange={(e) => setMessageTo(e.target.value)} />
          <Textarea className="h-24" placeholder="Message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
          <Button variant="neutral" onClick={() => void sendMessage()}>Send Message</Button>
        </div>
      </Card>
    </div>
  );
}
