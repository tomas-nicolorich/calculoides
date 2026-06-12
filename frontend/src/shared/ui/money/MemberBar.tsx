import { cn } from "../../lib/utils";

export interface MemberBarMember {
  id?: string;
  name: string;
  /** Share of the group total, as a percentage (0-100). */
  share?: number;
  /** Pre-formatted income amount shown in the legend. */
  amount?: React.ReactNode;
  /** Explicit colour; defaults to the member palette by position. */
  color?: string;
}

export interface MemberBarProps extends React.HTMLAttributes<HTMLDivElement> {
  members: MemberBarMember[];
  /** Show the name/income/percentage legend beneath the bar. */
  legend?: boolean;
  /** Message rendered when there are no members. */
  emptyMessage?: string;
}

// CDS member palette (see --color-member-* in index.css).
const MEMBER_PALETTE = [
  "var(--color-member-1)",
  "var(--color-member-2)",
  "var(--color-member-3)",
  "var(--color-member-4)",
  "var(--color-member-5)",
  "var(--color-member-6)",
  "var(--color-member-7)",
  "var(--color-member-8)",
  "var(--color-member-9)",
  "var(--color-member-10)",
];

function colorFor(member: MemberBarMember, index: number): string {
  return member.color ?? MEMBER_PALETTE[index % MEMBER_PALETTE.length];
}

export function MemberBar({
  members,
  legend = true,
  emptyMessage = "No members to display.",
  className,
  ...props
}: MemberBarProps) {
  if (members.length === 0) {
    return (
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const sumShares = members.reduce((sum, m) => sum + (m.share ?? 0), 0);
  const total = sumShares === 0 ? 1 : sumShares;

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex h-4 w-full overflow-hidden rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
        {members.map((m, i) => (
          <div
            key={m.id ?? i}
            data-testid="memberbar-segment"
            title={`${m.name}: ${(m.share ?? 0).toString()}%`}
            className="h-full border-r-2 border-card last:border-r-0"
            style={{
              width: `${(((m.share ?? 0) / total) * 100).toString()}%`,
              background: colorFor(m, i),
            }}
          />
        ))}
      </div>
      {legend && (
        <div className="flex flex-col gap-3">
          {members.map((m, i) => (
            <div
              key={m.id ?? i}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                <span
                  className="h-3 w-3 flex-none rounded-full"
                  style={{ background: colorFor(m, i) }}
                />
                {m.name}
              </span>
              <span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                  {m.amount}
                </span>
                {m.share != null && (
                  <span className="ml-2 font-mono text-slate-400 dark:text-slate-500">
                    ({m.share}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
