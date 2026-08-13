import { cn } from "../../lib/cn";

interface UserDisplayProps {
  user?: {
    name?: string | null;
    email?: string;
  };
  className?: string;
}

/**
 * Ported verbatim from `main`'s `shared/ui/UserDisplay.tsx` (PR 16). Shared
 * component for displaying user names, mandated by BUG-014 to strictly
 * prioritize the `User.name` property.
 */
export function UserDisplay({ user, className }: UserDisplayProps) {
  if (!user) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        Unknown User
      </span>
    );
  }

  const displayName = user.name ?? user.email ?? "Unnamed User";

  return <span className={cn("font-medium", className)}>{displayName}</span>;
}
