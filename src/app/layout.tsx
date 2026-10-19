import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "OAuth Field Guide", template: "%s · OAuth Field Guide" },
  description: "How long until your users can connect? Setup steps, review waits and blockers for getting your own OAuth app approved, with the evidence behind every claim.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${publicSans.variable} antialiased`}>
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight">
              OAuth Field Guide
            </Link>
            <Link href="/#how" className="text-sm text-muted hover:text-ink">
              How guides are made
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
