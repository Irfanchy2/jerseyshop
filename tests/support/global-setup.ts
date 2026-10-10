import { execSync } from "node:child_process";
import { applyTestEnv } from "./env";

/**
 * Prepares the dedicated test database non-destructively: applies pending migrations and runs the
 * idempotent seed (demo catalog is only inserted when empty). Tests create uniquely-named data.
 */
export default function setup() {
  applyTestEnv();
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts --demo", { stdio: "inherit", env });
}
