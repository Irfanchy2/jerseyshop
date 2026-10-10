"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Box, ZoomIn, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { JerseyDesign } from "@/lib/jersey-art";

const Jersey3D = dynamic(() => import("@/components/customizer/jersey-3d").then((m) => m.Jersey3DViewer), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

type Img = { url: string; alt: string | null; kind: string };

export function Gallery({ images, name, design, has3d }: { images: Img[]; name: string; design: JerseyDesign | null; has3d: boolean }) {
  const [active, setActive] = React.useState(0);
  const [mode, setMode] = React.useState<"image" | "3d">("image");
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = React.useState(false);
  const img = images[active];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="lg:grid lg:grid-cols-[84px_1fr] lg:gap-4">
      {/* Thumbnails */}
      <div className="order-2 mt-3 flex gap-2 overflow-x-auto no-scrollbar lg:order-1 lg:mt-0 lg:flex-col" role="tablist" aria-label="Product images">
        {images.map((im, i) => (
          <button
            key={im.url}
            role="tab"
            aria-selected={mode === "image" && i === active}
            onClick={() => { setMode("image"); setActive(i); }}
            className={cn("relative aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.6)] bg-muted ring-offset-2 ring-offset-background transition lg:w-full", mode === "image" && i === active ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.url} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent py-1 text-center text-[10px] font-semibold capitalize text-white">{im.kind.toLowerCase()}</span>
          </button>
        ))}
        {has3d && (
          <button
            role="tab"
            aria-selected={mode === "3d"}
            onClick={() => setMode("3d")}
            className={cn("grid aspect-[4/5] w-[72px] shrink-0 place-items-center rounded-[calc(var(--radius)*0.6)] border border-border bg-surface text-[11px] font-semibold transition lg:w-full", mode === "3d" ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:border-foreground")}
          >
            <span className="flex flex-col items-center gap-1"><Box className="h-5 w-5" />3D</span>
          </button>
        )}
      </div>

      {/* Main stage */}
      <div className="relative order-1 overflow-hidden rounded-[var(--radius)] bg-muted lg:order-2" style={{ aspectRatio: "4/5" }}>
        {mode === "3d" && design ? (
          <div className="absolute inset-0">
            <Jersey3D design={design} />
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[12px] text-white">Drag to rotate · scroll to zoom</p>
          </div>
        ) : (
          <div
            className="absolute inset-0 cursor-zoom-in"
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
            onClick={() => setLightbox(true)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.img
                key={img?.url}
                src={img?.url}
                alt={img?.alt ?? name}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: zoom ? 1.9 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
                style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%" }}
                className="absolute inset-0 h-full w-full object-cover"
                fetchPriority="high"
              />
            </AnimatePresence>
            <span className="pointer-events-none absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-surface/90 shadow"><ZoomIn className="h-4 w-4" /></span>
          </div>
        )}
        {/* Front/back quick switch */}
        <div className="absolute left-4 top-4 flex gap-1 rounded-full bg-surface/90 p-1 text-[12px] font-semibold shadow-sm backdrop-blur">
          {images.slice(0, 2).map((im, i) => (
            <button key={im.url} onClick={() => { setMode("image"); setActive(i); }} className={cn("rounded-full px-3 py-1 capitalize transition", mode === "image" && active === i ? "bg-foreground text-background" : "text-foreground/70")}>
              {im.kind.toLowerCase()}
            </button>
          ))}
          {has3d && (
            <button onClick={() => setMode("3d")} className={cn("rounded-full px-3 py-1 transition", mode === "3d" ? "bg-foreground text-background" : "text-foreground/70")}>3D</button>
          )}
        </div>
      </div>

      <Dialog.Root open={lightbox} onOpenChange={setLightbox}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-[fade-in_.25s_ease]" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
            <Dialog.Title className="sr-only">{name}</Dialog.Title>
            <Dialog.Description className="sr-only">Enlarged product image</Dialog.Description>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img?.url} alt={img?.alt ?? name} className="max-h-full max-w-full rounded-lg object-contain" />
            <Dialog.Close className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
