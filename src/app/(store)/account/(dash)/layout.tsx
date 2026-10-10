import Link from "next/link";
import { requireCustomer } from "@/lib/auth/guards";
import { logoutAction } from "@/lib/auth/actions";
import { AccountNav } from "@/components/store/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer("/account");
  return (
    <div className="container-x py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hello,</p>
          <h1 className="font-heading text-[30px] font-extrabold md:text-[40px]">{user.name}</h1>
        </div>
        <form action={logoutAction}><button className="text-sm font-medium underline underline-offset-4">Sign out</button></form>
      </div>
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
      <p className="mt-16 text-center text-[12px] text-muted-foreground">Need help? <Link href="/contact" className="underline">Contact support</Link></p>
    </div>
  );
}
