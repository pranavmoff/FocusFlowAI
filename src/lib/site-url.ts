// Single source of truth for the deployed site URL used in auth redirects.
// Always set VITE_SITE_URL explicitly at build time — locally to
// http://localhost:8081 (or your dev server origin), in production to your real domain.

export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    const envUrl = import.meta.env.VITE_SITE_URL as string | undefined;
    // In production or custom domains, use env URL if set and non-localhost.
    // In local development, use window.location.origin to match current dev server port automatically.
    if (envUrl && !envUrl.includes("localhost")) {
      return envUrl.replace(/\/$/, "");
    }
    return window.location.origin.replace(/\/$/, "");
  }
  return (
    (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
    "http://localhost:8081"
  );
}

export const SITE_URL: string = getSiteUrl();

export function getAuthRecoveryUrl(): string {
  return `${getSiteUrl()}/auth/recovery`;
}

export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

export function getAuthSignupConfirmUrl(): string {
  return `${getSiteUrl()}/auth/confirm-email`;
}

export const AUTH_CALLBACK_URL = getAuthCallbackUrl();
export const AUTH_RECOVERY_URL = getAuthRecoveryUrl();
export const AUTH_SIGNUP_CONFIRM_URL = getAuthSignupConfirmUrl();

// Kept for backward compatibility: a direct code/access_token callback fallback
export const PASSWORD_RESET_URL = `${getSiteUrl()}/auth/callback?type=recovery`;
