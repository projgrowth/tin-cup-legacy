import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";
import { useProfile } from "@/hooks/useJournal";
import {
  DEFAULT_EXPERIENCE_PREFERENCES,
  type AppearancePreset,
  type HomeModuleKey,
  type LayoutMode,
  type PlayerFlair,
} from "@/lib/social-platform";
import { isPreviewMode, PREVIEW_STORAGE_PREFIX, socialFeatureEnabled } from "@/lib/runtime-mode";

const PREVIEW_IDENTITY_KEY = `${PREVIEW_STORAGE_PREFIX}:identity`;

const appearance: Array<{ value: AppearancePreset; label: string; detail: string }> = [
  { value: "heritage", label: "Heritage", detail: "Warm gold · editorial" },
  { value: "night", label: "Night", detail: "Deep contrast · minimal" },
  { value: "team", label: "Team", detail: "Your side · more energy" },
];
const flair: Array<{ value: PlayerFlair; label: string }> = [
  { value: "competitor", label: "Competitor" },
  { value: "vibes", label: "Vibes captain" },
  { value: "strategist", label: "Strategist" },
  { value: "rookie", label: "Rookie" },
];
const moduleLabel: Record<HomeModuleKey, string> = {
  upcoming: "Next up",
  plan: "Plan progress",
  photos: "Photo pulse",
  purse: "Purse snapshot",
};

export function ExperienceCustomizer({
  userId,
  teamSlug,
}: {
  userId: string;
  teamSlug?: string | null;
}) {
  const { profile, save: saveProfile } = useProfile();
  const experience = useExperiencePreferences(userId);
  const [status, setStatus] = useState("");
  const [playerFlair, setPlayerFlair] = useState<PlayerFlair>("competitor");
  const [preset, setPreset] = useState<AppearancePreset>("heritage");
  const [modules, setModules] = useState<HomeModuleKey[]>(
    DEFAULT_EXPERIENCE_PREFERENCES.homeModules,
  );
  const [compactFeed, setCompactFeed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("auto");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (isPreviewMode()) {
      try {
        const fixture = JSON.parse(localStorage.getItem(PREVIEW_IDENTITY_KEY) ?? "null") as {
          status?: string;
          flair?: PlayerFlair;
        } | null;
        if (fixture) {
          setStatus(fixture.status ?? "");
          setPlayerFlair(fixture.flair ?? "competitor");
          return;
        }
      } catch {
        // Use deterministic defaults if preview storage was cleared or malformed.
      }
    }
    setStatus(profile?.status_text ?? "");
    setPlayerFlair((profile?.flair as PlayerFlair) || "competitor");
  }, [profile?.flair, profile?.status_text]);
  useEffect(() => {
    setPreset(experience.preferences.appearance);
    setModules(experience.preferences.homeModules);
    setCompactFeed(experience.preferences.compactFeed);
    setLayoutMode(experience.preferences.layoutMode);
  }, [experience.preferences]);

  useEffect(() => {
    if (!previewing) return;
    document.documentElement.dataset.appearance = preset;
    if (teamSlug) document.documentElement.dataset.team = teamSlug;
    return () => {
      document.documentElement.dataset.appearance = experience.preferences.appearance;
      if (teamSlug) document.documentElement.dataset.team = teamSlug;
    };
  }, [experience.preferences.appearance, preset, previewing, teamSlug]);

  if (!socialFeatureEnabled("customization")) return null;

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    const next = [...modules];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setModules(next);
  }

  async function save() {
    try {
      if (isPreviewMode()) {
        localStorage.setItem(
          PREVIEW_IDENTITY_KEY,
          JSON.stringify({ status: status.trim(), flair: playerFlair }),
        );
        await experience.save.mutateAsync({
          appearance: preset,
          homeModules: modules,
          compactFeed,
          layoutMode,
        });
        setPreviewing(false);
        toast.success("Your preview style is saved on this device");
        return;
      }
      await Promise.all([
        new Promise<void>((resolve, reject) =>
          saveProfile.mutate(
            { status_text: status.trim() || null, flair: playerFlair },
            { onSuccess: () => resolve(), onError: reject },
          ),
        ),
        experience.save.mutateAsync({
          appearance: preset,
          homeModules: modules,
          compactFeed,
          layoutMode,
        }),
      ]);
      setPreviewing(false);
      toast.success("Your Tin Cup style is saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your style");
    }
  }

  function reset() {
    setPreset(DEFAULT_EXPERIENCE_PREFERENCES.appearance);
    setModules(DEFAULT_EXPERIENCE_PREFERENCES.homeModules);
    setCompactFeed(false);
    setLayoutMode(DEFAULT_EXPERIENCE_PREFERENCES.layoutMode);
    setPreviewing(true);
  }

  function cancelPreview() {
    setPreset(experience.preferences.appearance);
    setModules(experience.preferences.homeModules);
    setCompactFeed(experience.preferences.compactFeed);
    setLayoutMode(experience.preferences.layoutMode);
    setPreviewing(false);
  }

  return (
    <section className="surface-raised overflow-hidden" aria-labelledby="experience-title">
      <div className="border-b border-border p-4 sm:p-5">
        <p className="t-micro flex items-center gap-1.5 text-hunter">
          <Sparkles className="size-3.5" /> Make it yours
        </p>
        <h2 id="experience-title" className="t-title mt-1 text-foreground">
          Your clubhouse style
        </h2>
        <p className="t-micro mt-1">
          Personalize your identity without changing official team or score colors.
        </p>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="t-micro text-foreground/75">Player status</span>
            <input
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              maxLength={80}
              placeholder="Ready for the Snake Pit"
              className="control min-h-12 w-full text-base"
            />
            <span className="t-micro block text-right">{status.length}/80</span>
          </label>
          <label className="space-y-1.5">
            <span className="t-micro text-foreground/75">Player flair</span>
            <select
              value={playerFlair}
              onChange={(event) => setPlayerFlair(event.target.value as PlayerFlair)}
              className="control min-h-12 w-full text-base"
            >
              {flair.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className="t-micro text-foreground/75">Appearance</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {appearance.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={preset === item.value}
                onClick={() => {
                  setPreset(item.value);
                  setPreviewing(true);
                }}
                className={`press min-h-20 rounded-2xl border p-3 text-left ${
                  preset === item.value ? "border-hunter/45 bg-hunter/10" : "border-border bg-secondary"
                }`}
              >
                <span className="block text-sm font-bold text-foreground">{item.label}</span>
                <span className="t-micro mt-1 block leading-tight">{item.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="t-micro text-foreground/75">Secondary Home modules</p>
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={compactFeed}
                onChange={(event) => setCompactFeed(event.target.checked)}
              />
              Compact feed
            </label>
          </div>
          <div
            className="mt-2 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Home layout behavior"
          >
            {(["auto", "custom"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={layoutMode === value}
                onClick={() => setLayoutMode(value)}
                className={`press min-h-11 rounded-xl border px-3 text-sm font-semibold capitalize ${layoutMode === value ? "border-hunter/45 bg-hunter/10 text-foreground" : "border-border text-muted-foreground"}`}
              >
                {value} order
              </button>
            ))}
          </div>
          <p className="t-micro mt-2">
            Auto adapts the order before, during, and after play. Custom always uses your order
            below.
          </p>
          <ol className="mt-2 divide-y divide-border rounded-2xl border border-border bg-black/10 px-3">
            {modules.map((module, index) => (
              <li key={module} className="flex min-h-14 items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {moduleLabel[module]}
                </span>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="press flex size-11 items-center justify-center rounded-xl text-muted-foreground"
                >
                  <ArrowUp className="size-4" />
                  <span className="sr-only">Move {moduleLabel[module]} up</span>
                </button>
                <button
                  type="button"
                  disabled={index === modules.length - 1}
                  onClick={() => move(index, 1)}
                  className="press flex size-11 items-center justify-center rounded-xl text-muted-foreground"
                >
                  <ArrowDown className="size-4" />
                  <span className="sr-only">Move {moduleLabel[module]} down</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={saveProfile.isPending || experience.save.isPending}
            onClick={() => void save()}
            className="press btn-primary flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-bold"
          >
            <Save className="size-4" /> Save style
          </button>
          <button
            type="button"
            onClick={reset}
            className="press btn-quiet flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-semibold"
          >
            <RotateCcw className="size-4" /> Reset
          </button>
          {previewing && (
            <button
              type="button"
              onClick={cancelPreview}
              className="press btn-quiet flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-semibold"
            >
              <X className="size-4" /> Cancel preview
            </button>
          )}
        </div>
        {previewing && (
          <p role="status" className="t-micro flex items-center gap-2 text-hunter">
            <Eye className="size-4" /> Previewing {preset}. Save to keep it.
          </p>
        )}
      </div>
    </section>
  );
}
