"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Camera, Shirt, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionContent } from "@/lib/cms/sections";
import { useStore } from "../store-provider";

/** Explains the try-on flow honestly — no fabricated "AI result" imagery is shown here. */
export function TryOnPromo({ c, jerseyImage }: { c: SectionContent<"tryon_promo">; jerseyImage: string | null }) {
  const { locale } = useStore();
  const L = (en: string, bn: string) => (locale === "bn" && bn ? bn : en);
  const steps = [
    { icon: Shirt, title: locale === "bn" ? "জার্সি বাছুন" : "Pick a jersey", body: locale === "bn" ? "যেকোনো ট্রাই-অন সক্ষম জার্সি" : "Any jersey marked Try-on" },
    { icon: Camera, title: locale === "bn" ? "ছবি আপলোড করুন" : "Upload a photo", body: locale === "bn" ? "সামনের দিক থেকে, ভালো আলোতে" : "Front-facing, good light" },
    { icon: Sparkles, title: locale === "bn" ? "এআই প্রিভিউ" : "Get an AI preview", body: locale === "bn" ? "তুলনা করুন, তারপর কিনুন" : "Compare, then add to bag" },
  ];
  return (
    <section className="section-y">
      <div className="container-x">
        <div className="grid items-center gap-10 rounded-[calc(var(--radius)*1.4)] bg-[#e5ebf2] p-6 text-[#0f1320] md:p-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5" /> {L(c.eyebrow, c.eyebrowBn)}
            </p>
            <h2 className="mt-5 font-heading text-[34px] font-extrabold leading-[1.03] md:text-[50px]">{L(c.headline, c.headlineBn)}</h2>
            <p className="mt-4 max-w-md text-[#0f1320]/70">{L(c.body, c.bodyBn)}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-[#0f1320] text-white hover:bg-[#0f1320]/85">
                <Link href="/try-on">{L(c.ctaLabel, c.ctaLabelBn)} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-[#0f1320]/60"><ShieldCheck className="h-4 w-4" /> Photos auto-deleted · AI-generated preview</span>
            </div>
          </div>
          <div className="relative">
            <div className="grid gap-3 sm:grid-cols-3">
              {steps.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="rounded-[var(--radius)] bg-white p-5">
                  <span className="text-[11px] font-bold text-[#0f1320]/40">0{i + 1}</span>
                  <s.icon className="mt-6 h-6 w-6" />
                  <p className="mt-3 font-heading font-bold">{s.title}</p>
                  <p className="text-[13px] text-[#0f1320]/60">{s.body}</p>
                </motion.div>
              ))}
            </div>
            {jerseyImage && (
              <div className="mt-3 flex items-center gap-4 rounded-[var(--radius)] bg-white/60 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${jerseyImage}?bg=none`} alt="" className="h-20 w-auto" loading="lazy" />
                <p className="text-[13px] text-[#0f1320]/70">Generated images are labelled as AI previews and are not an exact representation of fit, size or fabric.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
