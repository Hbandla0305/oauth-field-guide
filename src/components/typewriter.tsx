"use client";

import { useEffect, useState } from "react";

// Types a headline out once on load. The full text is always in the DOM (for screen readers
// and search), an invisible copy reserves the space so nothing below jumps, and people who
// prefer reduced motion see the finished text straight away.
export function Typewriter({ text, speed = 45, startDelay = 250 }: { text: string; speed?: number; startDelay?: number }) {
  // Starts empty so the server-rendered page doesn't flash the full text before typing.
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      setTyping(false);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setShown(i);
      // A slightly longer beat after punctuation reads more naturally.
      if (i < text.length) timer = setTimeout(tick, /[?,.]/.test(text[i - 1]) ? speed * 5 : speed);
      else setTyping(false);
    };
    timer = setTimeout(tick, startDelay);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return (
    <span className="relative inline-block">
      <span className="sr-only">{text}</span>
      <span aria-hidden className="invisible">
        {text}
      </span>
      <span aria-hidden className="absolute inset-0">
        {text.slice(0, shown)}
        <span className={`ml-0.5 inline-block w-[3px] translate-y-[0.08em] self-stretch bg-ink align-baseline ${typing ? "" : "animate-[blink_1s_steps(1)_infinite]"}`} style={{ height: "0.9em" }} />
      </span>
    </span>
  );
}
