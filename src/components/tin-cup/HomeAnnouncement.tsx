import { useAuth } from "@/hooks/useAuth";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import { maskGuestProfanity } from "@/lib/locker-copy";

/** Pinned captain note. Hidden when there is none. */
export function HomeAnnouncement({ canModerate = false }: { canModerate?: boolean }) {
  const { user } = useAuth();
  const story = useWeekendStory(user?.id);
  const pin = story.clubhousePosts.find((post) => post.pinned_at);
  if (!pin) return null;

  return (
    <aside className="surface px-4 py-3" aria-label="Announcement">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-eyebrow">Captains</p>
          <p className="t-body mt-1.5 text-foreground">
            {maskGuestProfanity(pin.body, Boolean(user))}
          </p>
        </div>
        {canModerate ? (
          <button
            type="button"
            onClick={() => story.pinPost.mutate({ id: pin.id, pinned: false })}
            className="press t-micro min-h-11 shrink-0"
          >
            Unpin
          </button>
        ) : null}
      </div>
    </aside>
  );
}
