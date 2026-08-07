import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import type { Hole, HoleFeature } from "@/lib/courses";

const FILL: Record<HoleFeature["k"], string> = {
  fw: "var(--turf-fairway)",
  gr: "var(--turf-green)",
  tee: "var(--turf-tee)",
  bk: "var(--turf-bunker)",
  wa: "var(--turf-water)",
};

// Painted back-to-front so bunkers and water read on top of the turf.
const ORDER: HoleFeature["k"][] = ["fw", "tee", "gr", "wa", "bk"];

function toPath(points: [number, number][]) {
  return `${points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")} Z`;
}

const MIN_SCALE = 1;
const MAX_SCALE = 2.6;

export function HoleMap({ hole, className }: { hole: Hole; className?: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Reset view when the hole changes.
  const holeKey = `${hole.h}-${hole.w}-${hole.ht}`;
  const [prevKey, setPrevKey] = useState(holeKey);
  if (prevKey !== holeKey) {
    setPrevKey(holeKey);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  const layers = ORDER.flatMap((kind) =>
    hole.f.filter((f) => f.k === kind).map((f, i) => ({ kind, i, d: toPath(f.p) })),
  );

  const line = hole.line;
  const tee = line[0];
  const green = line[line.length - 1];

  const zoom = useCallback((delta: number) => {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((s + delta).toFixed(2)))));
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (scale <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    setOffset({
      x: d.originX + (e.clientX - d.startX),
      y: d.originY + (e.clientY - d.startY),
    });
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div
        className="size-full touch-none select-none"
        style={{
          cursor: scale > 1 ? "grab" : "default",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: drag.current ? undefined : "transform 160ms ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
      >
        <svg
          viewBox={`0 0 ${hole.w} ${hole.ht}`}
          className="block size-full bg-transparent"
          role="img"
          aria-label={`Overhead diagram of hole ${hole.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={hole.w} height={hole.ht} fill="var(--turf-rough)" rx={14} />
          {layers.map(({ kind, i, d }) => (
            <path
              key={`${kind}-${i}`}
              d={d}
              fill={FILL[kind]}
              stroke="oklch(0 0 0 / 22%)"
              strokeWidth={2}
            />
          ))}
          <polyline
            points={line.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={5}
            strokeDasharray="14 12"
            strokeLinecap="round"
            opacity={0.85}
          />
          <circle cx={tee[0]} cy={tee[1]} r={13} fill="var(--gold-light)" />
          <circle
            cx={green[0]}
            cy={green[1]}
            r={13}
            fill="none"
            stroke="var(--gold-light)"
            strokeWidth={5}
          />
        </svg>
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1.5">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoom(-0.35)}
          disabled={scale <= MIN_SCALE}
          className="press flex size-10 items-center justify-center rounded-lg border border-border bg-background/85 text-foreground backdrop-blur-sm disabled:opacity-35"
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoom(0.35)}
          disabled={scale >= MAX_SCALE}
          className="press flex size-10 items-center justify-center rounded-lg border border-border bg-background/85 text-foreground backdrop-blur-sm disabled:opacity-35"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Reset map view"
          onClick={reset}
          className="press flex size-10 items-center justify-center rounded-lg border border-border bg-background/85 text-foreground backdrop-blur-sm"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
