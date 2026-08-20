"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { upsert } from "../../../lib/actions/user";
import { Button } from "../../_ui";
import { AuthCard, FormField, FormError } from "../_components/AuthCard";

export function CompleteProfileForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await upsert({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push("/groups");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Complete Your Profile"
      subtitle="Tell us your name to finish setting up your account"
    >
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-4"
      >
        <FormField
          id="name"
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={setName}
          autoFocus
        />

        <FormError message={error} />

        <Button
          type="submit"
          variant="cta"
          className="w-full h-10 mt-6"
          disabled={loading}
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
