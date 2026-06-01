import { useState } from "react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
} from "../../shared/ui";
import { apiClient } from "../../shared/api/client";

interface TransferFormProps {
  categoryId: string;
  categoryName: string;
  members: { id: string; name: string }[];
  currentMemberId: string;
  isOwner?: boolean;
  onSuccess?: () => void;
}

export function TransferForm({
  categoryId,
  categoryName,
  members,
  currentMemberId,
  isOwner,
  onSuccess,
}: TransferFormProps) {
  const [fromMemberId, setFromMemberId] = useState(currentMemberId);
  const [toMemberId, setToMemberId] = useState(
    members.find((m) => m.id !== currentMemberId)?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.fetch("/transfers", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          fromMemberId,
          toMemberId,
          amount: Number(amount),
        }),
      });
      setAmount("");
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to transfer budget";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Budget ({categoryName})</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <Select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={fromMemberId}
              onValueChange={(val) => {
                setFromMemberId(val);
              }}
              disabled={!isOwner}
              options={members.map((m) => ({
                value: m.id,
                label: `${m.name}${m.id === currentMemberId ? " (You)" : ""}`,
              }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <Select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={toMemberId}
              onValueChange={(val) => {
                setToMemberId(val);
              }}
              options={members
                .filter((m) => m.id !== fromMemberId)
                .map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || fromMemberId === toMemberId}
          >
            {loading ? "Transferring..." : "Transfer Budget"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
