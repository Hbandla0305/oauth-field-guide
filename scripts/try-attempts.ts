// Runs the logged-out setup attempts against a provider. Usage: npm run try-attempts -- <authorizeUrl> <tokenUrl> <portalUrl>
import { attemptSetup } from "../src/lib/agent/probes";
async function main() {
  const [authorizeUrl, tokenUrl, portalUrl] = process.argv.slice(2);
  for (const a of await attemptSetup({ authorizeUrl, tokenUrl, portalUrl })) console.log(`${a.id} ${a.title}\n   ${a.observed.slice(0, 260)}\n`);
}
main();
