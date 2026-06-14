import { useState } from "react";
import { Button, Input, Card } from "../../shared/ui";
import { groupApi } from "../../entities/group";

export function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await groupApi.create(name);
      setName("");
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card title="Create New Group" className="w-full max-w-md">
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Group Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="e.g. My Household"
            required
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-brand-expense">{error}</p>}
        <Button
          variant="balance"
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Group"}
        </Button>
      </form>
    </Card>
  );
}
