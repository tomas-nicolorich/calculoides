export function FallbackNameHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-xs text-slate-500">
      We didn't find a display name on your account, so we're showing your email
      for now — feel free to set one.
    </p>
  );
}
