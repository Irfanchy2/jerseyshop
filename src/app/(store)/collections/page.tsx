import Link from "next/link";
import { db } from "@/lib/db";
import { publishedWhere } from "@/lib/catalog/queries";
import { getLocale } from "@/lib/i18n/server";

export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const locale = await getLocale();
  const cols = await db.collection.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { product: publishedWhere() } } } },
      products: { take: 3, where: { product: publishedWhere() }, include: { product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } } } },
    },
  });
  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="mb-10 font-heading text-[34px] font-extrabold md:text-[52px]">Collections</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cols.map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[var(--radius)] p-6 text-white" style={{ background: c.accentHex ?? "#1f2937" }}>
            <div className="absolute inset-x-0 top-0 flex h-[64%] items-center justify-center px-6">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                c.products.map((p, k) => p.product.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.productId} src={`${p.product.images[0].url}?bg=none`} alt="" loading="lazy" className="-mx-[5%] w-[42%] transition duration-700 group-hover:-translate-y-2" style={{ transform: `rotate(${(k - 1) * 7}deg)`, zIndex: k === 1 ? 2 : 1 }} />
                ))
              )}
            </div>
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{c._count.products} jerseys</p>
              <h2 className="mt-1 font-heading text-2xl font-bold">{locale === "bn" && c.nameBn ? c.nameBn : c.name}</h2>
              {c.description && <p className="mt-1 text-sm text-white/75">{c.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
