import { useParams, Link } from 'react-router-dom';
import { useSavingsGoals } from '../../../shared/api/savingsHooks';
import { SavingsGoalList } from '../../../features/savings/SavingsGoalList';
import { SavingsGoalForm } from '../../../features/savings/SavingsGoalForm';
import { ArrowLeft } from 'lucide-react';

export function SavingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data: goals, loading, error, refresh } = useSavingsGoals(groupId ?? null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-balance"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link 
          to={`/dashboard/${groupId ?? ''}`}
          aria-label="Back to Dashboard"
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ArrowLeft size={24} className="text-brand-balance" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Savings Calculator</h1>
          <p className="text-slate-500 font-medium">Plan and track your group savings goals</p>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SavingsGoalList goals={goals} onRefresh={() => { refresh(); }} />
        </div>
        <div>
          <SavingsGoalForm groupId={groupId ?? ''} onSuccess={() => { refresh(); }} />
        </div>
      </div>
    </div>
  );
}
