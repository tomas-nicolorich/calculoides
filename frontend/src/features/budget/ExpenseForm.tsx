import { useState } from 'react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface ExpenseFormProps {
  categories: { id: string; name: string }[];
  onSuccess?: () => void;
}

export function ExpenseForm({ categories, onSuccess }: ExpenseFormProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.expenses.log({
        categoryId,
        description,
        amount: Number(amount),
        date: new Date(date).toISOString(),
      });
      setDescription('');
      setAmount('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to log expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Groceries, Rent, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (€)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || categories.length === 0}>
            {loading ? 'Logging...' : 'Log Expense'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
