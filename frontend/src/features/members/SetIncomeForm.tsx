import { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

export function SetIncomeForm({
  memberId,
  currentIncome,
  onUpdated,
}: {
  memberId: string;
  currentIncome: number;
  onUpdated: () => void;
}) {
  const [income, setIncome] = useState(currentIncome.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Note: This would require a new endpoint or updating GroupService to handle individual income updates
      // For now, we assume the API client will have this method
      await apiClient.fetch(`/members/${memberId}/income`, {
        method: 'PATCH',
        body: JSON.stringify({ income: Number(income) }),
      });
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Set My Income</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="pl-7"
              placeholder="0.00"
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Update'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
