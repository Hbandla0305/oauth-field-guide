import Link from "next/link";
import { NotFoundActions } from "@/components/not-found-actions";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">There&rsquo;s no guide here yet</h1>
      <p className="mt-3 text-lg text-muted">The link may be mistyped, or nobody has researched this app yet.</p>
      <NotFoundActions />
      <Link href="/" className="mt-6 block w-fit text-sm underline underline-offset-2">
        Back to all guides
      </Link>
    </main>
  );
}
