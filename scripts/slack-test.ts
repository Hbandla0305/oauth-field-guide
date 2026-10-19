// Sends Slack-signed requests to a local or deployed endpoint. Usage: npm run slack-test -- <baseUrl> "<command text>"
import { createHmac } from "node:crypto";
async function send(base: string, path: string, body: string, type: string, stale = false, badSig = false) {
  const ts = String(Math.floor(Date.now() / 1000) - (stale ? 600 : 0));
  const sig = `v0=${createHmac("sha256", badSig ? "wrong" : process.env.SLACK_SIGNING_SECRET!).update(`v0:${ts}:${body}`).digest("hex")}`;
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": type, "x-slack-request-timestamp": ts, "x-slack-signature": sig }, body });
  return { status: res.status, body: (await res.text()).slice(0, 700) };
}
async function main() {
  const [base, text] = [process.argv[2], process.argv[3] ?? "gmail"];
  const form = (t: string) => new URLSearchParams({ text: t, team_id: "T_TEST", response_url: "https://example.com/hook", command: "/oauth-guide" }).toString();
  console.log("bad signature →", (await send(base, "/api/slack/commands", form(text), "application/x-www-form-urlencoded", false, true)).status);
  console.log("stale timestamp →", (await send(base, "/api/slack/commands", form(text), "application/x-www-form-urlencoded", true)).status);
  console.log(`/oauth-guide ${text} →`, await send(base, "/api/slack/commands", form(text), "application/x-www-form-urlencoded"));
  console.log("url_verification →", await send(base, "/api/slack/events", JSON.stringify({ type: "url_verification", challenge: "abc123" }), "application/json"));
}
main();
