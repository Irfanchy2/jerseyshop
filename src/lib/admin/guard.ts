import "server-only";
import { requirePermission } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/auth/permissions";

/**
 * Every admin server action starts with this. It re-checks the session + permission on the server,
 * regardless of what the UI shows, and returns the acting staff member for audit logging.
 */
export async function staffAction(permission: PermissionKey) {
  return requirePermission(permission);
}

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(error: unknown): ActionResult {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: { path: (string | number)[]; message: string }[] }).issues;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: Object.fromEntries(issues.map((i) => [i.path.join("."), i.message])) };
  }
  return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
}
