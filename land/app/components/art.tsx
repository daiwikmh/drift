/* Engraved/topographic sphere — recreates the line-art globe motif.
   Pure SVG so it scales crisply and can be tinted ink or lime. */
export function EngravedSphere({
  size = 320,
  stroke = "var(--ink)",
  lines = 34,
  className = "",
}: {
  size?: number;
  stroke?: string;
  lines?: number;
  className?: string;
}) {
  const r = 50;
  const cx = 50;
  const cy = 50;
  const f = (n: number) => n.toFixed(2);
  const paths: string[] = [];
  for (let i = 1; i < lines; i++) {
    const y = cy - r + (i / lines) * 2 * r;
    const half = Math.sqrt(Math.max(r * r - (y - cy) ** 2, 0));
    const x0 = cx - half;
    const x1 = cx + half;
    // contour wobble so it reads as a carved 3D surface
    const amp = half * 0.18;
    const wob = Math.sin(i * 0.9) * 3;
    paths.push(
      `M ${f(x0)} ${f(y + wob)} C ${f(cx - half / 2)} ${f(y - amp + wob)}, ${f(cx + half / 2)} ${f(y + amp + wob)}, ${f(x1)} ${f(y + wob)}`,
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id="sphereClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <g clipPath="url(#sphereClip)" fill="none" stroke={stroke} strokeWidth={0.5}>
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={0.5}
        opacity={0.5}
      />
    </svg>
  );
}

/* A flatter engraved disc, tilted — used in "Built for every layer". */
export function EngravedDisc({
  size = 260,
  stroke = "var(--ink)",
  className = "",
}: {
  size?: number;
  stroke?: string;
  className?: string;
}) {
  const lines: string[] = [];
  for (let i = 0; i < 26; i++) {
    const y = (18 + i * 2.4).toFixed(2);
    const yMid = (18 + i * 2.4 - 7).toFixed(2);
    lines.push(`M 14 ${y} Q 50 ${yMid} 86 ${y}`);
  }
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id="discClip">
          <ellipse cx="50" cy="50" rx="40" ry="30" />
        </clipPath>
      </defs>
      <g
        clipPath="url(#discClip)"
        fill="none"
        stroke={stroke}
        strokeWidth={0.5}
        transform="rotate(-18 50 50)"
      >
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <ellipse
        cx="50"
        cy="50"
        rx="40"
        ry="30"
        fill="none"
        stroke={stroke}
        strokeWidth={0.5}
        opacity={0.5}
        transform="rotate(-18 50 50)"
      />
    </svg>
  );
}

/* Corner brackets used around the stat blocks. */
export function Brackets({ className = "" }: { className?: string }) {
  return (
    <>
      <span className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${className}`} />
      <span className={`pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t ${className}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l ${className}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${className}`} />
    </>
  );
}
