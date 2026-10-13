// Custom glyphs that Lucide doesn't provide, drawn to match its 2px stroke style.
export function HangerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 7.2a2.2 2.2 0 1 1 2.2-2.2c0 1-.6 1.5-1.4 2-.5.3-.8.7-.8 1.3v.4" />
      <path d="M12 8.7 3.2 15.4a1.4 1.4 0 0 0 .8 2.5h16a1.4 1.4 0 0 0 .8-2.5L12 8.7Z" />
    </svg>
  );
}

export function BagPlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8.6 8.4V7a3.4 3.4 0 0 1 6.8 0v1.4" />
      <path d="M19.2 13.2V9.4a1 1 0 0 0-1-1H5.8a1 1 0 0 0-1 1l-.7 9.7a2 2 0 0 0 2 2.1h6.6" />
      <path d="M18 15.9v5.4M15.3 18.6h5.4" />
    </svg>
  );
}
