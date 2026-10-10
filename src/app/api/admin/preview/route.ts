import { cookies } from "next/headers";
import { getStaff } from "@/lib/auth/session";

/** Staff-only: toggle storefront draft preview (appearance + homepage) for this browser. */
export async function GET(req: Request) {
  const staff = await getStaff();
  const url = new URL(req.url);
  if (!staff) return Response.redirect(new URL("/admin/login", url), 303);
  const on = url.searchParams.get("on") === "1";
  const jar = await cookies();
  if (on) jar.set("js_preview", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  else jar.delete("js_preview");
  return Response.redirect(new URL(on ? "/?preview=draft" : "/admin/appearance", url), 303);
}
