interface ProgressMeterProps {
  value: number;
  max: number;
}

export function ProgressMeter({ value, max }: ProgressMeterProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden"
    >
      <div
        className="h-full bg-brand-balance rounded-full transition-all"
        style={{ width: `${pct.toFixed(2)}%` }}
      />
    </div>
  );
}
