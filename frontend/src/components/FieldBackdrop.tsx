const ROWS = Array.from({ length: 17 }, (_, i) => i - 8)

/** Soft farmland horizon behind the page: rolling fields, crop rows and a low sun. */
export function FieldBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[46vh] min-h-[280px]">
      <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" className="size-full">
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="fade-mask">
            <rect width="1440" height="420" fill="url(#fade)" />
          </mask>
        </defs>
        <g mask="url(#fade-mask)">
          <circle cx="1130" cy="190" r="70" fill="#c2964a" opacity="0.12" />
          <path d="M0 250 C240 200 480 235 720 215 S1200 180 1440 230 V420 H0 Z" fill="#dbe7d0" opacity="0.75" />
          <path d="M0 300 C300 255 620 305 900 275 S1300 255 1440 290 V420 H0 Z" fill="#cddfbf" opacity="0.7" />
          <path d="M0 345 C360 315 760 350 1080 325 S1360 320 1440 335 V420 H0 Z" fill="#e8dcbd" opacity="0.6" />
          {ROWS.map((k) => (
            <path
              key={k}
              d={`M${720 + k * 190} 420 Q${720 + k * 70} 350 ${720 + k * 28} 300`}
              fill="none"
              stroke="#9fbb8a"
              strokeWidth="1.3"
              opacity="0.45"
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
