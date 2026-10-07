import { createLoggerStorage } from "evlog/toolkit/storage";

/**
 * `useLogger()` returns the evlog logger for the current request.
 * src/server.ts binds it around every request with `loggerStorage.run()`.
 */
export const { storage: loggerStorage, useLogger } = createLoggerStorage(
  "request. src/server.ts must wrap the TanStack handler with withEvlog().",
  "ewiz-share:workers",
);
