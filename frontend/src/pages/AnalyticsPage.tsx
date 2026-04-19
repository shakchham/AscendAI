import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { EmptyState, LoadingBlock } from "../components/ui/state";
import { apiGet } from "../lib/api";

type TeacherMetric = {
  teacherId: string;
  teacherEmail?: string | null;
  assigned: number;
  completed: number;
  completionRate: number;
};

export function AnalyticsPage() {
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ teachers: TeacherMetric[] }>("/api/consultancy/analytics/teacher-performance")
      .then((res) => setTeacherMetrics(res.teachers || []))
      .catch(() => setTeacherMetrics([]));
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const studentMockSeries = [5.5, 6.0, 6.5, 6.0, 6.8, 7.0];
  const pieSegments = [
    { label: "Completed", value: 68, color: "#16a34a" },
    { label: "Pending", value: 22, color: "#f59e0b" },
    { label: "Missed", value: 10, color: "#dc2626" },
  ];
  const pieGradient = `conic-gradient(${pieSegments
    .map((s, i) => `${s.color} ${pieSegments.slice(0, i).reduce((a, b) => a + b.value, 0)}% ${pieSegments
      .slice(0, i + 1)
      .reduce((a, b) => a + b.value, 0)}%`)
    .join(", ")})`;

  return (
    <div className="space-y-6">
      <Card title="Student Progress Trend (Visual)">
        <div className="flex h-44 items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {studentMockSeries.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className="w-full rounded-t bg-blue-500 transition-all duration-300 hover:bg-blue-600" style={{ height: `${v * 16}px` }} />
              <span className="mt-1 text-xs">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Task Distribution (Visual)">
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-40 w-40 rounded-full border border-slate-200 shadow-sm transition-transform duration-200 hover:scale-[1.02]" style={{ background: pieGradient }} />
          <div className="space-y-2">
            {pieSegments.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: s.color }} />
                {s.label}: {s.value}%
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Teacher Performance Analytics">
        {loading ? (
          <LoadingBlock className="h-20" />
        ) : teacherMetrics.length ? (
          <div className="space-y-2">
            {teacherMetrics.map((t) => (
              <div key={t.teacherId} className="rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                <p className="font-medium">{t.teacherEmail ?? t.teacherId}</p>
                <p className="text-sm text-slate-600">Assigned: {t.assigned} | Completed: {t.completed} | Completion: {t.completionRate}%</p>
                <div className="mt-1 h-2 rounded bg-slate-200">
                  <div className="h-2 rounded bg-green-600" style={{ width: `${Math.min(100, t.completionRate)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No analytics data yet" description="Assign tasks and complete activities to generate metrics." />
        )}
      </Card>
    </div>
  );
}
