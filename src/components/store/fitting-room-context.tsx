"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";

export type WornItem = { id: string; slug: string; name: string; image: string | null; price: number; tryOnEnabled: boolean };

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  worn: WornItem | null;
  wear: (item: WornItem) => void;
  clear: () => void;
};

const FittingRoomContext = React.createContext<Ctx | null>(null);

export function FittingRoomProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [worn, setWorn] = React.useState<WornItem | null>(null);
  const value = React.useMemo<Ctx>(
    () => ({
      open,
      setOpen,
      worn,
      wear: (item) => {
        setWorn(item);
        setOpen(true);
      },
      clear: () => setWorn(null),
    }),
    [open, worn],
  );
  // reducedMotion="user": every framer animation in the storefront honours the OS reduce-motion setting.
  return (
    <MotionConfig reducedMotion="user">
      <FittingRoomContext.Provider value={value}>{children}</FittingRoomContext.Provider>
    </MotionConfig>
  );
}

/** Returns null outside the storefront (e.g. admin previews), so callers can hide the hanger button. */
export function useFittingRoom() {
  return React.useContext(FittingRoomContext);
}
