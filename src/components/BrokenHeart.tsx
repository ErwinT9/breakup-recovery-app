type Props = {
  className?: string;
  animate?: boolean;
};

const HALF = "M50 92C26 74 10 60 10 41 10 26 21 15 34 15c9 0 15 5 16 9V92Z";

/** Two heart halves that drift apart — used on the splash screen. */
export function BrokenHeart({ className, animate = false }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Broken heart mark"
      fill="none"
    >
      <defs>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-glow)" />
        </linearGradient>
      </defs>
      <g
        style={
          animate
            ? { animation: "crack-left 2.4s var(--ease-native) 0.7s forwards", transformOrigin: "50% 60%" }
            : undefined
        }
      >
        <path d={HALF} fill="url(#heartGrad)" />
      </g>
      <g
        transform="scale(-1,1) translate(-100,0)"
        style={
          animate
            ? { animation: "crack-right 2.4s var(--ease-native) 0.7s forwards", transformOrigin: "50% 60%" }
            : undefined
        }
      >
        <path d={HALF} fill="url(#heartGrad)" opacity="0.85" />
      </g>
    </svg>
  );
}