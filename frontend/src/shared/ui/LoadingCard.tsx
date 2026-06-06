import { Card } from "./Card";

interface LoadingCardProps {
  loading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function LoadingCard({
  loading,
  isEmpty,
  emptyMessage = "No items found.",
  children,
}: LoadingCardProps) {
  return (
    <Card>
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-balance" />
        </div>
      ) : isEmpty ? (
        <div className="py-20 text-center text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {children}
        </div>
      )}
    </Card>
  );
}
