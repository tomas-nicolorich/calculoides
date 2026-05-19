import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { UserDisplay, Button } from '../../shared/ui';
import { Member } from '../../shared/api/types';

export function MemberList({ 
  groupId, 
  isOwner, 
  currentUserId,
  onEditIncome 
}: { 
  groupId: string; 
  isOwner: boolean;
  currentUserId: string;
  onEditIncome: (member: Member) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiClient.members.list(groupId);
        if (!active) return;
        setMembers(data);
      } catch (err) {
        console.error('Failed to fetch members', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <div className="p-4 text-center">Loading members...</div>;

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div key={member.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
          <div>
            <UserDisplay user={member.user} className="text-lg" />
            <p className="text-sm text-muted-foreground">
              Joined: {new Date(member.joinedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">€{member.income.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Monthly Income</p>
            </div>
            {(isOwner || member.userId === currentUserId) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => { onEditIncome(member); }}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      ))}
      {members.length === 0 && (
        <p className="text-sm text-center text-muted-foreground">No members found</p>
      )}
    </div>
  );
}
