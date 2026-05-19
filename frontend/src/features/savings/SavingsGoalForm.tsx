import { useState } from 'react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  startingAmount: number;
  targetDate: string;
}

interface SavingsGoalFormProps {
  groupId: string;
  goal?: SavingsGoal;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
}

export function SavingsGoalForm({ groupId, goal, onSuccess, onCancel }: SavingsGoalFormProps) {
  const isEditing = !!goal;
  const [name, setName] = useState(goal?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() ?? '');
  const [startingAmount, setStartingAmount] = useState(goal?.startingAmount.toString() ?? '0');
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await apiClient.savings.update(goal.id, {
          name,
          targetAmount: Number(targetAmount),
          startingAmount: Number(startingAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
      } else {
        await apiClient.savings.create(groupId, {
          name,
          targetAmount: Number(targetAmount),
          startingAmount: Number(startingAmount),
          targetDate: new Date(targetDate).toISOString(),
        });
      }
      
      if (!isEditing) {
        setName('');
        setTargetAmount('');
        setStartingAmount('0');
        setTargetDate('');
      }
      await onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || `Failed to ${isEditing ? 'update' : 'create'} savings goal`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit' : 'Create'} Savings Goal</CardTitle>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={(e) => {
            void handleSubmit(e);
          }} 
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal Name</label>
            <Input
              placeholder="e.g. New Sofa, Vacation"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
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
              onChange={(e) => { setTargetAmount(e.target.value); }}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Starting Amount (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={startingAmount}
              onChange={(e) => { setStartingAmount(e.target.value); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Date</label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => { setTargetDate(e.target.value); }}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            {isEditing && (
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" className={isEditing ? 'flex-1' : 'w-full'} disabled={loading}>
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Goal' : 'Create Goal')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
