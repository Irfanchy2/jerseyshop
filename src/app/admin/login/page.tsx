import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { AdminLoginForm } from "@/components/admin/login-form";

export default async function AdminLogin() {
  if (await getStaff()) redirect("/admin");
  const s = await getSettings();
  return (
    <div className="admin-theme grid min-h-dvh bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#0f1a15] p-12 text-white lg:flex">
        <p className="font-heading text-lg font-extrabold tracking-[0.18em]">{s.brand.name}</p>
        <div>
          <p className="font-heading text-4xl font-bold leading-tight">Run your jersey store<br />from one place.</p>
          <p className="mt-4 max-w-sm text-white/60">Orders, inventory, couriers, AI try-on and your storefront — all managed here.</p>
        </div>
        <p className="text-xs text-white/40">Staff access only. All sign-ins are logged.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-2xl font-bold text-foreground">Sign in to Admin</h1>
          <p className="mb-8 mt-1 text-sm text-muted-foreground">Use your staff account.</p>
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
