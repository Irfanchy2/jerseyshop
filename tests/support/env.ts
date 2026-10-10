/** Test environment: a dedicated database so tests never touch development or production data. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://jersey:jersey@localhost:5432/jerseystudio_test?schema=public";

export function applyTestEnv() {
  Object.assign(process.env, {
    DATABASE_URL: TEST_DATABASE_URL,
    APP_SECRET: "test-secret-test-secret-test-secret-1234",
    ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    LOCAL_STORAGE_DIR: ".storage-test",
  });
}
