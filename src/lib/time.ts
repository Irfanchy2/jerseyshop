/** Request-time date helpers (server components render per request, so "now" is intentional). */
export const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
export const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000);
export const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
