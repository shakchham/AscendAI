import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "neutral" | "success" | "warning";

const variantMap: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.99]",
  secondary: "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.99]",
  neutral: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.99]",
  success: "bg-green-600 text-white hover:bg-green-500 active:scale-[0.99]",
  warning: "bg-amber-600 text-white hover:bg-amber-500 active:scale-[0.99]",
};

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variantMap[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
