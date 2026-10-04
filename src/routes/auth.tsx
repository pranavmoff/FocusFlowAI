import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /auth/* — renders child routes (sign-in, recovery, callback, etc.)
// The actual sign-in/sign-up UI lives in auth.index.tsx (the index route for /auth).
export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return <Outlet />;
}
