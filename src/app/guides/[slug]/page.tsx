import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuide, LIBRARY } from "@/lib/guides";
import { guideToMarkdown } from "@/lib/markdown";
import { GuideView } from "@/components/guide/guide-view";
import { PageTour } from "@/components/page-tour";
import { TOURS } from "@/lib/tours";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams() {
  return LIBRARY.map((g) => ({ slug: g.app.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await findGuide((await params).slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.app.name} OAuth setup`,
    description: `${guide.verdict.summary} Working in dev: ${guide.verdict.timeToDev.range}. Any user can connect: ${guide.verdict.timeToProd.range}.`,
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = await findGuide((await params).slug);
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
