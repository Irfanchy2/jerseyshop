import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-28 text-center">
      <p className="font-display text-[120px] font-bold leading-none">404</p>
      <h1 className="mt-2 font-heading text-2xl font-bold">This page is offside.</h1>
      <p className="mt-2 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Button asChild className="mt-8"><Link href="/shop">Shop jerseys</Link></Button>
    </div>
  );
}
