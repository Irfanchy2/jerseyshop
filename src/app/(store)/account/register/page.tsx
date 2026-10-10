import { RegisterForm } from "@/components/store/account/auth-forms";

export const metadata = { title: "Create account", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="container-x flex justify-center py-14 md:py-20">
      <div className="w-full max-w-md">
        <h1 className="mb-8 font-heading text-[32px] font-extrabold">Create account</h1>
        <RegisterForm next={sp.next} />
      </div>
    </div>
  );
}
