import { Card, CardHeader, CardTitle, CardContent } from '../../shared/ui';

interface Member {
  id: string;
  userId: string;
  income: number;
  joinedAt: Date;
}

export function MemberList({ members }: { members: Member[] }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex justify-between items-center border-b pb-2 last:border-0">
              <div>
                <p className="font-medium">{member.userId}</p>
                <p className="text-sm text-muted-foreground">
                  Joined: {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">€{member.income.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly Income</p>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-center text-muted-foreground">No members found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
