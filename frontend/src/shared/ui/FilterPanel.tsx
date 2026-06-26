import { useState } from "react";
import { Button } from "./Button";

interface FilterPanelProps {
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

export function FilterPanel({ activeCount, onClear, children }: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const toggleLabel = open
    ? "Hide Filters"
    : activeCount > 0
      ? `Filters (${activeCount})`
      : "Filters";

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        {toggleLabel}
      </Button>
      {open && (
        <div>
          {children}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
