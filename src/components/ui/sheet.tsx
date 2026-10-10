"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

const sideClasses = {
  right: "inset-y-0 right-0 h-dvh w-full max-w-[440px] data-[state=open]:animate-[sheet-in-right_.45s_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-right_.3s_ease-in]",
  left: "inset-y-0 left-0 h-dvh w-full max-w-[400px] data-[state=open]:animate-[sheet-in-left_.45s_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-left_.3s_ease-in]",
  bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl data-[state=open]:animate-[sheet-in-bottom_.45s_var(--ease-out-expo)] data-[state=closed]:animate-[sheet-out-bottom_.3s_ease-in]",
};

export function SheetContent({
  side = "right",
  title,
  description,
  className,
  children,
  hideClose,
}: {
  side?: keyof typeof sideClasses;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  hideClose?: boolean;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.3s_ease] data-[state=closed]:animate-[fade-out_.25s_ease]" />
      <Dialog.Content
        className={cn("fixed z-50 flex flex-col bg-surface text-foreground shadow-2xl outline-none", sideClasses[side], className)}
        aria-describedby={description ? undefined : undefined}
      >
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
        {!hideClose && (
          <Dialog.Close className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </Dialog.Close>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
