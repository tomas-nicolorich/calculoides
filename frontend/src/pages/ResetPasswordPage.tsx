import { ResetPasswordForm } from "../features/auth/ui/ResetPasswordForm";
import { AuthBrand } from "../features/auth";
import { ThemeIconToggle } from "../features/theme-toggle/ui/ThemeIconToggle";

export function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeIconToggle />
      </div>
      <AuthBrand />
      <ResetPasswordForm />
    </div>
  );
}
