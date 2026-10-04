import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validatePasswordStrength } from "@/lib/utils";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password , FocusFlow AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const passwordError = validatePasswordStrength(password);
      if (passwordError) throw new Error(passwordError);
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. Please sign in with your new password.");
      navigate({ to: "/auth", search: { mode: "signin" } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">
            FocusFlow<span className="text-primary"> AI</span>
          </span>
        </div>
        <div className="glass-strong rounded-3xl p-8">
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you haven't used before. At least 8 characters, with uppercase,
            lowercase, a number, and a symbol.
          </p>

          {hasSession === false && (
            <p className="mt-4 rounded-xl border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
              Your reset link may have expired. Request a new one from the sign in page.
            </p>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field
              label="New Password"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={8}
            />
            <Field
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={8}
            />
            <button
              disabled={loading || hasSession === false}
              className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading ? "…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: any) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder="••••••••"
        className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
