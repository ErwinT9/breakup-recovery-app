import { useEffect, useMemo, useRef, useState } from "react";

const MAX_FIREFLIES = 18;

/** Jar interior bounds in SVG user units (viewBox 0 0 200 240). */
const BOUNDS = { cx: 100, cy: 132, rx: 62, ry: 66 };

type Fly = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
  seed: number;
  state: "in" | "out";
  opacity: number;
  born: number;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function spawn(id: number): Fly {
  const a = Math.random() * Math.PI * 2;
  const d = Math.sqrt(Math.random());
  return {
    id,
    x: BOUNDS.cx + Math.cos(a) * BOUNDS.rx * 0.8 * d,
    y: BOUNDS.cy + Math.sin(a) * BOUNDS.ry * 0.8 * d,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    r: 2.1 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.6 + Math.random() * 0.6,
    seed: Math.random() * 1000,
    state: "in",
    opacity: 0,
    born: performance.now(),
  };
}

/**
 * Illustrated glass jar whose fireflies represent progress through the current day.
 * All motion is encapsulated here and driven by a single rAF loop mutating DOM
 * transforms directly, so React never re-renders per frame.
 */
export function FireflyJar({
  days,
  dailyProgress,
}: {
  days: number;
  dailyProgress: number;
}) {
  const reduced = usePrefersReducedMotion();
  const progress = Math.min(1, Math.max(0, dailyProgress));
  const target = Math.max(reduced ? 1 : 0, Math.round(progress * MAX_FIREFLIES));

  const flies = useRef<Fly[]>([]);
  const nodes = useRef<Array<SVGGElement | null>>([]);
  const targetRef = useRef(target);
  const ripple = useRef<{ x: number; y: number; t: number } | null>(null);
  const nextId = useRef(0);
  const [slots] = useState(() => Array.from({ length: MAX_FIREFLIES }, (_, i) => i));
  const [rippleKey, setRippleKey] = useState(0);

  targetRef.current = target;

  const glowId = useMemo(() => `ffglow-${Math.random().toString(36).slice(2, 8)}`, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accum = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      accum += dt;

      const list = flies.current;
      const active = list.filter((f) => f.state === "in").length;

      // Gradually add or release fireflies — never in bursts.
      if (accum > 0.9) {
        accum = 0;
        if (active < targetRef.current && list.length < MAX_FIREFLIES) {
          list.push(spawn(nextId.current++));
        } else if (active > targetRef.current) {
          const victim = list.find((f) => f.state === "in");
          if (victim) victim.state = "out";
        }
      }

      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!f) continue;
        f.phase += dt * f.speed;

        if (f.state === "out") {
          // Peaceful midnight release: rise, drift out, fade.
          f.y -= dt * 22;
          f.x += Math.sin(f.phase * 1.4) * dt * 10;
          f.opacity = Math.max(0, f.opacity - dt * 0.5);
        } else {
          f.opacity = Math.min(1, f.opacity + dt * 0.6);
          if (!reduced) {
            // Wander via layered sine noise for organic, non-repetitive paths.
            const t = now / 1000;
            f.vx += Math.sin(t * 0.7 * f.speed + f.seed) * dt * 26;
            f.vy += Math.cos(t * 0.53 * f.speed + f.seed * 1.7) * dt * 26;

            // Gentle separation so they do not clump.
            for (let j = 0; j < list.length; j++) {
              if (j === i) continue;
              const o = list[j];
              if (!o || o.state !== "in") continue;
              const dx = f.x - o.x;
              const dy = f.y - o.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 324 && d2 > 0.001) {
                const d = Math.sqrt(d2);
                f.vx += (dx / d) * dt * 90;
                f.vy += (dy / d) * dt * 90;
              }
            }

            // Tap ripple: nearby fireflies scatter, then settle back.
            const rp = ripple.current;
            if (rp && now - rp.t < 900) {
              const dx = f.x - rp.x;
              const dy = f.y - rp.y;
              const d = Math.hypot(dx, dy) || 1;
              if (d < 70) f.vx += (dx / d) * dt * 320 * (1 - d / 70);
              if (d < 70) f.vy += (dy / d) * dt * 320 * (1 - d / 70);
            }

            // Keep them inside the glass.
            const nx = (f.x - BOUNDS.cx) / BOUNDS.rx;
            const ny = (f.y - BOUNDS.cy) / BOUNDS.ry;
            const rad = Math.hypot(nx, ny);
            if (rad > 0.82) {
              const pull = (rad - 0.82) * 220;
              f.vx -= (nx / (rad || 1)) * dt * pull;
              f.vy -= (ny / (rad || 1)) * dt * pull;
            }

            const damp = Math.pow(0.42, dt);
            f.vx *= damp;
            f.vy *= damp;
            const sp = Math.hypot(f.vx, f.vy);
            const max = 22 * f.speed;
            if (sp > max) {
              f.vx = (f.vx / sp) * max;
              f.vy = (f.vy / sp) * max;
            }
            f.x += f.vx * dt;
            f.y += f.vy * dt;
          }
        }

        const node = nodes.current[i];
        if (node) {
          const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(f.phase * 2.1 + f.seed));
          node.setAttribute("transform", `translate(${f.x.toFixed(2)} ${f.y.toFixed(2)})`);
          node.style.opacity = String(f.opacity * (reduced ? 0.85 : pulse));
        }
      }

      // Drop fully faded fireflies (keeps slot indices stable enough).
      if (list.some((f) => f.state === "out" && f.opacity <= 0)) {
        flies.current = list.filter((f) => !(f.state === "out" && f.opacity <= 0));
        nodes.current.forEach((n) => {
          if (n) n.style.opacity = "0";
        });
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const handleTap = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    if (!point) return;
    const x = ((point.clientX - rect.left) / rect.width) * 200;
    const y = ((point.clientY - rect.top) / rect.height) * 240;
    ripple.current = { x, y, t: performance.now() };
    setRippleKey((k) => k + 1);
  };

  return (
    <svg
      viewBox="0 0 200 240"
      className="mx-auto block w-full max-w-[260px] cursor-pointer select-none"
      role="img"
      aria-label={`${days} days no contact. Today is ${Math.round(progress * 100)}% complete.`}
      onPointerDown={handleTap as unknown as React.MouseEventHandler<SVGSVGElement>}
    >
      <defs>
        <radialGradient id={`${glowId}-body`} cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#f2fbf3" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#dcefe0" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id={`${glowId}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#ffdf8a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffd873" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${glowId}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c79a63" />
          <stop offset="100%" stopColor="#9d7442" />
        </linearGradient>
        <clipPath id={`${glowId}-clip`}>
          <ellipse cx={BOUNDS.cx} cy={BOUNDS.cy} rx={BOUNDS.rx} ry={BOUNDS.ry} />
        </clipPath>
      </defs>

      {/* ambient warmth that grows with the day */}
      <ellipse
        cx={BOUNDS.cx}
        cy={BOUNDS.cy}
        rx={BOUNDS.rx * 1.5}
        ry={BOUNDS.ry * 1.4}
        fill={`url(#${glowId}-halo)`}
        opacity={0.15 + progress * 0.5}
        className={reduced ? undefined : "ff-breathe"}
      />

      {/* lid */}
      <rect x="66" y="26" width="68" height="26" rx="8" fill={`url(#${glowId}-lid)`} />
      <rect x="72" y="20" width="56" height="12" rx="6" fill="#b98a55" />

      {/* neck */}
      <path d="M76 50h48v14c0 4-4 6-8 8H84c-4-2-8-4-8-8V50Z" fill="#e6f2e8" opacity="0.85" />

      {/* glass body */}
      <ellipse
        cx={BOUNDS.cx}
        cy={BOUNDS.cy}
        rx={BOUNDS.rx}
        ry={BOUNDS.ry}
        fill={`url(#${glowId}-body)`}
        stroke="#bcd9c3"
        strokeWidth="2"
      />

      <g clipPath={`url(#${glowId}-clip)`}>
        {slots.map((i) => (
          <g
            key={i}
            ref={(el) => {
              nodes.current[i] = el;
            }}
            style={{ opacity: 0 }}
          >
            <circle r="9" fill={`url(#${glowId}-halo)`} />
            <circle r="2.2" fill="#fff6d0" />
            <circle r="1.1" fill="#ffffff" />
          </g>
        ))}

        {/* tap ripple on the glass */}
        {ripple.current ? (
          <circle
            key={rippleKey}
            cx={ripple.current.x}
            cy={ripple.current.y}
            r="6"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="ff-ripple"
          />
        ) : null}
      </g>

      {/* highlight */}
      <path
        d="M70 100c-4 18-3 34 4 48"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.7"
        fill="none"
      />

      {/* counter inside the jar */}
      <g pointerEvents="none">
        <ellipse cx={BOUNDS.cx} cy={BOUNDS.cy - 2} rx="46" ry="34" fill="#ffffff" opacity="0.55" />
        <text
          x={BOUNDS.cx}
          y={BOUNDS.cy + 8}
          textAnchor="middle"
          className="fill-on-tint"
          style={{ fontSize: 54, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          {days}
        </text>
        <text
          x={BOUNDS.cx}
          y={BOUNDS.cy + 32}
          textAnchor="middle"
          className="fill-on-tint"
          style={{ fontSize: 15, fontWeight: 500, opacity: 0.75 }}
        >
          {days === 1 ? "Day" : "Days"}
        </text>
      </g>
    </svg>
  );
}
