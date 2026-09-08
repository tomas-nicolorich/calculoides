import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { UserService } from "../../../lib/server/services/user";
import { CompleteProfileForm } from "./CompleteProfileForm";

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const profile = await UserService.getUser(authUser.id);
  if (profile) {
    redirect("/groups");
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50 dark:bg-slate-950 px-4">
      <CompleteProfileForm />
    </div>
  );
}
