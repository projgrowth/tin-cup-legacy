import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";

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
const MAX_SCALE = 4;

type PointerSample = { id: number; x: number; y: number };

function distance(a: PointerSample, b: PointerSample) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: PointerSample, b: PointerSample) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function HoleMap({
  hole,
  className,
  fullscreen = false,
  onToggleFullscreen,
  overlay,
  onSwipeHole,
}: {
  hole: Hole;
  className?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Optional overlay badges rendered above the map chrome */
  overlay?: ReactNode;
  /** Horizontal swipe beyond threshold changes hole (±1) */
  onSwipeHole?: (delta: -1 | 1) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const shellRef = useRef<HTMLDivElement>(null);
  const pointers = useRef<Map<number, PointerSample>>(new Map());
  const pinch = useRef<{
    startDist: number;
    startScale: number;
    startMid: { x: number; y: number };
    startOffset: { x: number; y: number };
  } | null>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

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

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(s.toFixed(3))));

  const zoom = useCallback((delta: number) => {
    setScale((s) => clampScale(s + delta));
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleFullscreen?.();
      if (e.key === "+" || e.key === "=") zoom(0.35);
      if (e.key === "-" || e.key === "_") zoom(-0.35);
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, onToggleFullscreen, zoom, reset]);

  function syncPointer(e: ReactPointerEvent) {
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    syncPointer(e);
    const pts = [...pointers.current.values()];

    if (pts.length === 2) {
      drag.current = null;
      const [a, b] = pts;
      pinch.current = {
        startDist: Math.max(1, distance(a, b)),
        startScale: scale,
        startMid: midpoint(a, b),
        startOffset: { ...offset },
      };
      swipe.current = null;
      return;
    }

    if (scale > 1) {
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y,
        moved: false,
      };
    } else {
      swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    syncPointer(e);
    const pts = [...pointers.current.values()];

    if (pts.length >= 2 && pinch.current) {
      const [a, b] = pts;
      const dist = Math.max(1, distance(a, b));
      const nextScale = clampScale(pinch.current.startScale * (dist / pinch.current.startDist));
      const mid = midpoint(a, b);
      setScale(nextScale);
      setOffset({
        x: pinch.current.startOffset.x + (mid.x - pinch.current.startMid.x),
        y: pinch.current.startOffset.y + (mid.y - pinch.current.startMid.y),
      });
      return;
    }

    const d = drag.current;
    if (d && d.pointerId === e.pointerId) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.hypot(dx, dy) > 4) d.moved = true;
      setOffset({
        x: d.originX + dx,
        y: d.originY + dy,
      });
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const wasDrag = drag.current;
    const swipeStart = swipe.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (wasDrag?.pointerId === e.pointerId) drag.current = null;

    // Double-tap to zoom toward tap (or reset if zoomed)
    if (!wasDrag?.moved && pointers.current.size === 0) {
      const now = Date.now();
      const prev = lastTap.current;
      if (prev && now - prev.t < 280 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 36) {
        lastTap.current = null;
        if (scale > 1.05) {
          reset();
        } else {
          setScale(2.2);
        }
        swipe.current = null;
        return;
      }
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }

    // Horizontal swipe to change hole when not zoomed
    if (scale <= 1.05 && swipeStart && onSwipeHole && pointers.current.size === 0) {
      const dx = e.clientX - swipeStart.x;
      const dy = e.clientY - swipeStart.y;
      const dt = Date.now() - swipeStart.t;
      if (dt < 450 && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        onSwipeHole(dx < 0 ? 1 : -1);
      }
    }
    swipe.current = null;
  }

  const mapSvg = (
    <svg
      viewBox={`0 0 ${hole.w} ${hole.ht}`}
      className="block size-full bg-transparent"
      role="img"
      aria-label={`Overhead diagram of hole ${hole.h}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`rough-glow-${hole.h}`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="oklch(0.26 0.04 155)" />
          <stop offset="100%" stopColor="var(--turf-rough)" />
        </radialGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={hole.w}
        height={hole.ht}
        fill={`url(#rough-glow-${hole.h})`}
        rx={18}
      />
      {layers.map(({ kind, i, d }) => (
        <path
          key={`${kind}-${i}`}
          d={d}
          fill={FILL[kind]}
          stroke="var(--turf-stroke)"
          strokeWidth={kind === "gr" || kind === "wa" ? 2.5 : 1.75}
          strokeLinejoin="round"
        />
      ))}
      <polyline
        points={line.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={4.5}
        strokeDasharray="16 10"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Tee mark */}
      <circle cx={tee[0]} cy={tee[1]} r={11} fill="var(--gold-light)" />
      <circle cx={tee[0]} cy={tee[1]} r={4} fill="var(--background)" opacity={0.85} />
      {/* Green target */}
      <circle
        cx={green[0]}
        cy={green[1]}
        r={16}
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth={3.5}
        opacity={0.95}
      />
      <circle cx={green[0]} cy={green[1]} r={5} fill="var(--gold-light)" opacity={0.9} />
    </svg>
  );

  const ctrlBtn =
    "press flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/55 text-foreground shadow-lg backdrop-blur-md disabled:opacity-35";

  const controls = (
    <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => zoom(-0.4)}
        disabled={scale <= MIN_SCALE}
        className={ctrlBtn}
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => zoom(0.4)}
        disabled={scale >= MAX_SCALE}
        className={ctrlBtn}
      >
        <Plus className="size-4" />
      </button>
      <button type="button" aria-label="Reset map view" onClick={reset} className={ctrlBtn}>
        <RotateCcw className="size-4" />
      </button>
      {onToggleFullscreen ? (
        <button
          type="button"
          aria-label={fullscreen ? "Exit full screen" : "Full screen map"}
          onClick={onToggleFullscreen}
          className={ctrlBtn}
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      ) : null}
    </div>
  );

  const stage = (
    <div
      ref={shellRef}
      className={`relative overflow-hidden ${className ?? ""} ${fullscreen ? "size-full" : ""}`}
    >
      {overlay}
      <div
        className="size-full touch-none select-none"
        style={{
          cursor: scale > 1 ? "grab" : "default",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: drag.current || pinch.current ? undefined : "transform 140ms ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {mapSvg}
      </div>
      {controls}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-background"
        role="dialog"
        aria-modal="true"
        aria-label={`Full screen map, hole ${hole.h}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="t-section text-foreground">Hole {hole.h}</p>
            <p className="t-micro text-muted-foreground">
              {hole.name ?? `Par ${hole.par}`} · pinch to zoom
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="press btn-quiet t-body !min-h-11 !px-4"
          >
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">{stage}</div>
      </div>
    );
  }

  return stage;
}
