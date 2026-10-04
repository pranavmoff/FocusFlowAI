import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_SIGNUP_CONFIRM_URL, getAuthRecoveryUrl } from "@/lib/site-url";
import { validatePasswordStrength } from "@/lib/utils";
import { Brain } from "lucide-react";
import { toast } from "sonner";

type Search = { mode?: "signin" | "signup" | "forgot"; verified?: string; reset?: string };

export const Route = createFileRoute("/auth/")({
  head: () => ({ meta: [{ title: "Sign in , FocusFlow AI" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: (s.mode as Search["mode"]) ?? undefined,
    verified: typeof s.verified === "string" ? s.verified : undefined,
    reset: typeof s.reset === "string" ? s.reset : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/" });
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.reset === "success" || search.reset === "1") {
      toast.success("Password reset successfully! You can now sign in with your new password.");
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } else if (search.verified === "1") {
      toast.success("Email verified. Please sign in.");
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.verified, search.reset]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        const passwordError = validatePasswordStrength(password);
        if (passwordError) throw new Error(passwordError);
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: AUTH_SIGNUP_CONFIRM_URL,
            data: { full_name: name.trim() || normalizedEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error("An account with this email already exists. Try signing in instead.");
        }
        toast.success(
          "Account created. Check your email to verify your account before signing in.",
        );
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      } else if (mode === "forgot") {
        const redirectTo = getAuthRecoveryUrl();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo,
        });
        if (error) throw error;
        toast.success("Password reset email sent. Check your inbox for the reset link.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : (err instanceof Error && err.message) || "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">
            FocusFlow<span className="text-primary"> AI</span>
          </span>
        </Link>

        <div className="glass-strong rounded-3xl p-8">
          {mode !== "forgot" && (
            <div className="flex gap-1 rounded-full bg-muted/50 p-1 text-sm">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-full py-2 ${mode === "signin" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-full py-2 ${mode === "signup" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Create account
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <div className="mb-2">
              <h2 className="text-lg font-semibold">Reset your password</h2>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                required
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@domain.com"
              required
            />
            {mode !== "forgot" && (
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                minLength={mode === "signup" ? 8 : undefined}
              />
            )}
            {mode === "signup" && (
              <p className="-mt-2 text-xs text-muted-foreground">
                At least 8 characters, with uppercase, lowercase, a number, and a symbol.
              </p>
            )}
            {mode === "signup" && (
              <Field
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                required
                minLength={8}
              />
            )}
            <button
              disabled={loading}
              className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading
                ? "…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            {mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-primary hover:underline"
              >
                Forgot password?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to FocusFlow AI's privacy-first usage of your activity data.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
