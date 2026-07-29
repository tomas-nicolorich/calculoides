import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "../../../shared/ui";

interface PasswordVisibilityToggleProps {
  show: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityToggle({
  show,
  onToggle,
}: PasswordVisibilityToggleProps) {
  return (
    <IconButton
      type="button"
      size="sm"
      hover="neutral"
      aria-label={show ? "Hide passwords" : "Show passwords"}
      aria-pressed={show}
      onClick={onToggle}
      className="absolute right-1 top-1/2 -translate-y-1/2"
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </IconButton>
  );
}
