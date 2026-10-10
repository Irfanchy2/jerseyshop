"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  className,
  children,
  showTitle = true,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  showTitle?: boolean;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.25s_ease] data-[state=closed]:animate-[fade-out_.2s_ease]" />
      <D.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-6 text-foreground shadow-2xl outline-none data-[state=open]:animate-[dialog-in_.35s_var(--ease-out-expo)]",
          className,
        )}
      >
        <D.Title className={cn("font-heading text-lg font-semibold", !showTitle && "sr-only")}>{title}</D.Title>
        <D.Description className={cn("mt-1 text-sm text-muted-foreground", !description && "sr-only")}>{description ?? title}</D.Description>
        <D.Close className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-foreground/60 hover:bg-foreground/5 hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </D.Close>
        <div className={cn(showTitle && "mt-5")}>{children}</div>
      </D.Content>
    </D.Portal>
  );
}
