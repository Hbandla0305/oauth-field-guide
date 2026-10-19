import { DotLoader } from "@/components/dot-loader";

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-24 sm:px-6">
      <DotLoader />
      <p className="text-muted">Opening the guide…</p>
    </main>
  );
}
