"use client";
import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, RotateCcw, Type, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionContent } from "@/lib/cms/sections";
import { jerseySvg, type JerseyDesign } from "@/lib/jersey-art";
import { useStore } from "../store-provider";

export function PersonalisePromo({ c, product }: { c: SectionContent<"personalise_promo">; product: { id: string; slug: string; design: JerseyDesign | null } | null }) {
  const { locale } = useStore();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const [name, setName] = React.useState(c.sampleName);
  const [num, setNum] = React.useState(c.sampleNumber);
  const svg = React.useMemo(
    () => (product?.design ? jerseySvg(product.design, "back", { backdrop: null, name, number: num }) : null),
    [product, name, num],
  );
  const href = product ? `/customize/${product.id}` : "/collections/personalised";
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="grid overflow-hidden rounded-[calc(var(--radius)*1.4)] bg-[#141414] text-white lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 md:p-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c8f169]">{L(c.eyebrow, c.eyebrowBn)}</p>
            <h2 className="mt-3 font-heading text-[34px] font-extrabold leading-[1.02] md:text-[52px]">{L(c.headline, c.headlineBn)}</h2>
            <p className="mt-5 max-w-md text-white/70">{L(c.body, c.bodyBn)}</p>
            <div className="mt-8 grid max-w-sm grid-cols-[1fr_88px] gap-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] text-white/60"><Type className="h-3.5 w-3.5" /> Name</span>
                <input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-z .'-]/g, "").slice(0, 12))} className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 font-semibold uppercase tracking-wider outline-none focus:border-white/50" aria-label="Preview name" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] text-white/60"><Hash className="h-3.5 w-3.5" /> No.</span>
                <input value={num} inputMode="numeric" onChange={(e) => setNum(e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-11 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-center font-semibold outline-none focus:border-white/50" aria-label="Preview number" />
              </label>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="inverse">
                <Link href={href}>{L(c.ctaLabel, c.ctaLabelBn)} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <button onClick={() => { setName(c.sampleName); setNum(c.sampleNumber); }} className="inline-flex items-center gap-1.5 px-2 text-sm text-white/60 hover:text-white">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>
          <div className="relative flex min-h-[420px] items-center justify-center bg-[radial-gradient(60%_60%_at_50%_45%,#2a2a2a,#141414)] p-8">
            {svg && (
              <motion.div initial={{ opacity: 0, rotateY: -40 }} whileInView={{ opacity: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[420px] [perspective:1000px]">
                <div className="drop-shadow-[0_40px_60px_rgba(0,0,0,.5)] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
              </motion.div>
            )}
            <span className="absolute bottom-5 right-5 rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60">Live preview · full 3D in the customiser</span>
          </div>
        </div>
      </div>
    </section>
  );
}
