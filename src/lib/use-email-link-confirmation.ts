import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OtpLinkType = "recovery" | "signup";

export type ConfirmationSource =
  | { type: "token_hash"; hash: string }
  | { type: "code"; code: string }
  | { type: "implicit"; access_token: string; refresh_token: string }
  | { type: "active_session" };

export type EmailLinkConfirmationState =
  | { status: "missing-params" }
  | { status: "ready" }
  | { status: "confirming" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * Reads a recovery/verification parameter set from the current URL or session.
 * Handles custom token_hash, standard Supabase PKCE `code`, implicit `access_token`,
 * error parameters from expired links, and existing active recovery sessions.
 */
export function useEmailLinkConfirmation(expectedType: OtpLinkType) {
  const [source, setSource] = useState<ConfirmationSource | null>(null);
  const [state, setState] = useState<EmailLinkConfirmationState>({ status: "missing-params" });

  useEffect(() => {
    let active = true;

    async function evaluateUrlAndSession() {
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
        if (!active) return;
        const decoded = decodeURIComponent(errorDesc).replace(/\+/g, " ");
        setState({
          status: "error",
          message:
            decoded.includes("expired") || decoded.includes("invalid")
              ? "This link is invalid or has expired. Please request a new reset link."
              : decoded,
        });
        return;
      }

      // 2. Custom template: token_hash query parameter
      const tokenHash = url.searchParams.get("token_hash");
      const linkType = url.searchParams.get("type") || hashParams.get("type");

      if (tokenHash && (!linkType || linkType === expectedType)) {
        if (!active) return;
        setSource({ type: "token_hash", hash: tokenHash });
        setState({ status: "ready" });
        return;
      }

      // 3. Standard Supabase PKCE flow: `code` query parameter
      const code = url.searchParams.get("code");
      if (code) {
        if (!active) return;
        setSource({ type: "code", code });
        setState({ status: "ready" });
        return;
      }

      // 4. Standard Supabase implicit flow: `#access_token=...` in hash
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || "";
      if (accessToken) {
        if (!active) return;
        setSource({ type: "implicit", access_token: accessToken, refresh_token: refreshToken });
        setState({ status: "ready" });
        return;
      }

      // 5. Active session check (e.g. session established prior to navigation)
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        if (!active) return;
        setSource({ type: "active_session" });
        setState({ status: "success" });
        return;
      }

      // 6. Otherwise, missing or incomplete parameters
      if (active) {
        setState({ status: "missing-params" });
      }
    }

    evaluateUrlAndSession();

    return () => {
      active = false;
    };
  }, [expectedType]);

  async function confirm() {
    if (!source) return;
    if (source.type === "active_session") {
      setState({ status: "success" });
      return;
    }

    setState({ status: "confirming" });
    try {
      if (source.type === "token_hash") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: source.hash,
          type: expectedType,
        });
        if (error) throw error;
      } else if (source.type === "code") {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;
      } else if (source.type === "implicit") {
        const { error } = await supabase.auth.setSession({
          access_token: source.access_token,
          refresh_token: source.refresh_token,
        });
        if (error) throw error;
      }

      // Strip sensitive token parameters from URL history
      window.history.replaceState({}, document.title, window.location.pathname);
      setState({ status: "success" });
    } catch (err: unknown) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setState({
        status: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "This link is invalid or has expired. Please request a new reset link.",
      });
    }
  }

  return { state, confirm };
}
