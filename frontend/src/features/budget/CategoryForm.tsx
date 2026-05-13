import { useState } from 'react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface CategoryFormProps {
  groupId: string;
  onSuccess?: () => void;
}

export function CategoryForm({ groupId, onSuccess }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [icon, setIcon] = useState('💰');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.categories.create(groupId, {
        name,
        monthlyBudget: Number(monthlyBudget),
        icon,
      });
      setName('');
      setMonthlyBudget('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Category</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category Name</label>
            <Input
              placeholder="e.g. Rent, Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Budget (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Icon (Emoji)</label>
            <Input
              placeholder="💰"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Category'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
