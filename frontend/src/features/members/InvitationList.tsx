import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../shared/ui';

interface Invitation {
  id: string;
  groupId: string;
  group: { name: string };
  inviter: { name: string | null; email: string };
  status: string;
}

export function InvitationList({ onAction }: { onAction?: () => void }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.invitations.list();
      setInvitations(data);
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAction = async (id: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await apiClient.invitations.respond(id, action);
      fetchInvitations();
      onAction?.();
    } catch (err) {
      console.error(`Failed to ${action} invitation`, err);
    }
  };

  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Pending Invitations</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {invitations.map((invitation) => (
          <Card key={invitation.id} className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Invite to {invitation.group.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                From: {invitation.inviter.name || invitation.inviter.email}
              </p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" onClick={() => handleAction(invitation.id, 'ACCEPT')}>
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(invitation.id, 'REJECT')}>
                Decline
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
