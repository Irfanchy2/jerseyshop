export function ProsePage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-12 md:py-20">
      <h1 className="font-heading text-[34px] font-extrabold leading-tight md:text-[48px]">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-10 space-y-5 text-[15px] leading-relaxed text-foreground/85 [&_a]:underline [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </div>
  );
}
