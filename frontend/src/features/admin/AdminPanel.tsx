import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

interface AdminPanelProps {
  groupId: string;
  members: { id: string; name: string }[];
  currentOwnerId: string;
  onSuccess?: () => void;
}

export function AdminPanel({ groupId, members, currentOwnerId, onSuccess }: AdminPanelProps) {
  const [newOwnerId, setNewOwnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive all current expenses? This will reset budget spent balances.')) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiClient.fetch('/archive', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to archive expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerId) return;
    if (!confirm('Are you sure you want to transfer ownership? You will lose admin permissions.')) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.fetch(`/transfer-ownership?groupId=${groupId}`, {
        method: 'POST',
        body: JSON.stringify({ newOwnerId }),
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Archive Expenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Move all current expenses to historical records and reset the spent balance of all categories to 0.
          </p>
          <Button 
            variant="destructive" 
            onClick={handleArchive} 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Archive Current Month'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Group Ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select New Owner</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
            >
              <option value="">Select a member...</option>
              {members.filter(m => m.id !== currentOwnerId).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <Button 
            variant="outline" 
            onClick={handleTransferOwnership} 
            disabled={loading || !newOwnerId}
          >
            {loading ? 'Transferring...' : 'Transfer Ownership'}
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
