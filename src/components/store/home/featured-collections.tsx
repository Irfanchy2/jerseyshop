"use client";
import { imgSrc, imgSrcSet } from "@/lib/images";
import Link from "next/link";
import { Reveal } from "../reveal";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";

type Col = { slug: string; name: string; nameBn: string | null; description: string | null; accentHex: string | null; imageUrl: string | null; images: string[]; count: number };

export function FeaturedCollections({ title, collections }: { title: string; collections: Col[] }) {
  const { locale } = useStore();
  if (!collections.length) return null;
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading title={title} href="/collections" linkLabel={locale === "bn" ? "সব কালেকশন" : "All collections"} />
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {collections.map((col, i) => (
            <Reveal key={col.slug} index={i}>
              <Link href={`/collections/${col.slug}`} className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[var(--radius)] p-6 text-white md:p-8" style={{ background: col.accentHex ?? "#1f2937" }}>
                {col.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={col.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-[1.2s] group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-x-0 top-0 flex h-[66%] items-center justify-center px-6">
                    {col.images.slice(0, 3).map((src, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src={imgSrc(src, 480, { transparent: true })} srcSet={imgSrcSet(src, { transparent: true })} sizes="15vw" alt="" loading="lazy" className="-mx-[5%] w-[42%] transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:-translate-y-2" style={{ transform: `rotate(${(k - 1) * 7}deg) translateY(${k === 1 ? 0 : 18}px)`, zIndex: k === 1 ? 2 : 1 }} />
                    ))}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{col.count} jerseys</p>
                  <h3 className="mt-1 font-heading text-2xl font-bold md:text-3xl">{locale === "bn" && col.nameBn ? col.nameBn : col.name}</h3>
                  {col.description && <p className="mt-2 max-w-sm text-sm text-white/75">{col.description}</p>}
                  <span className="mt-4 inline-block border-b border-white/60 pb-0.5 text-sm font-semibold transition group-hover:border-white">Shop collection</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
