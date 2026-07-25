import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({ value, suffix = "", duration = 1600 }: { value: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) visible.current = true;
      });
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const from = 0;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(Math.round(from + eased * (value - from)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (visible.current) {
      run();
    } else {
      const id = setInterval(() => {
        if (visible.current) {
          clearInterval(id);
          run();
        }
      }, 100);
      return () => {
        clearInterval(id);
        cancelAnimationFrame(raf);
      };
    }
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}