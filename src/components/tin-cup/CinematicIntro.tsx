import { useCallback, useEffect, useRef, useState } from "react";

import { useFrameBudget } from "@/hooks/useFrameBudget";
import { markIntroSeen } from "@/lib/intro";
import { setIntroPlaying, writeSeat } from "@/lib/seat";

const INTRO_VIDEO = "/tin-cup-intro.mp4";
const INTRO_POSTER = "/tin-cup-intro-poster.jpg";
const MARK = "/tin-cup-logo.png";

const MAX_FILM_MS = 7000;
/** Film dims out first, then the mark cross-dissolves a beat later. */
const FILM_FADE_MS = 420;
const MARK_HOLD_MS = 240;
const MARK_FADE_MS = 300;
const COLLAPSE_MS = FILM_FADE_MS + MARK_HOLD_MS + MARK_FADE_MS;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
// The film is six seconds long. Keep the separate mark hidden until its final
// beat, then grow it from the shield already mounted on the trophy.
const MARK_REVEAL_MS = 4650;

export function CinematicIntro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    setIntroPlaying(true);
    return () => setIntroPlaying(false);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [showMark, setShowMark] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [settled, setSettled] = useState(false);
  const tier = useFrameBudget(!collapsing);
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    markIntroSeen();
    writeSeat("guest");

    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("tc-afterglow");
        window.setTimeout(() => document.documentElement.classList.remove("tc-afterglow"), 2200);
      }
    } catch {
      /* ignore */
    }

    setShowMark(true);
    setCollapsing(true);
    window.setTimeout(() => onDoneRef.current(), COLLAPSE_MS);
  }, []);

  // Play, then hand off when the single pass ends.
  useEffect(() => {
    const video = videoRef.current;
    const play = () => {
      if (video && video.paused) void video.play().catch(() => undefined);
    };
    play();
    video?.addEventListener("canplay", play);
    document.addEventListener("visibilitychange", play);
    const ceiling = window.setTimeout(finish, MAX_FILM_MS);
    const markIn = window.setTimeout(() => setShowMark(true), MARK_REVEAL_MS);
    return () => {
      video?.removeEventListener("canplay", play);
      document.removeEventListener("visibilitychange", play);
      window.clearTimeout(ceiling);
      window.clearTimeout(markIn);
    };
  }, [finish]);

  // Hold the page still while the film runs.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Drop `will-change` once the emerge animation is over so the browser stops
  // holding a full-screen texture for a layer that no longer moves.
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

  // Sustained jank: stop decoding/compositing video, hold the poster frame.
  useEffect(() => {
    if (tier !== "still") return;
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
  }, [tier]);

  const emergeClass = tier === "full" ? "intro-emerge" : tier === "lite" ? "intro-emerge-lite" : "";

  return (
    <div
      aria-label="Tin Cup Invitational film intro"
      className="fixed inset-0 z-50 overflow-hidden bg-[var(--scrim)]"
      style={{
        opacity: collapsing ? 0 : 1,
        transition: `opacity ${MARK_FADE_MS}ms ${EASE} ${FILM_FADE_MS + MARK_HOLD_MS}ms`,
      }}
    >
      {/* Film layer — dims to black first, without moving or scaling. */}
      <div
        className="absolute inset-0"
        style={{
          opacity: collapsing ? 0 : 1,
          transition: `opacity ${FILM_FADE_MS}ms ${EASE}`,
        }}
      >
        <div
          className={`size-full ${emergeClass} ${settled ? "intro-settled" : ""}`}
          style={{
            backgroundImage: `url(${INTRO_POSTER})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: emergeClass ? undefined : 1,
          }}
        >
          <video
            ref={videoRef}
            className="size-full object-cover"
            src={INTRO_VIDEO}
            poster={INTRO_POSTER}
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            preload="metadata"
            style={{ opacity: tier === "still" ? 0 : 1 }}
            onEnded={finish}
          />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 78% at 50% 42%, transparent 18%, rgba(4,10,6,0.42) 58%, rgba(2,5,3,0.88) 88%, rgba(0,0,0,1) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 26%, transparent 44%, rgba(2,5,3,0.82) 82%, rgba(0,0,0,0.96) 100%)",
          }}
        />
        {/* Grain blends over a playing video every frame — first thing to go. */}
        {tier === "full" && (
          <div aria-hidden className="intro-grain pointer-events-none absolute inset-0" />
        )}
      </div>

      <button
        type="button"
        onClick={finish}
        className="press t-micro absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 min-h-11 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white/80 backdrop-blur-sm sm:right-5 sm:top-[calc(1.25rem+env(safe-area-inset-top))]"
      >
        Skip intro
      </button>

      {/* Mark — begins on the trophy's own shield, then lifts out for the handoff. */}
      <div
        className={`intro-mark-anchor pointer-events-none ${showMark ? "intro-mark-visible" : ""}`}
      >
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="absolute size-[min(86vw,420px)] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(2,5,3,0.82) 0%, rgba(2,5,3,0.55) 45%, transparent 72%)",
            }}
          />
          <img
            src={MARK}
            alt="The Tin Cup Invitational"
            width={168}
            height={168}
            decoding="async"
            className="relative h-[clamp(148px,42vw,176px)] w-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
}
