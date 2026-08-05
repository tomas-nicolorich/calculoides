import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
      >
        Calculoides
      </Link>
      <LoginForm />
    </div>
  );
}
