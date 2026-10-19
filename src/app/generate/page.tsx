import type { Metadata } from "next";
import { Suspense } from "react";
import { GenerateRun } from "./generate-run";

export const metadata: Metadata = { title: "Generating guide" };

export default function GeneratePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-14 pb-24 sm:px-6">
      <Suspense>
        <GenerateRun />
      </Suspense>
    </main>
  );
}
