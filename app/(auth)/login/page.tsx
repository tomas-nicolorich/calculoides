import { ThemeIconToggle } from "../../_theme/ThemeIconToggle";
import { AuthBrand } from "../_components/AuthBrand";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4">
      <div className="absolute top-4 right-4">
        <ThemeIconToggle />
      </div>
      <AuthBrand />
      <LoginForm />
    </div>
  );
}
