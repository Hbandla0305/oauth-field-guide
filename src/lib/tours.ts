// Content for the first-visit page tours. Lives outside the "use client" component so server
// pages can import it as plain data.
import type { TourStep } from "@/components/page-tour";

export const TOURS: Record<"home" | "guide" | "use", TourStep[]> = {
  home: [
    { icon: "⏱", title: "See how long OAuth will really take", body: "Every app shows two times: when it works for you in dev, and when any user can connect, including review waits." },
    { icon: "🔎", title: "Search, filter or sort", body: "Search 110+ apps, filter by difficulty, or sort by popular, hardest or longest to go live." },
    { icon: "🤖", title: "Not in the list? An agent researches it", body: "Type any app or website and press Get the guide. An agent reads the docs, tries the first setup steps and writes a guide in about two minutes." },
  ],
  guide: [
    { icon: "📋", title: "Start with the verdict", body: "The card at the top answers the big questions. Tap any “?” to see how an estimate was made and what backs it." },
    { icon: "✅", title: "Work through the steps", body: "Steps involved is a checklist: tick steps off as you go. Each one says whether it's for you, the provider, or something AI can help with." },
    { icon: "▶", title: "Have the AI do the work", body: "Use “Do it with AI” on a step, or “Have the AI do the work”, to get drafts like your privacy policy, scope justifications or a full review pack. For Slack and GitHub it can pre-fill the app for you." },
    { icon: "💬", title: "Ask about this guide", body: "Chat answers only from this guide and cites its sources. Stuck on an error? Paste it into Troubleshoot." },
    { icon: "🧭", title: "See how it was made", body: "“How it was made” shows what the agent read, tried and decided, and what's still uncertain." },
  ],
  use: [
    { icon: "🧩", title: "Use the guides in your tools", body: "Connect OAuth Field Guide to Claude, Claude Code, Cursor or VS Code, and ask while you build." },
    { icon: "💬", title: "Or in Slack", body: "Install the Slack app with the manifest below, then use /oauth-guide or @mention it in a channel." },
    { icon: "📎", title: "Copy a prompt to start", body: "The prompts at the bottom are ready to paste into any connected assistant." },
  ],
};
