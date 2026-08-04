import { useEffect, useMemo, useRef, useState } from "react";

const MAX_FIREFLIES = 30;

/** Jar interior bounds in SVG user units (viewBox 0 0 260 190). */
const IN = { x0: 64, x1: 196, y0: 74, y1: 158 };
const CX = (IN.x0 + IN.x1) / 2;
const CY = (IN.y0 + IN.y1) / 2;

/** Cute round goldfish bowl: flared rim, open top, fat belly, small foot. */
const JAR_PATH =
  "M88 52 C60 66 44 90 44 116 C44 152 82 176 130 176 C178 176 216 152 216 116 C216 90 200 66 172 52 A42 10 0 0 1 88 52 Z";
const INNER_PATH =
  "M93 59 C68 72 52 94 52 116 C52 148 87 169 130 169 C173 169 208 148 208 116 C208 94 192 72 167 59 A37 8 0 0 1 93 59 Z";

type Fly = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  bright: number;
  phase: number;
  flicker: number;
  speed: number;
  seed: number;
  state: "in" | "out";
  opacity: number;
  pause: number;
  nextPause: number;
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
  return {
    id,
    x: IN.x0 + 12 + Math.random() * (IN.x1 - IN.x0 - 24),
    y: IN.y0 + 12 + Math.random() * (IN.y1 - IN.y0 - 24),
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    r: 1.0 + Math.random() * 1.0,
    bright: 0.72 + Math.random() * 0.28,
    phase: Math.random() * Math.PI * 2,
    flicker: 0.8 + Math.random() * 1.9,
    speed: 0.55 + Math.random() * 0.65,
    seed: Math.random() * 1000,
    state: "in",
    opacity: 0,
    pause: 0,
    nextPause: 3 + Math.random() * 7,
  };
}

/**
 * Illustrated transparent glass jar whose fireflies represent progress through
 * the current day. All motion lives in one rAF loop mutating DOM directly.
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
  // Slightly front-loaded curve so the jar feels alive early and rich by night.
  const target = Math.max(
    reduced ? 2 : 0,
    Math.round(Math.pow(progress, 0.85) * MAX_FIREFLIES),
  );

  const flies = useRef<Fly[]>([]);
  const nodes = useRef<Array<SVGGElement | null>>([]);
  const targetRef = useRef(target);
  const ripple = useRef<{ x: number; y: number; t: number } | null>(null);
  const nextId = useRef(0);
  const [slots] = useState(() => Array.from({ length: MAX_FIREFLIES }, (_, i) => i));
  const [rippleKey, setRippleKey] = useState(0);

  targetRef.current = target;

  const uid = useMemo(() => `ffj-${Math.random().toString(36).slice(2, 8)}`, []);

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

      if (accum > 0.35) {
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
          f.y -= dt * 22;
          f.x += Math.sin(f.phase * 1.4) * dt * 10;
          f.opacity = Math.max(0, f.opacity - dt * 0.5);
        } else {
          f.opacity = Math.min(1, f.opacity + dt * 0.6);
          if (!reduced) {
            const t = now / 1000;
            // occasional brief hover-pause before changing direction
            f.nextPause -= dt;
            if (f.nextPause <= 0) {
              f.pause = 0.5 + Math.random() * 1.1;
              f.nextPause = 4 + Math.random() * 8;
            }
            if (f.pause > 0) {
              f.pause -= dt;
              f.vx *= Math.pow(0.06, dt);
              f.vy *= Math.pow(0.06, dt);
            } else {
              f.vx += Math.sin(t * 0.7 * f.speed + f.seed) * dt * 26;
              f.vy += Math.cos(t * 0.53 * f.speed + f.seed * 1.7) * dt * 26;
              f.vx += Math.sin(t * 0.19 + f.seed * 0.7) * dt * 12;
              f.vy += Math.cos(t * 0.23 + f.seed * 1.3) * dt * 12;
            }

            for (let j = 0; j < list.length; j++) {
              if (j === i) continue;
              const o = list[j];
              if (!o || o.state !== "in") continue;
              const dx = f.x - o.x;
              const dy = f.y - o.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < 400 && d2 > 0.001) {
                const d = Math.sqrt(d2);
                f.vx += (dx / d) * dt * 90;
                f.vy += (dy / d) * dt * 90;
              }
            }

            const rp = ripple.current;
            if (rp && now - rp.t < 900) {
              const dx = f.x - rp.x;
              const dy = f.y - rp.y;
              const d = Math.hypot(dx, dy) || 1;
              if (d < 70) {
                f.vx += (dx / d) * dt * 300 * (1 - d / 70);
                f.vy += (dy / d) * dt * 300 * (1 - d / 70);
              }
            }

            // Keep inside the straight-sided glass.
            const pad = 10;
            if (f.x < IN.x0 + pad) f.vx += (IN.x0 + pad - f.x) * dt * 26;
            if (f.x > IN.x1 - pad) f.vx -= (f.x - (IN.x1 - pad)) * dt * 26;
            if (f.y < IN.y0 + pad) f.vy += (IN.y0 + pad - f.y) * dt * 26;
            if (f.y > IN.y1 - pad) f.vy -= (f.y - (IN.y1 - pad)) * dt * 26;

            const damp = Math.pow(0.42, dt);
            f.vx *= damp;
            f.vy *= damp;
            const sp = Math.hypot(f.vx, f.vy);
            const max = 20 * f.speed;
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
          const flick =
            0.55 +
            0.3 * (0.5 + 0.5 * Math.sin(f.phase * f.flicker + f.seed)) +
            0.15 * (0.5 + 0.5 * Math.sin(f.phase * f.flicker * 2.7 + f.seed * 0.3));
          node.setAttribute(
            "transform",
            `translate(${f.x.toFixed(2)} ${f.y.toFixed(2)}) scale(${f.r.toFixed(2)})`,
          );
          node.style.opacity = String(f.opacity * f.bright * (reduced ? 0.9 : flick));
        }
      }

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
    const x = ((point.clientX - rect.left) / rect.width) * 260;
    const y = ((point.clientY - rect.top) / rect.height) * 190;
    ripple.current = { x, y, t: performance.now() };
    setRippleKey((k) => k + 1);
  };

  return (
    <svg
      viewBox="0 0 260 190"
      className="mx-auto -my-2 block w-full max-w-[300px] cursor-pointer select-none"
      role="img"
      aria-label={`${days} days no contact. Today is ${Math.round(progress * 100)}% complete.`}
      onPointerDown={handleTap as unknown as React.MouseEventHandler<SVGSVGElement>}
    >
      <defs>
        {/* barely-there glass tint with a cool blue lean */}
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#dbe6f0" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="75%" stopColor="#e8f0f7" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#c9d8e6" stopOpacity="0.20" />
        </linearGradient>
                <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffedb4" stopOpacity="1" />
          <stop offset="30%" stopColor="#ffdf90" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffd873" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#ffcf5c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-ambient`} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#ffe6a0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffe6a0" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={INNER_PATH} />
        </clipPath>
      </defs>

      {/* accumulated warmth from the fireflies (never from the glass itself) */}
      <ellipse
        cx={CX}
        cy={CY}
        rx="92"
        ry="70"
        fill={`url(#${uid}-ambient)`}
        opacity={0.1 + progress * 0.45}
      />

      {/* small glass foot under the bowl */}
      <path d="M112 170h36l4 10h-44l4-10Z" fill="#dbe6f0" opacity="0.35" />
      <ellipse cx={CX} cy="181" rx="26" ry="4.5" fill="#c9d8e6" opacity="0.45" />

      {/* glass body */}
      <path d={JAR_PATH} fill={`url(#${uid}-glass)`} stroke="#a9b7c4" strokeWidth="2.2" strokeLinejoin="round" />
      {/* inner wall line — reads as glass thickness */}
      <path d={INNER_PATH} fill="none" stroke="#c6d3de" strokeWidth="1.1" opacity="0.75" />
      {/* flared rim of the bowl */}
      <ellipse cx={CX} cy="52" rx="42" ry="10" fill="#eaf2f9" fillOpacity="0.28" stroke="#a9b7c4" strokeWidth="2.2" />
      <ellipse cx={CX} cy="52" rx="36" ry="7.5" fill="none" stroke="#c6d3de" strokeWidth="1.1" opacity="0.8" />
      {/* water line */}
      <path d="M60 92c22 9 46 13 70 13s48-4 70-13" stroke="#bcd6e8" strokeWidth="1.4" opacity="0.55" fill="none" />

      <g clipPath={`url(#${uid}-clip)`}>
        {slots.map((i) => (
          <g
            key={i}
            ref={(el) => {
              nodes.current[i] = el;
            }}
            style={{ opacity: 0 }}
          >
            <circle r="18" fill={`url(#${uid}-halo)`} opacity="0.55" />
            <circle r="9" fill={`url(#${uid}-halo)`} />
            <ellipse cx="-1.8" cy="0" rx="2.1" ry="1.3" fill="#8a7a55" opacity="0.45" />
            <circle r="2.4" cx="1.2" fill="#fff6cf" />
            <circle r="1.1" cx="1.2" fill="#ffffff" />
          </g>
        ))}

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

      {/* soft glass highlights */}
      <path
        d="M67 96c-9 15-10 33-3 47"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      <path
        d="M80 90c-8 12-11 24-9 36"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
        fill="none"
      />
      <path
        d="M196 104c6 14 5 30-3 42"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.28"
        fill="none"
      />

      {/* counter inside the jar — always in front of the fireflies */}
      <g pointerEvents="none">
        <text
          x={CX}
          y={CY + 6}
          textAnchor="middle"
          className="fill-on-tint"
          style={{ fontSize: 48, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          {days}
        </text>
        <text
          x={CX}
          y={CY + 27}
          textAnchor="middle"
          className="fill-on-tint"
          style={{ fontSize: 15, fontWeight: 500, opacity: 0.7 }}
        >
          {days === 1 ? "Day" : "Days"}
        </text>
      </g>
    </svg>
  );
}
