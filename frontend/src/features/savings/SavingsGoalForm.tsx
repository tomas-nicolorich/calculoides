import { useState } from 'react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface SavingsGoalFormProps {
  groupId: string;
  onSuccess?: () => void;
}

export function SavingsGoalForm({ groupId, onSuccess }: SavingsGoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.savings.create(groupId, {
        name,
        targetAmount: Number(targetAmount),
        targetDate: new Date(targetDate).toISOString(),
      });
      setName('');
      setTargetAmount('');
      setTargetDate('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create savings goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Savings Goal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal Name</label>
            <Input
              placeholder="e.g. New Sofa, Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Amount (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Goal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
