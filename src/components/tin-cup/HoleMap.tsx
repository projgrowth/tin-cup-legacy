import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";

import type { Hole, HoleFeature } from "@/lib/courses";
import {
  FEATURE_PAINT_ORDER,
  lineStations,
  lineTangentAt,
  paddedViewBox,
  polygonPath,
  polylineLength,
  smoothOpenPolyline,
} from "@/lib/hole-geometry";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type PointerSample = { id: number; x: number; y: number };

function distance(a: PointerSample, b: PointerSample) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: PointerSample, b: PointerSample) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function strokeFor(kind: HoleFeature["k"]): { width: number; color: string } {
  switch (kind) {
    case "gr":
      return { width: 2.2, color: "var(--turf-collar)" };
    case "wa":
      return { width: 2.4, color: "var(--turf-water-deep)" };
    case "bk":
      return { width: 2.0, color: "var(--turf-bunker-lip)" };
    case "tee":
      return { width: 1.6, color: "var(--turf-stroke)" };
    default:
      return { width: 1.4, color: "var(--turf-fairway-edge)" };
  }
}

/**
 * Premium schematic hole map — smoothed OSM outlines with layered turf paint.
 * Not a rangefinder / satellite map; Black yards drive line ticks only.
 */
export function HoleMap({
  hole,
  className,
  fullscreen = false,
  onToggleFullscreen,
  overlay,
  onSwipeHole,
  controls = true,
}: {
  hole: Hole;
  className?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** Optional overlay badges rendered above the map chrome */
  overlay?: ReactNode;
  /** Horizontal swipe beyond threshold changes hole (±1) */
  onSwipeHole?: (delta: -1 | 1) => void;
  /** Zoom / reset orbs. Off in hole theater — pinch still works. */
  controls?: boolean;
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

  const uid = `h${hole.h}-${Math.round(hole.w)}-${Math.round(hole.ht)}`;
  const vb = useMemo(() => paddedViewBox(hole, 0.07), [hole]);
  const layers = useMemo(
    () =>
      FEATURE_PAINT_ORDER.flatMap((kind) =>
        hole.f
          .filter((f) => f.k === kind)
          .map((f, i) => ({
            kind,
            i,
            d: polygonPath(f.p, true, kind === "fw" || kind === "gr" ? 3 : 2),
          })),
      ),
    [hole],
  );

  const line = useMemo(() => smoothOpenPolyline(hole.line, 2), [hole.line]);
  const rawLine = hole.line;
  const tee = rawLine[0] ?? line[0];
  const green = rawLine[rawLine.length - 1] ?? line[line.length - 1];
  const stations = useMemo(() => lineStations(hole, 50), [hole]);
  const lineLen = useMemo(() => polylineLength(rawLine), [rawLine]);

  // Axial gradient endpoints from tee → green for fairway light direction
  const grad = useMemo(() => {
    if (!tee || !green) return { x1: 0, y1: 0, x2: 100, y2: 100 };
    return { x1: tee[0], y1: tee[1], x2: green[0], y2: green[1] };
  }, [tee, green]);

  const tickScale = Math.max(vb.width, vb.height) * 0.012;

  const clampScale = (s: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(s.toFixed(3))));

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
      if (
        prev &&
        now - prev.t < 280 &&
        Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 36
      ) {
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
      viewBox={vb.viewBox}
      className="block size-full bg-transparent"
      role="img"
      aria-label={`Schematic layout of hole ${hole.h}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`${uid}-rough`} cx="48%" cy="42%" r="72%">
          <stop offset="0%" stopColor="var(--turf-rough-mid)" />
          <stop offset="55%" stopColor="var(--turf-rough)" />
          <stop offset="100%" stopColor="oklch(0.11 0.025 155)" />
        </radialGradient>
        <linearGradient
          id={`${uid}-fw`}
          x1={grad.x1}
          y1={grad.y1}
          x2={grad.x2}
          y2={grad.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--turf-fairway-edge)" />
          <stop offset="40%" stopColor="var(--turf-fairway)" />
          <stop offset="100%" stopColor="var(--turf-fairway-light)" />
        </linearGradient>
        <radialGradient id={`${uid}-gr`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="var(--turf-green-light)" />
          <stop offset="70%" stopColor="var(--turf-green)" />
          <stop offset="100%" stopColor="var(--turf-collar)" />
        </radialGradient>
        <linearGradient id={`${uid}-wa`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--turf-water)" />
          <stop offset="100%" stopColor="var(--turf-water-deep)" />
        </linearGradient>
        <radialGradient id={`${uid}-bk`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--turf-bunker)" />
          <stop offset="100%" stopColor="var(--turf-bunker-deep)" />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="2.2"
            floodColor="oklch(0 0 0 / 35%)"
          />
        </filter>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern
          id={`${uid}-grain`}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="3" r="0.7" fill="oklch(0.55 0.04 80 / 25%)" />
          <circle cx="8" cy="7" r="0.55" fill="oklch(0.5 0.03 75 / 20%)" />
          <circle cx="5" cy="10" r="0.45" fill="oklch(0.6 0.04 90 / 18%)" />
        </pattern>
        <pattern
          id={`${uid}-noise`}
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="6" cy="10" r="1.2" fill="oklch(0.28 0.04 150 / 18%)" />
          <circle cx="22" cy="28" r="1" fill="oklch(0.12 0.02 155 / 22%)" />
          <circle cx="38" cy="14" r="1.4" fill="oklch(0.3 0.035 148 / 14%)" />
          <circle cx="14" cy="40" r="0.9" fill="oklch(0.14 0.02 160 / 20%)" />
        </pattern>
      </defs>

      {/* Rough plate + grain */}
      <rect
        x={vb.minX}
        y={vb.minY}
        width={vb.width}
        height={vb.height}
        fill={`url(#${uid}-rough)`}
        rx={Math.min(vb.width, vb.height) * 0.02}
      />
      <rect
        x={vb.minX}
        y={vb.minY}
        width={vb.width}
        height={vb.height}
        fill={`url(#${uid}-noise)`}
        opacity={0.85}
        rx={Math.min(vb.width, vb.height) * 0.02}
      />

      {/* Feature layers */}
      {layers.map(({ kind, i, d }) => {
        if (!d) return null;
        const stroke = strokeFor(kind);
        const fill =
          kind === "fw"
            ? `url(#${uid}-fw)`
            : kind === "gr"
              ? `url(#${uid}-gr)`
              : kind === "wa"
                ? `url(#${uid}-wa)`
                : kind === "bk"
                  ? `url(#${uid}-bk)`
                  : "var(--turf-tee)";
        return (
          <g key={`${kind}-${i}`}>
            <path
              d={d}
              fill={fill}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinejoin="round"
              filter={kind === "gr" || kind === "bk" ? `url(#${uid}-soft)` : undefined}
            />
            {kind === "bk" && (
              <path d={d} fill={`url(#${uid}-grain)`} stroke="none" opacity={0.9} />
            )}
            {kind === "gr" && (
              <path
                d={d}
                fill="none"
                stroke="var(--turf-green-light)"
                strokeWidth={stroke.width * 0.55}
                strokeLinejoin="round"
                opacity={0.55}
              />
            )}
          </g>
        );
      })}

      {/* Target line glow + dash */}
      {line.length >= 2 && (
        <g filter={`url(#${uid}-glow)`} opacity={0.95}>
          <polyline
            points={line.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="oklch(from var(--gold) l c h / 35%)"
            strokeWidth={tickScale * 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={line.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={tickScale * 0.55}
            strokeDasharray={`${tickScale * 2.2} ${tickScale * 1.4}`}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
          />
        </g>
      )}

      {/* Yard stations along Black-proportional line */}
      {stations.map((st) => {
        if (st.yardsFromTee === 0 || st.yardsToGreen < 1) return null;
        if (st.yardsFromTee % 50 !== 0) return null;
        // Skip labels too close to green end clutter
        if (st.yardsToGreen < 35) return null;
        const dist = (st.yardsFromTee / hole.yards) * lineLen;
        const { nx, ny } = lineTangentAt(rawLine, dist);
        const tick = tickScale * 1.1;
        const lx = st.x + nx * tick * 2.4;
        const ly = st.y + ny * tick * 2.4;
        const font = Math.max(11, tickScale * 2.6);
        return (
          <g key={`st-${st.yardsFromTee}`}>
            <line
              x1={st.x - nx * tick}
              y1={st.y - ny * tick}
              x2={st.x + nx * tick}
              y2={st.y + ny * tick}
              stroke="var(--gold-light)"
              strokeWidth={tick * 0.28}
              strokeLinecap="round"
              opacity={0.85}
            />
            <circle
              cx={st.x}
              cy={st.y}
              r={tick * 0.35}
              fill="var(--gold-light)"
              opacity={0.9}
            />
            <text
              x={lx}
              y={ly}
              fill="oklch(0.95 0.02 100)"
              fontSize={font}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ paintOrder: "stroke" }}
              stroke="oklch(0.1 0.02 155 / 70%)"
              strokeWidth={font * 0.18}
            >
              {st.yardsFromTee}
            </text>
          </g>
        );
      })}

      {/* Tee mark */}
      {tee && (
        <g>
          <rect
            x={tee[0] - tickScale * 1.1}
            y={tee[1] - tickScale * 0.7}
            width={tickScale * 2.2}
            height={tickScale * 1.4}
            rx={tickScale * 0.25}
            fill="var(--gold-light)"
            opacity={0.95}
            filter={`url(#${uid}-soft)`}
          />
          <circle
            cx={tee[0]}
            cy={tee[1]}
            r={tickScale * 0.35}
            fill="var(--background)"
            opacity={0.9}
          />
        </g>
      )}

      {/* Green pin target */}
      {green && (
        <g>
          <circle
            cx={green[0]}
            cy={green[1]}
            r={tickScale * 1.6}
            fill="none"
            stroke="var(--gold-light)"
            strokeWidth={tickScale * 0.28}
            opacity={0.9}
          />
          <circle
            cx={green[0]}
            cy={green[1]}
            r={tickScale * 0.9}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={tickScale * 0.18}
            opacity={0.7}
          />
          <circle
            cx={green[0]}
            cy={green[1]}
            r={tickScale * 0.38}
            fill="var(--gold-light)"
          />
          {/* Simple flag */}
          <line
            x1={green[0]}
            y1={green[1]}
            x2={green[0]}
            y2={green[1] - tickScale * 2.8}
            stroke="oklch(0.95 0.01 100)"
            strokeWidth={tickScale * 0.18}
            strokeLinecap="round"
          />
          <path
            d={`M ${green[0]} ${green[1] - tickScale * 2.8}
                L ${green[0] + tickScale * 1.6} ${green[1] - tickScale * 2.2}
                L ${green[0]} ${green[1] - tickScale * 1.6} Z`}
            fill="var(--gold)"
            opacity={0.95}
          />
        </g>
      )}
    </svg>
  );

  const ctrlBtn =
    "press flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/55 text-foreground shadow-lg backdrop-blur-md disabled:opacity-35";

  const mapControls = (
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
      {controls ? mapControls : null}
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
              {hole.name ?? `Par ${hole.par}`} · schematic · Black yards on line
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
