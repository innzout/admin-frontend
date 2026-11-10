"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** A4 width at 96 dpi (210mm). */
const PAGE_WIDTH_PX = 794;

/**
 * Shrinks a fixed-width page to fit its container on screen, like a PDF viewer.
 * Print is unaffected: the transform is removed so the page prints at real A4 size.
 */
export function FitToWidth({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const s = Math.min(1, o.clientWidth / PAGE_WIDTH_PX);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full print:h-auto!" style={{ height }}>
      <div ref={inner} className="origin-top-left print:transform-none!" style={{ width: PAGE_WIDTH_PX, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
