import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmailLinkConfirmation } from "@/lib/use-email-link-confirmation";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/confirm-email")({
  head: () => ({ meta: [{ title: "Confirm your email , FocusFlow AI" }] }),
  component: AuthConfirmEmailPage,
});

function AuthConfirmEmailPage() {
  const navigate = useNavigate();
  const { state, confirm } = useEmailLinkConfirmation("signup");

  // Signup verification only establishes a session as a side effect of
  // confirming; the app expects users to sign in explicitly afterwards, so
  // sign back out and send them to Sign In once confirmed.
  useEffect(() => {
    if (state.status === "success") {
      supabase.auth.signOut().finally(() => {
        toast.success("Email verified. Please sign in.");
        navigate({ to: "/auth", search: { mode: "signin", verified: "1" } });
      });
    }
  }, [state.status, navigate]);

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

        <div className="glass-strong rounded-3xl p-8 text-center">
          {(state.status === "ready" || state.status === "confirming") && (
            <>
              <h1 className="text-lg font-semibold">Confirm your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Click below to verify your FocusFlow account and finish creating it.
              </p>
              <button
                type="button"
                disabled={state.status === "confirming"}
                onClick={confirm}
                className="mt-6 w-full rounded-full bg-gradient-primary py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {state.status === "confirming" ? "Verifying…" : "Confirm Email"}
              </button>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="mt-4 block text-xs text-primary hover:underline"
              >
                Back to Sign In
              </Link>
            </>
          )}

          {(state.status === "missing-params" || state.status === "error") && (
            <>
              <h1 className="text-lg font-semibold">Link invalid or expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {state.status === "error"
                  ? state.message
                  : "This verification link is missing or incomplete. It may have already been used, or the address may have been copied incorrectly."}
              </p>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="mt-6 block w-full rounded-full bg-gradient-primary py-3 text-center font-medium text-primary-foreground shadow-glow"
              >
                Back to Sign Up
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="mt-4 block text-xs text-primary hover:underline"
              >
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
