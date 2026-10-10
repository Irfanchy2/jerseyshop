"use client";
import * as React from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { AddressForm } from "./account-forms";
import { deleteAddressAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";

type A = React.ComponentProps<typeof AddressForm>["address"] & {};

export function AddressBook({ addresses }: { addresses: NonNullable<A>[] }) {
  const [editing, setEditing] = React.useState<string | "new" | null>(addresses.length ? null : "new");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Addresses</h2>
        <Button size="sm" variant="outline" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add address</Button>
      </div>
      {editing === "new" && <div className="rounded-[var(--radius)] border border-border bg-surface p-5"><AddressForm onDone={() => setEditing(null)} /></div>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-[var(--radius)] border border-border bg-surface p-5">
            {editing === a.id ? <AddressForm address={a} onDone={() => setEditing(null)} /> : (
              <>
                <p className="font-semibold">{a.label} {a.isDefault && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">Default</span>}</p>
                <p className="mt-2 text-sm text-muted-foreground">{a.name} · {a.phone}<br />{a.line1}<br />{a.area}, {a.district}, {a.division}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(a.id)}><Pencil className="h-4 w-4" /> Edit</Button>
                  <form action={deleteAddressAction.bind(null, a.id)}><Button size="sm" variant="ghost" type="submit"><Trash2 className="h-4 w-4" /> Delete</Button></form>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
