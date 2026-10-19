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
