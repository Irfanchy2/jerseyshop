export default function Loading() {
  return (
    <div className="container-x py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i}><div className="skeleton aspect-[4/5] rounded-[var(--radius)]" /><div className="skeleton mt-3 h-4 w-3/4 rounded" /><div className="skeleton mt-2 h-4 w-1/3 rounded" /></div>)}
      </div>
    </div>
  );
}
