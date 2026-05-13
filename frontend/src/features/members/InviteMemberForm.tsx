import { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../shared/ui';
import { apiClient } from '../../shared/api/client';

export function InviteMemberForm({ groupId, onInvited }: { groupId: string; onInvited: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.invitations.create(groupId, email);
      setEmail('');
      onInvited();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            required
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Inviting...' : 'Invite'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
