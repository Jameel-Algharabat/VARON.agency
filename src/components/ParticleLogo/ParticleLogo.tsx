import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { createEngine } from "./engine";

export function ParticleLogo({ className = "", label }: { className?: string; label: string }) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const engine = createEngine(canvas);
    engine.setReduced(Boolean(reduce));

    const fit = () => {
      void engine.resize(wrap.clientWidth, wrap.clientHeight);
    };

    const ro = new ResizeObserver(fit);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => engine.setVisible(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    io.observe(wrap);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onMove = (event: PointerEvent) => {
      if (!fine.matches) return;
      const box = wrap.getBoundingClientRect();
      engine.setPointer(event.clientX - box.left, event.clientY - box.top, true);
    };
    const onLeave = () => engine.setPointer(0, 0, false);

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);
    fit();

    return () => {
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      engine.destroy();
    };
  }, [reduce]);

  return (
    <div
      ref={wrapRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="hidden sm:block pt-[76%]" aria-hidden="true" />
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
    </div>
  );
}
