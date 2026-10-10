"use client";
import * as A from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = A.Root;
export function AccordionItem({ title, children, value, className }: { title: React.ReactNode; children: React.ReactNode; value: string; className?: string }) {
  return (
    <A.Item value={value} className={cn("border-b border-border", className)}>
      <A.Header>
        <A.Trigger className="group flex w-full items-center justify-between py-4 text-left text-[15px] font-medium">
          {title}
          <Plus className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-45" />
        </A.Trigger>
      </A.Header>
      <A.Content className="overflow-hidden text-sm leading-relaxed text-muted-foreground data-[state=closed]:animate-[accordion-up_.25s_ease] data-[state=open]:animate-[accordion-down_.3s_var(--ease-out-expo)]">
        <div className="pb-5">{children}</div>
      </A.Content>
    </A.Item>
  );
}
