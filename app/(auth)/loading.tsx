import { Spinner } from "../_ui";

/**
 * Single shared `(auth)` segment fallback covering all five auth routes
 * (login, signup, forgot-password, reset-password, complete-profile) —
 * design.md Decision 1: a `loading.tsx` installs a Suspense boundary at its
 * segment whether or not a sibling `layout.tsx` exists, so no
 * `app/(auth)/layout.tsx` is needed. Renders `Spinner`, not `Skeleton`,
 * because the final content shape is not yet meaningful before the session
 * check (`supabase.auth.getUser()`, plus `UserService.getUser` for
 * complete-profile) resolves (route-loading-states: "Every `(auth)` Route
 * Segment Renders a Centered Spinner Fallback").
 */
export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
