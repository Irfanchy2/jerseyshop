import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/guards";
import { AddressBook } from "@/components/store/account/address-book";

export const metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireCustomer("/account/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
  return <AddressBook addresses={addresses.map((a) => ({ id: a.id, label: a.label, name: a.name, phone: a.phone, line1: a.line1, area: a.area, division: a.division, district: a.district, postcode: a.postcode, isDefault: a.isDefault }))} />;
}
