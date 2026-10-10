"use client";

import * as React from "react";
import { useActionState } from "react";
import { Star } from "lucide-react";
import { contactAction, saveAddressAction, submitReviewAction, updateProfileAction } from "@/lib/account/actions";
import type { FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { BD_DIVISIONS, DIVISIONS } from "@/lib/bd-locations";
import { cn } from "@/lib/utils";

function Msg({ s }: { s: FormState }) {
  if (s?.error) return <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger" role="alert">{s.error}</p>;
  if (s?.message) return <p className="rounded-lg bg-success/10 p-3 text-sm text-success" role="status">{s.message}</p>;
  return null;
}

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string; marketing: boolean } }) {
  const [s, action, pending] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="grid max-w-xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Msg s={s} /></div>
      <Field label="Name" htmlFor="name" error={s?.fieldErrors?.name}><Input id="name" name="name" defaultValue={user.name} /></Field>
      <Field label="Mobile" htmlFor="phone" error={s?.fieldErrors?.phone}><Input id="phone" name="phone" defaultValue={user.phone} /></Field>
      <Field label="Email" htmlFor="email" className="sm:col-span-2" hint="Contact support to change your email."><Input id="email" value={user.email} disabled /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="marketing" defaultChecked={user.marketing} className="h-4 w-4" /> Email me about new kits and offers</label>
      <div><Button type="submit" loading={pending}>Save profile</Button></div>
    </form>
  );
}

export function AddressForm({ address, onDone }: { address?: { id: string; label: string; name: string; phone: string; line1: string; area: string; division: string; district: string; postcode: string | null; isDefault: boolean }; onDone?: () => void }) {
  const [s, action, pending] = useActionState(saveAddressAction, null);
  const [division, setDivision] = React.useState(address?.division ?? "Dhaka");
  React.useEffect(() => { if (s?.ok) onDone?.(); }, [s, onDone]);
  const fe = s?.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="sm:col-span-2"><Msg s={s} /></div>
      <Field label="Label" htmlFor="label"><Input id="label" name="label" defaultValue={address?.label ?? "Home"} /></Field>
      <Field label="Recipient name" htmlFor="aname" error={fe.name}><Input id="aname" name="name" defaultValue={address?.name} /></Field>
      <Field label="Mobile" htmlFor="aphone" error={fe.phone}><Input id="aphone" name="phone" defaultValue={address?.phone} /></Field>
      <Field label="Division" htmlFor="division"><NativeSelect id="division" name="division" value={division} onChange={(e) => setDivision(e.target.value)}>{DIVISIONS.map((d) => <option key={d}>{d}</option>)}</NativeSelect></Field>
      <Field label="District" htmlFor="district" error={fe.district}><NativeSelect id="district" name="district" defaultValue={address?.district}>{BD_DIVISIONS[division].map((d) => <option key={d}>{d}</option>)}</NativeSelect></Field>
      <Field label="Area / Thana" htmlFor="area" error={fe.area}><Input id="area" name="area" defaultValue={address?.area} /></Field>
      <Field label="House, road, details" htmlFor="line1" error={fe.line1} className="sm:col-span-2"><Textarea id="line1" name="line1" rows={2} defaultValue={address?.line1} /></Field>
      <Field label="Postcode" htmlFor="postcode"><Input id="postcode" name="postcode" defaultValue={address?.postcode ?? ""} /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4" /> Default address</label>
      <div><Button type="submit" loading={pending}>Save address</Button></div>
    </form>
  );
}

export function ReviewForm({ productId }: { productId: string }) {
  const [s, action, pending] = useActionState(submitReviewAction, null);
  const [rating, setRating] = React.useState(5);
  if (s?.ok) return <Msg s={s} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <Msg s={s} />
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} stars`} onClick={() => setRating(i)}>
            <Star className={cn("h-7 w-7", i <= rating ? "fill-current" : "opacity-25")} />
          </button>
        ))}
      </div>
      <Field label="Title (optional)" htmlFor="rtitle"><Input id="rtitle" name="title" maxLength={80} /></Field>
      <Field label="Your review" htmlFor="rbody" error={s?.fieldErrors?.body}><Textarea id="rbody" name="body" rows={4} /></Field>
      <Button type="submit" loading={pending}>Submit review</Button>
    </form>
  );
}

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string } }) {
  const [s, action, pending] = useActionState(contactAction, null);
  const fe = s?.fieldErrors ?? {};
  if (s?.ok) return <Msg s={s} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Msg s={s} /></div>
      <Field label="Name" htmlFor="cname" error={fe.name}><Input id="cname" name="name" defaultValue={defaults?.name} /></Field>
      <Field label="Email" htmlFor="cemail" error={fe.email}><Input id="cemail" name="email" type="email" defaultValue={defaults?.email} /></Field>
      <Field label="Mobile (optional)" htmlFor="cphone"><Input id="cphone" name="phone" /></Field>
      <Field label="Order number (optional)" htmlFor="corder"><Input id="corder" name="orderNumber" placeholder="JS-100500" /></Field>
      <Field label="Subject" htmlFor="csubject" error={fe.subject} className="sm:col-span-2"><Input id="csubject" name="subject" /></Field>
      <Field label="Message" htmlFor="cmsg" error={fe.message} className="sm:col-span-2"><Textarea id="cmsg" name="message" rows={5} /></Field>
      <div><Button type="submit" loading={pending}>Send message</Button></div>
    </form>
  );
}
