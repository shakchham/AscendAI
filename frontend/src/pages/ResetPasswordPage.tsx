import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login",
      });
      if (error) throw error;
      toast.success("Password reset email sent.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-200">Ascend AI</p>
        <h1 className="mb-1 text-3xl font-bold text-white">Reset Password</h1>
        <p className="mb-5 text-sm text-slate-300">Enter your email to receive a reset link.</p>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder:text-slate-300 focus:border-blue-400 focus:outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60" onClick={() => void sendReset()}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-200">
          Back to <Link className="text-blue-300 underline" to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
}
