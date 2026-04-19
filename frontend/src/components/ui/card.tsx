import { cn } from "../../lib/utils";

export function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md", className)}>
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      {children}
    </div>
  );
}
