// A one-time flag our own "research this app" buttons set just before navigating to /generate.
// Visits that arrive without it (e.g. a link from another site) ask for a click before spending.
const KEY = "oauth-guide:start";

export function markStart(app: string) {
  try {
    sessionStorage.setItem(KEY, app.trim().toLowerCase());
  } catch {}
}

export function hasStart(app: string): boolean {
  try {
    return sessionStorage.getItem(KEY) === app.trim().toLowerCase();
  } catch {
    return false;
  }
}

export function clearStart() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

// The live run this tab started, so reloading the page follows that run instead of starting over.
const RUN_KEY = "oauth-guide:run";
const RUN_MAX_AGE_MS = 6 * 60_000; // a run times out after 4 minutes

export type SavedRun = { app: string; runId: string; t0: number };

export function saveRun(app: string, runId: string, t0: number) {
  try {
    sessionStorage.setItem(RUN_KEY, JSON.stringify({ app: app.trim().toLowerCase(), runId, t0 }));
  } catch {}
}

export function loadRun(app: string): SavedRun | null {
  try {
    const r = JSON.parse(sessionStorage.getItem(RUN_KEY) ?? "null");
    const fresh = r && typeof r.runId === "string" && typeof r.t0 === "number" && Date.now() - r.t0 < RUN_MAX_AGE_MS;
    return fresh && r.app === app.trim().toLowerCase() ? r : null;
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    sessionStorage.removeItem(RUN_KEY);
  } catch {}
}
