import { useEffect, useState } from "react";

import { Avatar } from "@/components/tin-cup/Avatar";
import {
  formatActivityTime,
  useActivityFeed,
  type ActivityItem,
} from "@/hooks/useActivityFeed";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { Player, Team } from "@/hooks/useTournament";
import { nhost } from "@/integrations/nhost/client";

function ActivityRow({
  item,
  faceUrl,
}: {
  item: ActivityItem;
  faceUrl?: string | null;
}) {
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <Avatar
        name={item.playerName || "?"}
        teamSlug={item.teamSlug}
        src={faceUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="t-body truncate font-medium text-foreground">{item.title}</p>
        {(item.subtitle || item.at) && (
          <p className="t-micro mt-0.5 truncate text-muted-foreground">
            {item.subtitle ? `${item.subtitle} · ` : ""}
            {item.at && item.at !== new Date(0).toISOString()
              ? formatActivityTime(item.at)
              : ""}
          </p>
        )}
      </div>
    </li>
  );
}

export function ActivityFeed({
  players,
  teams,
  limit = 6,
}: {
  players: Player[];
  teams: Team[];
  limit?: number;
}) {
  const { data: items, isPending } = useActivityFeed(players, teams);
  const avatars = usePlayerAvatars(players, teams);
  const [pathUrls, setPathUrls] = useState<Record<string, string>>({});

  const list = (items ?? []).slice(0, limit);
  const claimedCount = (items ?? []).filter((i) => i.kind === "claim").length;
  const pathKey = list.map((i) => i.avatarPath).filter(Boolean).join("|");

  useEffect(() => {
    const paths = [
      ...new Set(
        list.map((i) => i.avatarPath).filter((p): p is string => Boolean(p)),
      ),
    ];
    if (paths.length === 0) return;
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        paths.map(async (path) => {
          try {
            const signed = await nhost.storage.getFilePresignedURL(path);
            const url = signed?.body?.url;
            if (url) next[path] = url;
          } catch {
            /* monogram */
          }
        }),
      );
      if (!cancelled) setPathUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathKey captures avatar paths
  }, [pathKey]);

  if (isPending) {
    return (
      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <h2 className="t-section text-foreground">Updates</h2>
        </div>
        <div className="surface-inset space-y-2 p-3">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      </section>
    );
  }

  if (list.length === 0) {
    return (
      <section>
        <h2 className="t-section mb-2.5 text-foreground">Updates</h2>
        <div className="surface-inset px-3.5 py-4">
          <p className="t-body text-muted-foreground">
            Field is quiet — claim your name or post the first photo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="t-section text-foreground">Updates</h2>
        {claimedCount > 0 && (
          <span className="t-micro text-muted-foreground">
            {claimedCount} signed up
          </span>
        )}
      </div>
      <ul className="surface-inset divide-y divide-border overflow-hidden">
        {list.map((item) => {
          const fromMap = item.playerId
            ? avatars.data?.byPlayerId.get(item.playerId)?.url
            : item.playerName
              ? avatars.data?.getByName(item.playerName)?.url
              : null;
          const faceUrl =
            fromMap || (item.avatarPath ? pathUrls[item.avatarPath] : null);
          return <ActivityRow key={item.id} item={item} faceUrl={faceUrl} />;
        })}
      </ul>
    </section>
  );
}
