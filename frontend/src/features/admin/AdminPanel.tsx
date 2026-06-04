import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
} from "../../shared/ui";
import { groupApi } from "../../entities/group";

const UNDO_WINDOW_SECONDS = 10;

function defaultPeriodMonth(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1);
  return `${String(prev.getFullYear())}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

interface AdminPanelProps {
  groupId: string;
  members: { id: string; name: string }[];
  currentOwnerId: string;
  onSuccess?: () => void;
}

export function AdminPanel({
  groupId,
  members,
  currentOwnerId,
  onSuccess,
}: AdminPanelProps) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodMonth, setPeriodMonth] = useState(defaultPeriodMonth());
  const [undoPeriod, setUndoPeriod] = useState<string | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearInterval(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const startUndoCountdown = (period: string) => {
    setUndoPeriod(period);
    setUndoSecondsLeft(UNDO_WINDOW_SECONDS);
    clearUndoTimer();
    undoTimerRef.current = setInterval(() => {
      setUndoSecondsLeft((s) => {
        if (s <= 1) {
          clearUndoTimer();
          setUndoPeriod(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(
    () => () => {
      clearUndoTimer();
    },
    [],
  );

  const handleArchive = async () => {
    setLoading(true);
    setError(null);
    try {
      await groupApi.archive.archiveMonth(groupId, periodMonth);
      startUndoCountdown(periodMonth);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to archive expenses",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!undoPeriod) return;
    clearUndoTimer();
    setUndoPeriod(null);
    setLoading(true);
    setError(null);
    try {
      await groupApi.archive.undoArchive(groupId, undoPeriod);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo archive");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerId) return;
    setLoading(true);
    setError(null);
    try {
      await groupApi.transferOwnership(groupId, newOwnerId);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transfer ownership",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Archive Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Move a month&apos;s expenses to historical records and calculate
            member settlements. This action is irreversible after the undo
            window.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Month to archive</label>
            <input
              type="month"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={periodMonth}
              onChange={(e) => {
                setPeriodMonth(e.target.value);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                void handleArchive();
              }}
              disabled={loading || !periodMonth}
            >
              {loading ? "Processing..." : "Archive Month"}
            </Button>
            {undoPeriod && (
              <Button
                variant="outline"
                onClick={() => {
                  void handleUndo();
                }}
                disabled={loading}
              >
                Undo ({undoSecondsLeft}s)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Group Ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Owner</label>
            <Select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newOwnerId}
              onValueChange={(val) => {
                setNewOwnerId(val);
              }}
              placeholder="Select a member..."
              options={members
                .filter((m) => m.id !== currentOwnerId)
                .map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              void handleTransferOwnership();
            }}
            disabled={loading || !newOwnerId}
          >
            {loading ? "Transferring..." : "Transfer Ownership"}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
