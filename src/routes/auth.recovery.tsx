import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { validatePasswordStrength } from "@/lib/utils";
import { toast } from "sonner";
import { Brain, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/recovery")({
  head: () => ({ meta: [{ title: "Reset your password , FocusFlow AI" }] }),
  component: AuthRecoveryPage,
});

function AuthRecoveryPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function evaluateRecoverySession() {
      try {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        const rawHash = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(rawHash);

        // 1. Check for explicit error parameters passed by Supabase for expired/invalid links
        const errorDesc =
          url.searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          url.searchParams.get("error") ||
          hashParams.get("error");

        if (errorDesc) {
          if (!mounted) return;
          const decoded = decodeURIComponent(errorDesc).replace(/\+/g, " ");
          setErrorMessage(
            decoded.includes("expired") || decoded.includes("invalid")
              ? "This reset link is invalid or has expired. Please request a new reset link."
              : decoded,
          );
          setHasSession(false);
          setCheckingSession(false);
          return;
        }

        // 2. PKCE flow (`code` parameter)
        const code = url.searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          if (data.session && mounted) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setHasSession(true);
            setCheckingSession(false);
            return;
          }
        }

        // 3. Implicit flow (`#access_token` parameter)
        const accessToken = hashParams.get("access_token");
        if (accessToken) {
          const refreshToken = hashParams.get("refresh_token") || "";
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (data.session && mounted) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setHasSession(true);
            setCheckingSession(false);
            return;
          }
        }

        // 4. Custom OTP flow (`token_hash` parameter)
        const tokenHash = url.searchParams.get("token_hash");
        if (tokenHash) {
          const type = (url.searchParams.get("type") as "recovery" | "signup") || "recovery";
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          if (data.session && mounted) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setHasSession(true);
            setCheckingSession(false);
            return;
          }
        }

        // 5. Active recovery session check
        const { data } = await supabase.auth.getSession();
        if (data?.session && mounted) {
          setHasSession(true);
          setCheckingSession(false);
          return;
        }

        if (mounted) {
          setHasSession(false);
          setCheckingSession(false);
        }
      } catch (err: unknown) {
        console.error("Recovery session error:", err);
        if (mounted) {
          setErrorMessage(
            err instanceof Error && err.message
              ? err.message
              : "This reset link is invalid or has expired. Please request a new reset link.",
          );
          setHasSession(false);
          setCheckingSession(false);
        }
      }
    }

    evaluateRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && mounted) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Validation logic
  const passwordError = password ? validatePasswordStrength(password) : null;
  const matchError =
    confirmPassword && password !== confirmPassword ? "Passwords do not match." : null;
  const isFormValid =
    password.length > 0 && confirmPassword.length > 0 && !passwordError && !matchError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    try {
      const pErr = validatePasswordStrength(password);
      if (pErr) throw new Error(pErr);
      if (password !== confirmPassword) throw new Error("Passwords do not match.");

      // Confirm session is still active
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error(
          "Your password recovery session has expired. Please request a new reset link.",
        );
      }

      // Update password in Supabase Auth
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Clear the recovery session after successful update
      await supabase.auth.signOut();

      // Redirect to Sign In page with reset=success query parameter
      navigate({
        to: "/auth",
        search: { mode: "signin", reset: "success" },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password. Please try again.";
      toast.error(msg);
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
          {checkingSession ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Verifying password reset link…</p>
            </div>
          ) : hasSession === false ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold">Link invalid or expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMessage ||
                  "This reset link is missing or incomplete. It may have already been used, or the address may have been copied incorrectly."}
              </p>
              <Link
                to="/auth"
                search={{ mode: "forgot" }}
                className="mt-6 block w-full rounded-full bg-gradient-primary py-3 text-center font-medium text-primary-foreground shadow-glow"
              >
                Request a new reset link
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="mt-4 block text-xs text-primary hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-center">Reset Password</h1>
              <p className="mt-1.5 text-center text-sm text-muted-foreground">
                Enter your new password below to update your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                  {passwordError && (
                    <p className="mt-1.5 text-xs text-destructive">{passwordError}</p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-border bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                  {matchError && <p className="mt-1.5 text-xs text-destructive">{matchError}</p>}
                </div>

                {!passwordError && !matchError && (
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters, with uppercase, lowercase, a number, and a symbol.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
