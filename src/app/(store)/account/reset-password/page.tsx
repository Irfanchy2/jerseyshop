import { ResetForm } from "@/components/store/account/auth-forms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="container-x flex justify-center py-14 md:py-20">
      <div className="w-full max-w-md">
        <h1 className="mb-8 font-heading text-[32px] font-extrabold">Choose a new password</h1>
        <ResetForm token={sp.token ?? ""} />
      </div>
    </div>
  );
}
