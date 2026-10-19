// Confirms the fetch layer refuses non-public targets. Usage: npx tsx scripts/ssrf-test.ts
import { safeGet, isPublicAddress } from "../src/lib/agent/probes";
async function main() {
  for (const ip of ["127.0.0.1", "10.0.0.5", "169.254.169.254", "100.64.0.1", "::1", "::ffff:7f00:1", "fd00::1", "64:ff9b::7f00:1", "192.0.2.1", "8.8.8.8"]) console.log(ip.padEnd(18), isPublicAddress(ip) ? "public" : "blocked");
  for (const url of ["https://localhost/", "https://127.0.0.1/", "http://example.com/", "https://example.com:8443/", "https://user:pw@example.com/", "https://localtest.me/"]) {
    try {
      await safeGet(url);
      console.log(url.padEnd(32), "FETCHED (unexpected)");
    } catch (e) {
      console.log(url.padEnd(32), "refused:", (e as Error).message.slice(0, 60));
    }
  }
}
main();
