import { ThemeIconToggle } from "../../_theme/ThemeIconToggle";
import { AuthBrand } from "../_components/AuthBrand";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4">
      <div className="absolute top-4 right-4">
        <ThemeIconToggle />
      </div>
      <AuthBrand />
      <ForgotPasswordForm />
    </div>
  );
}
