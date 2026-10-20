import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LIBRARY, resolveSlug } from "@/lib/guides";
import { getGeneratedGuide } from "@/lib/db";
import { guideToMarkdown } from "@/lib/markdown";
import { GuideView } from "@/components/guide/guide-view";
import { PageTour } from "@/components/page-tour";
import { TOURS } from "@/lib/tours";

type Props = { params: Promise<{ slug: string }> };

// Rendered per request: library guides come from memory (a few milliseconds) and live guides from
// the database, so a page visited before its guide existed is never served as a cached 404.
export const dynamic = "force-dynamic";

// A database error shows the error page instead of "not found".
async function loadGuide(slug: string) {
  const key = resolveSlug(slug);
  return LIBRARY.find((g) => g.app.slug === key) ?? getGeneratedGuide(key);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await loadGuide((await params).slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.app.name} OAuth setup`,
    description: `${guide.verdict.summary} Working in dev: ${guide.verdict.timeToDev.range}. Any user can connect: ${guide.verdict.timeToProd.range}.`,
    // Guides the live agent wrote from pages anyone could have published: not indexed, links not followed.
    ...(guide.verification.status === "agent-generated" ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = await loadGuide((await params).slug);
  if (!guide) notFound();

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = `${host ? `https://${host}` : ""}/guides/${guide.app.slug}`;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="py-5">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← All guides
        </Link>
      </div>
      <GuideView guide={guide} markdown={guideToMarkdown(guide, url)} />
      <PageTour id="guide" steps={TOURS.guide} />
    </main>
  );
}
