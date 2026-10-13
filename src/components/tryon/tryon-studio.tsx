"use client";

import { imgSrc, imgSrcSet } from "@/lib/images";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, ImagePlus, Trash2, RefreshCw, Download, Share2, ZoomIn, ZoomOut, ShieldCheck, Sparkles, Info, AlertTriangle, Check, Camera, Sun, User, Shirt, ChevronLeft } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TryOnProduct = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  customizable: boolean;
  variants: { id: string; size: string; color: string; colorHex: string; stock: number }[];
};

type Status = { enabled: boolean; demo: boolean; maxUploadMb: number; retentionHours: number; sampleModels: { id: string; label: string }[] };
type Job = { id: string; status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; demo: boolean; error: string | null; retrying: boolean; resultUrl: string | null; personUrl: string | null };

const STAGES = ["Uploading photo securely", "Preparing your photo", "Fitting the jersey with AI", "Finishing the preview"];

export function TryOnStudio({ products, initialSlug, status, signedIn }: { products: TryOnProduct[]; initialSlug?: string; status: Status; signedIn: boolean }) {
  const { t, money, addToCart } = useStore();
  const router = useRouter();
  const [productId, setProductId] = React.useState(() => products.find((p) => p.slug === initialSlug)?.id ?? products[0]?.id);
  const product = products.find((p) => p.id === productId);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [sampleId, setSampleId] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [saveToAccount, setSaveToAccount] = React.useState(false);
  const [job, setJob] = React.useState<Job | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [split, setSplit] = React.useState(50);
  const [zoomed, setZoomed] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [step, setStep] = React.useState<1 | 2 | 3>(initialSlug ? 2 : 1);
  const [size, setSize] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const busy = submitting || job?.status === "QUEUED" || job?.status === "PROCESSING";

  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Poll job status.
  React.useEffect(() => {
    if (!job || job.status === "SUCCEEDED" || job.status === "FAILED" || job.status === "CANCELLED") return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/try-on/jobs/${job.id}`).then((r) => r.json()).catch(() => null);
      if (r?.id) setJob(r);
    }, 2000);
    return () => clearInterval(id);
  }, [job]);

  React.useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStage((s) => Math.min(STAGES.length - 1, s + 1)), 3500);
    return () => clearInterval(id);
  }, [busy]);

  const pick = (f: File | undefined | null) => {
    setError(null);
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) return setError("Please choose a JPG, PNG or WebP photo.");
    if (f.size > status.maxUploadMb * 1024 * 1024) return setError(`Photo is too large. Maximum ${status.maxUploadMb} MB.`);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setSampleId(null);
    setPreview(URL.createObjectURL(f));
    setJob(null);
  };

  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setSampleId(null);
    setJob(null);
  };

  const generate = async () => {
    if (!product) return;
    if (!file && !sampleId) return setError("Upload a photo or choose a sample model first.");
    if (!consent) return setError("Please agree to the photo processing terms.");
    setError(null);
    setStage(0);
    setSubmitting(true);
    setStep(3);
    try {
      const fd = new FormData();
      fd.set("productId", product.id);
      fd.set("consent", "true");
      fd.set("saveToAccount", String(saveToAccount));
      if (sampleId) fd.set("sampleModelId", sampleId);
      else if (file) fd.set("photo", file);
      const res = await fetch("/api/try-on/jobs", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the try-on.");
      setJob({ id: data.id, status: "QUEUED", demo: data.demo, error: null, retrying: false, resultUrl: null, personUrl: null });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const regenerate = async () => {
    if (!job) return;
    setError(null);
    setStage(0);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/try-on/jobs/${job.id}/regenerate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setJob({ id: data.id, status: "QUEUED", demo: data.demo, error: null, retrying: false, resultUrl: null, personUrl: null });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNow = async () => {
    if (job) await fetch(`/api/try-on/jobs/${job.id}`, { method: "DELETE" });
    removePhoto();
    setConsent(false);
  };

  const share = async () => {
    if (!job?.resultUrl) return;
    try {
      const blob = await fetch(job.resultUrl).then((r) => r.blob());
      const f = new File([blob], "jersey-tryon-ai-preview.jpg", { type: blob.type });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: product?.name, text: "AI-generated try-on preview" });
      else window.open(job.resultUrl, "_blank");
    } catch {
      /* user cancelled */
    }
  };

  const variant = product?.variants.find((v) => v.size === size) ?? null;
  const buy = async (mode: "add" | "buy") => {
    if (!variant) return setError("Choose a size first.");
    const ok = await addToCart(variant.id, 1, { silent: mode === "buy" });
    if (ok && mode === "buy") router.push("/checkout");
  };

  const sourceImg = preview ?? (job?.personUrl ?? null);

  if (!status.enabled) return <div className="container-x py-24 text-center"><h1 className="font-heading text-3xl font-bold">{t.tryon.title}</h1><p className="mt-3 text-muted-foreground">Virtual try-on is currently unavailable.</p></div>;

  return (
    <div className="container-x pb-16 pt-6 md:pt-10">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> AI feature</p>
          <h1 className="font-heading text-[32px] font-extrabold leading-none md:text-[44px]">{t.tryon.title}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{t.tryon.subtitle}</p>
        </div>
        {status.demo && (
          <p className="flex max-w-md items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[13px] text-warning" role="status">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t.tryon.demoMode}
          </p>
        )}
      </div>

      {/* Mobile step indicator */}
      <ol className="mb-5 grid grid-cols-3 gap-2 lg:hidden" aria-label="Steps">
        {[["Jersey", Shirt], ["Photo", Camera], ["Preview", Sparkles]].map(([label, Icon], i) => {
          const I = Icon as typeof Shirt;
          return (
            <li key={i}>
              <button onClick={() => setStep((i + 1) as 1 | 2 | 3)} className={cn("flex w-full items-center justify-center gap-1.5 rounded-full border py-2 text-[13px] font-medium", step === i + 1 ? "border-foreground bg-foreground text-background" : "border-border")}>
                <I className="h-3.5 w-3.5" /> {i + 1}. {label as string}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr_340px]">
        {/* LEFT — photo */}
        <section className={cn("space-y-4 rounded-[var(--radius)] border border-border bg-surface p-5", step !== 2 && "hidden lg:block")} aria-labelledby="photo-h">
          <h2 id="photo-h" className="font-heading text-lg font-bold">{t.tryon.upload}</h2>
          {sourceImg || sampleId ? (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                {sourceImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sourceImg} alt="Your uploaded photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground"><span className="flex flex-col items-center gap-2"><User className="h-8 w-8" />{status.sampleModels.find((m) => m.id === sampleId)?.label}</span></div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}><ImagePlus className="h-4 w-4" /> {t.tryon.replace}</Button>
                <Button variant="ghost" size="sm" onClick={removePhoto} disabled={busy}><Trash2 className="h-4 w-4" /> {t.tryon.remove}</Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files?.[0]); }}
              className={cn("flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition", dragOver ? "border-foreground bg-muted" : "border-border")}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-muted"><Upload className="h-6 w-6" /></span>
              <p className="text-sm font-medium">{t.tryon.drop}</p>
              <Button size="sm" onClick={() => inputRef.current?.click()}>Choose photo</Button>
              <p className="text-[12px] text-muted-foreground">JPG, PNG or WebP · up to {status.maxUploadMb} MB</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label={t.tryon.upload} />

          {status.sampleModels.length > 0 ? (
            <div>
              <p className="mb-2 text-[13px] font-medium">{t.tryon.useModel}</p>
              <div className="flex flex-wrap gap-2">
                {status.sampleModels.map((m) => (
                  <button key={m.id} onClick={() => { removePhoto(); setSampleId(m.id); }} className={cn("rounded-full border px-3 py-1.5 text-[13px]", sampleId === m.id ? "border-foreground bg-foreground text-background" : "border-border")}>{m.label}</button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No sample models are available yet — please use your own photo.</p>
          )}

          <div className="rounded-xl bg-muted/70 p-4 text-[13px]">
            <p className="mb-2 font-semibold">{t.tryon.tips}</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2"><User className="h-4 w-4 shrink-0" /> One person, facing the camera, knees-up or full body</li>
              <li className="flex gap-2"><Sun className="h-4 w-4 shrink-0" /> Even lighting, plain background</li>
              <li className="flex gap-2"><Shirt className="h-4 w-4 shrink-0" /> Fitted top works best; avoid bulky jackets</li>
            </ul>
          </div>
          <div className="flex gap-2 text-[12px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            <p>Your photo is stored privately, used only to create this preview, never used for advertising, and deleted automatically after {status.retentionHours} hours{signedIn ? " unless you save it to your account" : ""}. <Link href="/privacy-policy#tryon" className="underline">Privacy</Link></p>
          </div>
          <Button className="w-full lg:hidden" onClick={() => setStep(3)} disabled={!sourceImg && !sampleId}>Continue</Button>
        </section>

        {/* CENTER — canvas */}
        <section className={cn("relative flex min-h-[520px] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-[#ecebe7]", step !== 3 && "hidden lg:flex")} aria-labelledby="canvas-h" aria-live="polite">
          <h2 id="canvas-h" className="sr-only">Try-on preview</h2>
          <div className="relative flex-1">
            {job?.status === "SUCCEEDED" && job.resultUrl ? (
              <div className={cn("absolute inset-0 overflow-hidden", zoomed ? "cursor-zoom-out" : "")}>
                <div className="absolute inset-0 transition-transform duration-500" style={{ transform: zoomed ? "scale(1.8)" : "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.resultUrl} alt={job.demo ? "Demo mode output — not an AI try-on" : "AI-generated try-on preview"} className="absolute inset-0 h-full w-full object-contain" />
                  {sourceImg && !job.demo && (
                    <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sourceImg} alt="Original photo" className="absolute inset-0 h-full w-full object-contain" />
                    </div>
                  )}
                </div>
                {sourceImg && !job.demo && !zoomed && (
                  <>
                    <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${split}%` }} />
                    <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label={`${t.tryon.compare}: ${t.tryon.original} / ${t.tryon.result}`} className="absolute inset-x-6 bottom-20 accent-white" />
                    <span className="absolute left-4 top-4 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">{t.tryon.original}</span>
                    <span className="absolute right-4 top-4 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">{t.tryon.result}</span>
                  </>
                )}
              </div>
            ) : busy ? (
              <div className="absolute inset-0 grid place-items-center p-8">
                <div className="w-full max-w-xs text-center">
                  <div className="relative mx-auto h-40 w-32 overflow-hidden rounded-xl bg-white/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {sourceImg && <img src={sourceImg} alt="" className="h-full w-full object-cover opacity-60" />}
                    <motion.div className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-white/80 to-transparent" animate={{ y: [-48, 170] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
                  <p className="mt-6 font-heading font-semibold">{t.tryon.generating}</p>
                  <AnimatePresence mode="wait">
                    <motion.p key={stage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-sm text-muted-foreground">
                      {job?.retrying ? "The service is busy — retrying automatically…" : STAGES[stage]}
                    </motion.p>
                  </AnimatePresence>
                  <div className="mt-4 h-1 overflow-hidden rounded-full bg-black/10"><motion.div className="h-full bg-foreground" initial={{ width: "5%" }} animate={{ width: `${((stage + 1) / STAGES.length) * 90}%` }} transition={{ duration: 0.8 }} /></div>
                  <p className="mt-3 text-[12px] text-muted-foreground">This usually takes 10–40 seconds.</p>
                </div>
              </div>
            ) : job?.status === "FAILED" ? (
              <div className="absolute inset-0 grid place-items-center p-8 text-center">
                <div className="max-w-sm">
                  <AlertTriangle className="mx-auto h-8 w-8 text-danger" />
                  <p className="mt-3 font-semibold">We couldn&apos;t create this preview</p>
                  <p className="mt-1 text-sm text-muted-foreground">{job.error}</p>
                  <Button className="mt-5" variant="outline" onClick={regenerate}><RefreshCw className="h-4 w-4" /> {t.common.retry}</Button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-8 text-center">
                <div className="max-w-sm">
                  {product?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc(product.image, 640, { transparent: true })} alt="" className="mx-auto h-56 w-auto opacity-90 drop-shadow-xl" />
                  )}
                  <p className="mt-4 font-heading text-lg font-semibold">Your AI preview will appear here</p>
                  <p className="mt-1 text-sm text-muted-foreground">Upload a photo, agree to the terms and press Generate.</p>
                </div>
              </div>
            )}
          </div>

          {/* Label + actions */}
          {job?.status === "SUCCEEDED" && (
            <div className={cn("flex items-center gap-2 px-4 py-2 text-[12px] font-medium", job.demo ? "bg-warning text-white" : "bg-black/70 text-white")}>
              <Info className="h-3.5 w-3.5" /> {job.demo ? "DEMO MODE — this is not an AI try-on. No AI provider is configured." : t.tryon.aiLabel}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-black/10 bg-white/70 p-3 backdrop-blur">
            {!job || job.status !== "SUCCEEDED" ? (
              <>
                <label className="flex flex-1 items-start gap-2.5 text-[12px] leading-snug">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.tryon.consent} <Link href="/privacy-policy#tryon" className="underline">Learn more</Link></span>
                </label>
                <Button onClick={generate} loading={submitting} disabled={busy || !consent || (!file && !sampleId) || !product} className="shrink-0">
                  <Sparkles className="h-4 w-4" /> {t.tryon.generate}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setZoomed((z) => !z)}>{zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />} Zoom</Button>
                <Button size="sm" variant="outline" onClick={regenerate} loading={submitting}><RefreshCw className="h-4 w-4" /> {t.tryon.regenerate}</Button>
                <Button size="sm" variant="outline" asChild><a href={`${job.resultUrl}&download=1`}><Download className="h-4 w-4" /> {t.tryon.download}</a></Button>
                <Button size="sm" variant="outline" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
                <Button size="sm" variant="ghost" onClick={deleteNow} className="ml-auto text-danger"><Trash2 className="h-4 w-4" /> {t.tryon.deleteNow}</Button>
              </>
            )}
          </div>
          {signedIn && (!job || job.status !== "SUCCEEDED") && (
            <label className="flex items-center gap-2 bg-white/70 px-3 pb-3 text-[12px] text-muted-foreground">
              <input type="checkbox" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} className="h-4 w-4" /> Save this preview to my account (you can delete it anytime)
            </label>
          )}
          {error && <p className="bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
        </section>

        {/* RIGHT — product */}
        <section className={cn("space-y-5 rounded-[var(--radius)] border border-border bg-surface p-5", step !== 1 && step !== 3 && "hidden lg:block", step === 1 ? "" : "max-lg:order-last")} aria-labelledby="prod-h">
          <h2 id="prod-h" className="font-heading text-lg font-bold">Selected jersey</h2>
          {product && (
            <div className="flex gap-4">
              <div className="h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {product.image && <img src={imgSrc(product.image, 320)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div>
                <Link href={`/products/${product.slug}`} className="font-medium leading-snug hover:underline">{product.name}</Link>
                <p className="mt-1 font-semibold tabular">{money(product.price)}</p>
                {product.variants[0] && <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground"><span className="h-3 w-3 rounded-full border" style={{ background: product.variants[0].colorHex }} /> {product.variants[0].color}</p>}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-[13px] font-medium">Try another jersey</p>
            <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
              {products.map((p) => (
                <button key={p.id} onClick={() => { setProductId(p.id); setSize(null); if (step === 1) setStep(2); }} aria-pressed={p.id === productId} title={p.name} className={cn("aspect-[4/5] overflow-hidden rounded-md bg-muted ring-offset-2 transition", p.id === productId ? "ring-2 ring-foreground" : "opacity-75 hover:opacity-100")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image && <img src={imgSrc(p.image, 320)} alt={p.name} className="h-full w-full object-cover" />}
                </button>
              ))}
            </div>
          </div>
          {product && (
            <div>
              <p className="mb-2 text-[13px] font-medium">{t.product.size}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {product.variants.map((v) => (
                  <button key={v.id} disabled={v.stock <= 0} onClick={() => setSize(v.size)} aria-pressed={size === v.size} className={cn("h-10 rounded-md border text-[13px] font-semibold", size === v.size ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground", v.stock <= 0 && "text-muted-foreground/50 line-through")}>{v.size}</button>
                ))}
              </div>
            </div>
          )}
          {product?.customizable && (
            <Link href={`/customize/${product.id}`} className="flex items-center gap-2 text-sm font-medium underline underline-offset-4"><Shirt className="h-4 w-4" /> {t.product.customize}</Link>
          )}
          <div className="grid gap-2">
            <Button onClick={() => buy("add")}><Check className="h-4 w-4" /> {t.product.addToCart}</Button>
            <Button variant="accent" onClick={() => buy("buy")}>{t.product.buyNow}</Button>
          </div>
          <Button variant="outline" className="w-full lg:hidden" onClick={() => setStep(step === 1 ? 2 : 1)}>{step === 1 ? "Continue to photo" : <><ChevronLeft className="h-4 w-4" /> Change jersey</>}</Button>
        </section>
      </div>
    </div>
  );
}
