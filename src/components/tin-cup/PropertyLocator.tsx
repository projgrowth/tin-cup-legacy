import { useNavigate } from "@tanstack/react-router";

import { COURSE_LABEL, type CourseId } from "@/lib/courses";

const HITS: Array<{
  id: CourseId;
  top: string;
  left: string;
  width: string;
  height: string;
}> = [
  { id: "island", top: "18%", left: "36%", width: "30%", height: "28%" },
  { id: "south", top: "56%", left: "10%", width: "34%", height: "30%" },
  { id: "copperhead", top: "42%", left: "66%", width: "32%", height: "40%" },
];

/** Official resort map — three playable courses, not a cartoon or a legend. */
export function PropertyLocator({ courseId }: { courseId: CourseId }) {
  const navigate = useNavigate();

  const go = (id: CourseId) => {
    void navigate({ to: "/schedule", search: { course: id }, replace: true });
  };

  return (
    <div className="mt-2">
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: "4 / 3" }}
      >
        <img
          src="/innisbrook-property.jpg"
          alt="Innisbrook property — tap South, Copperhead, or Island"
          className="absolute inset-0 h-full w-full object-cover object-[center_top]"
        />

        {HITS.map((r) => {
          const on = r.id === courseId;
          return (
            <button
              key={r.id}
              type="button"
              className="absolute cursor-pointer rounded-lg bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-hunter/70"
              style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
              aria-label={`${COURSE_LABEL[r.id]} · jump to that day’s program`}
              aria-current={on ? "true" : undefined}
              onClick={() => go(r.id)}
            >
              {on ? (
                <span className="pointer-events-none absolute inset-1 rounded-md ring-1 ring-hunter" />
              ) : null}
              <span
                className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                  on
                    ? "bg-white text-black"
                    : "bg-black/35 text-white/90"
                }`}
              >
                {COURSE_LABEL[r.id]}
              </span>
            </button>
          );
        })}

        <span className="pointer-events-none absolute left-[48%] top-[66%] whitespace-nowrap rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white/90">
          Salamander
        </span>
        <span className="pointer-events-none absolute left-[70%] top-[46%] whitespace-nowrap rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white/90">
          Packard's
        </span>
      </div>
    </div>
  );
}
