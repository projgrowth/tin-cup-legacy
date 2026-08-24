import { useNavigate } from "@tanstack/react-router";

import { COURSE_LABEL, type CourseId } from "@/lib/courses";

const REGIONS: Array<{
  id: CourseId;
  d: string;
  lx: number;
  ly: number;
}> = [
  {
    id: "south",
    d: "M18 118 C28 96 52 88 78 94 C98 98 118 112 122 132 C124 148 108 162 82 166 C48 172 22 154 18 118 Z",
    lx: 62,
    ly: 128,
  },
  {
    id: "copperhead",
    d: "M168 42 C198 36 232 48 248 78 C262 108 252 148 228 168 C198 192 162 186 148 158 C132 122 138 52 168 42 Z",
    lx: 198,
    ly: 108,
  },
  {
    id: "island",
    d: "M88 28 C112 18 142 24 154 48 C164 70 150 92 124 98 C96 104 72 86 70 62 C68 42 76 32 88 28 Z",
    lx: 112,
    ly: 58,
  },
];

/** Compact paper/hunter locator — three playable courses, not a resort legend. */
export function PropertyLocator({ courseId }: { courseId: CourseId }) {
  const navigate = useNavigate();

  return (
    <div className="mt-2">
      <svg
        viewBox="0 0 280 188"
        role="img"
        aria-label="Innisbrook: tap South, Copperhead, or Island"
        className="w-full max-w-md text-hunter"
      >
        <rect width="280" height="188" rx="14" fill="oklch(0.96 0.012 95)" />
        <path
          d="M36 78 C70 70 96 78 118 102"
          fill="none"
          stroke="oklch(0.34 0.055 155 / 18%)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {REGIONS.map((r) => {
          const on = r.id === courseId;
          return (
            <g
              key={r.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none"
              aria-label={`${COURSE_LABEL[r.id]} · jump to that day’s program`}
              aria-current={on ? "true" : undefined}
              onClick={() =>
                void navigate({ to: "/schedule", search: { course: r.id }, replace: true })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void navigate({ to: "/schedule", search: { course: r.id }, replace: true });
                }
              }}
            >
              <path
                d={r.d}
                fill={on ? "oklch(0.34 0.055 155 / 28%)" : "oklch(0.34 0.055 155 / 10%)"}
                stroke={on ? "oklch(0.34 0.055 155)" : "oklch(0.34 0.055 155 / 45%)"}
                strokeWidth={on ? 2.4 : 1.4}
              />
              <text
                x={r.lx}
                y={r.ly}
                textAnchor="middle"
                fill="oklch(0.28 0.04 155)"
                fontSize={r.id === "copperhead" ? 11 : 10}
                fontWeight={on ? 700 : 600}
                letterSpacing="0.04em"
                className="pointer-events-none"
              >
                {COURSE_LABEL[r.id]}
              </text>
            </g>
          );
        })}

        <circle cx="126" cy="104" r="2.6" fill="oklch(0.34 0.055 155 / 70%)" />
        <circle cx="138" cy="116" r="2.6" fill="oklch(0.34 0.055 155 / 70%)" />
        {courseId === "south" ? (
          <text x="132" y="102" fill="oklch(0.34 0.04 155 / 70%)" fontSize="8" fontWeight="600">
            Salamander Grille
          </text>
        ) : null}
        {courseId === "copperhead" ? (
          <text x="144" y="120" fill="oklch(0.34 0.04 155 / 70%)" fontSize="8" fontWeight="600">
            Packard's Steakhouse
          </text>
        ) : null}
      </svg>
    </div>
  );
}
