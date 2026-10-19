"use client";

// Adapted from the DotLoader in "Design component Prompts/Dot_loader.md": a 7x7 dot grid that
// steps through frames. Stops for people who prefer reduced motion.
import { useEffect, useRef } from "react";

// A snake winding through the grid (the "game" frames from the original demo).
const GAME = [
  [14, 7, 0, 8, 6, 13, 20],
  [14, 7, 13, 20, 16, 27, 21],
  [14, 20, 27, 21, 34, 24, 28],
  [27, 21, 34, 28, 41, 32, 35],
  [34, 28, 41, 35, 48, 40, 42],
  [34, 28, 41, 35, 48, 42, 46],
  [34, 28, 41, 35, 48, 42, 38],
  [34, 28, 41, 35, 48, 30, 21],
  [34, 28, 41, 48, 21, 22, 14],
  [34, 28, 41, 21, 14, 16, 27],
  [34, 28, 21, 14, 10, 20, 27],
  [28, 21, 14, 4, 13, 20, 27],
  [28, 21, 14, 12, 6, 13, 20],
  [28, 21, 14, 6, 13, 20, 11],
  [28, 21, 14, 6, 13, 20, 10],
  [14, 6, 13, 20, 9, 7, 21],
];

export function DotLoader({ frames = GAME, duration = 110, className = "" }: { frames?: number[][]; duration?: number; className?: string }) {
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dots = Array.from(grid.current?.children ?? []) as HTMLElement[];
    const apply = (i: number) => dots.forEach((d, n) => d.classList.toggle("active", frames[i].includes(n)));
    apply(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      apply(i);
    }, duration);
    return () => clearInterval(id);
  }, [frames, duration]);

  return (
    <div ref={grid} role="presentation" className={`grid w-fit grid-cols-7 gap-[3px] ${className}`}>
      {Array.from({ length: 49 }).map((_, i) => (
        <div key={i} className="size-2 rounded-[2px] bg-ink/10 transition-colors duration-100 [&.active]:bg-ink" />
      ))}
    </div>
  );
}
