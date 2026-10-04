import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in , FocusFlow AI" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      // Determine intent up front so error handling can route correctly
      // even if the exchange below throws (e.g. an expired/reused link).
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const type = url.searchParams.get("type") ?? hash.get("type");
      const code = url.searchParams.get("code");
      const isRecovery = type === "recovery";

      try {
        // 1) PKCE / code exchange flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else if (hash.get("access_token")) {
          // 2) Implicit flow: tokens in URL hash
          const access_token = hash.get("access_token")!;
          const refresh_token = hash.get("refresh_token") ?? "";
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (isRecovery) {
          // Recovery link landed here with no code and no access_token — most
          // likely already consumed (e.g. an email client's link-scanner
          // pre-fetched it) or expired. Let the reset-password page's own
          // "link may have expired" state handle messaging.
          throw new Error("Reset link is invalid or has expired.");
        }

        // Clean the URL so tokens don't linger
        window.history.replaceState({}, document.title, "/auth/callback");

        if (cancelled) return;

        // Recovery: send to the reset-password page while session is active
        if (isRecovery) {
          setMessage("Redirecting to password reset…");
          navigate({ to: "/auth/reset-password" });
          return;
        }

        // Signup verification: sign out and send to Sign In
        if (type === "signup") {
          await supabase.auth.signOut();
          setMessage("Email verified. Redirecting to sign in…");
          navigate({ to: "/auth", search: { verified: "1", mode: "signin" } });
          return;
        }

        const { data } = await supabase.auth.getUser();
        if (data.user) {
          navigate({ to: "/dashboard" });
        } else {
          navigate({ to: "/auth", search: { mode: "signin" } });
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (cancelled) return;

        // Never bounce a failed password-recovery attempt to Sign In — land on
        // the reset-password page, which shows its own "link expired" state
        // and a way to request a new one.
        if (isRecovery) {
          toast.error(err?.message ?? "Could not verify reset link.");
          navigate({ to: "/auth/reset-password" });
          return;
        }

        toast.error(err?.message ?? "Could not complete sign in");
        navigate({ to: "/auth", search: { mode: "signin" } });
      }
    }

    complete();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-strong rounded-3xl px-10 py-12 text-center">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">FocusFlow AI</p>
        <h1 className="mt-3 text-2xl font-semibold">{message}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hang tight, this only takes a moment.</p>
      </div>
    </div>
  );
}
