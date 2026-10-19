// Removes one generated guide (e.g. after a verification finds it wrong). Usage: npm run delete-generated -- <slug>
import { neon } from "@neondatabase/serverless";
async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Pass a slug");
  const rows = await neon(process.env.DATABASE_URL!)`delete from guides where slug = ${slug} returning slug`;
  console.log(rows.length ? `Deleted ${slug}` : `No generated guide called ${slug}`);
}
main();
