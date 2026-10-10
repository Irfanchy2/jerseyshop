import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/auth/guards";
import { loadProductForm } from "@/lib/admin/product-loader";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("products.write");
  const data = await loadProductForm((await params).id);
  if (!data) notFound();
  return (
    <div>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title={data.initial.name} />
      <ProductForm key={data.initial.id} {...data} />
    </div>
  );
}
