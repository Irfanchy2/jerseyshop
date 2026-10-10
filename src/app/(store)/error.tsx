"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x flex flex-col items-center py-28 text-center">
      <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">Please try again. If the problem continues, contact support.</p>
      <Button className="mt-8" onClick={reset}>Try again</Button>
    </div>
  );
}
