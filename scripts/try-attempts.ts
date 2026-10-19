// Runs the logged-out setup attempts against a provider. Usage: npm run try-attempts -- <authorizeUrl> <tokenUrl> <portalUrl>
import { attemptSetup, rootDomain } from "../src/lib/agent/probes";
async function main() {
  const [authorizeUrl, tokenUrl, portalUrl] = process.argv.slice(2);
  const root = rootDomain(authorizeUrl || tokenUrl || portalUrl);
  for (const a of await attemptSetup({ root, authorizeUrl, tokenUrl, portalUrl })) console.log(`${a.id} ${a.title}\n   ${a.observed.slice(0, 260)}\n`);
}
main();
