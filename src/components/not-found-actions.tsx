"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { markStart } from "@/lib/start-intent";

// On /guides/<slug>, offer to research that app with the live agent.
export function NotFoundActions() {
  const path = usePathname();
  const slug = path.startsWith("/guides/") ? decodeURIComponent(path.slice("/guides/".length)).replace(/[-_]+/g, " ").trim() : "";
  if (!slug) return null;
  return (
    <Link href={`/generate?app=${encodeURIComponent(slug)}`} onClick={() => markStart(slug)} className="mt-8 block w-fit rounded-lg bg-ink px-5 py-3 font-medium text-surface hover:bg-ink/90">
      Research “{slug}” with the agent
    </Link>
  );
}
