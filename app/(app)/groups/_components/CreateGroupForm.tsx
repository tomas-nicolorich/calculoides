"use client";

import { useState, type SyntheticEvent } from "react";
import { Button, Input } from "../../../_ui";
import { create } from "../../../../lib/actions/group";

/**
 * Group-creation form (groups-view spec, PR 11 tasks 11.3/11.4). Extracted
 * from `GroupsClient`'s inline `<input>`/`<button>` markup; wired to the
 * existing `lib/actions/group.ts` `create` Server Action — no new Server
 * Action needed. `onCreated` hands the new group back to the caller so it
 * can be appended to the list without a full page reload.
 */
export function CreateGroupForm({
  onCreated,
}: {
  onCreated: (group: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await create({ name });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setName("");
    onCreated(result.data);
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex-1 min-w-48 space-y-1">
        <label htmlFor="group-name" className="text-sm font-medium">
          Group Name
        </label>
        <Input
          id="group-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="e.g. My Household"
          autoFocus
          required
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-brand-expense w-full">
          {error}
        </p>
      )}
    </form>
  );
}
