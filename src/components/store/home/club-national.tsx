"use client";
import Link from "next/link";
import { Reveal } from "../reveal";
import { useStore } from "../store-provider";
import { SectionHeading } from "../section-heading";

type Team = { slug: string; name: string; nameBn: string | null; kind: "CLUB" | "NATIONAL"; primaryHex: string; secondaryHex: string; count: number };

export function ClubNational({ title, teams }: { title: string; teams: Team[] }) {
  const { t, locale } = useStore();
  const groups = [
    { label: t.home.clubs, items: teams.filter((x) => x.kind === "CLUB") },
    { label: t.home.nationalTeams, items: teams.filter((x) => x.kind === "NATIONAL") },
  ];
  return (
    <section className="section-y">
      <div className="container-x">
        <SectionHeading title={title} />
        <div className="grid gap-10 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{g.label}</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {g.items.map((tm, i) => (
                  <Reveal key={tm.slug} index={i}>
                    <Link href={`/shop?team=${tm.slug}`} className="group flex items-center gap-3 rounded-[calc(var(--radius)*0.8)] border border-border bg-surface p-3 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full" aria-hidden>
                        <span className="absolute inset-0" style={{ background: tm.primaryHex }} />
                        <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: tm.secondaryHex }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{locale === "bn" && tm.nameBn ? tm.nameBn : tm.name}</span>
                        <span className="block text-[12px] text-muted-foreground">{tm.count} {tm.count === 1 ? "jersey" : "jerseys"}</span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
