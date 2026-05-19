import { cn } from '../lib/utils';

interface UserDisplayProps {
  user?: {
    name?: string | null;
    email?: string;
  };
  className?: string;
}

/**
 * Shared component for displaying user names.
 * Mandated by BUG-014 to strictly prioritize the `User.name` property.
 */
export function UserDisplay({ user, className }: UserDisplayProps) {
  if (!user) return <span className={cn("text-muted-foreground", className)}>Unknown User</span>;
  
  // BUG-014: Strictly use User.name for display. 
  // We provide fallbacks for safety, but data fetching should ensure name is present.
  const displayName = user.name ?? user.email ?? 'Unnamed User';
  
  return (
    <span className={cn("font-medium", className)}>
      {displayName}
    </span>
  );
}
