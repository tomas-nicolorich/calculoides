import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { IconButton } from "./IconButton";
import { cn } from "../../lib/cn";

export interface ReloadButtonProps {
  /** Query key prefix to invalidate and refetch — scoped to the active screen. */
  queryKey: QueryKey;
  className?: string;
}

/** Invalidates and refetches the given query scope; spins while the refetch is in flight. */
export function ReloadButton({ queryKey, className }: ReloadButtonProps) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  const handleReload = async () => {
    setPending(true);
    try {
      await qc.invalidateQueries({ queryKey });
    } finally {
      setPending(false);
    }
  };

  return (
    <IconButton
      hover="balance"
      disabled={pending}
      onClick={() => void handleReload()}
      aria-label="Reload data"
      className={className}
    >
      <RefreshCw size={16} className={cn(pending && "animate-spin")} />
    </IconButton>
  );
}
