import { useEffect, useState, useCallback } from "react";
import { groupApi, type Invitation } from "../../entities/group";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../shared/ui";

export function InvitationList({ onAction }: { onAction?: () => void }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await groupApi.invitations.list();
      setInvitations(data);
    } catch (err) {
      console.error("Failed to fetch invitations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await groupApi.invitations.list();
        if (!active) return;
        setInvitations(data);
      } catch (err) {
        console.error("Failed to fetch invitations", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleAction = async (token: string, action: "ACCEPT" | "REJECT") => {
    try {
      await groupApi.invitations.respond(token, action);
      void fetchInvitations();
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
              <CardTitle className="text-lg">
                Invite to {invitation.group.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                From: {invitation.inviter.name ?? invitation.inviter.email}
              </p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  void handleAction(invitation.token, "ACCEPT");
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleAction(invitation.token, "REJECT");
                }}
              >
                Decline
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
