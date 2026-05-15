import { useState, useEffect } from 'react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, UserDisplay } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface CategoryFormProps {
  groupId: string;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  user?: {
    name: string | null;
    email: string;
  };
}

export function CategoryForm({ groupId, onSuccess }: CategoryFormProps) {
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [icon, setIcon] = useState('💰');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await apiClient.members.list(groupId);
        setMembers(data);
      } catch (err) {
        console.error('Failed to fetch members for category form', err);
      }
    };
    fetchMembers();
  }, [groupId]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.categories.create(groupId, {
        name,
        monthlyBudget: Number(monthlyBudget),
        icon,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      });
      setName('');
      setMonthlyBudget('');
      setSelectedMemberIds([]);
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to Members (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <Button
                  key={member.id}
                  type="button"
                  variant={selectedMemberIds.includes(member.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleMember(member.id)}
                  className="rounded-full"
                >
                  <UserDisplay user={member.user} className="font-normal" />
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">If none selected, category applies to everyone.</p>
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
