import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import { tournamentQueryKey, type Trophy } from "@/hooks/useTournament";
import { enqueueWrite } from "@/lib/write-queue";

/** Scorekeeper-only trophy winner assignment. */
function TrophyAward({ trophy }: { trophy: Trophy }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const status = await enqueueWrite(
      "trophies",
      trophy.id,
      {
        winner_name: name.trim() || null,
        winner_note: note.trim() || null,
      },
      trophy.revision ?? trophy.updated_at,
    );
    setSaving(false);
    if (status === "rejected") {
      toast.error("Could not save that. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That trophy changed on another device. Refresh before saving again.");
      return;
    }
    toast.success(status === "saved" ? "Winner saved" : "Saved offline — syncs later");
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setName(trophy.winner_name ?? "");
          setNote(trophy.winner_note ?? "");
        }}
        className="press t-micro mt-2 text-muted-foreground"
      >
        {trophy.winner_name ? "Edit winner" : "Award trophy"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Winner"
        maxLength={80}
        className="control t-body w-full"
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        maxLength={140}
        className="control t-body w-full"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="press btn-primary t-body flex-1"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="press btn-quiet t-body">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function HallOfFamePanel({
  canUpload,
  trophies,
  canScore = false,
}: {
  canUpload: boolean;
  trophies: Trophy[];
  canScore?: boolean;
}) {
  const awarded = trophies.filter((t) => Boolean(t.winner_name?.trim())).length;
  const preEvent = awarded === 0 && trophies.length > 0;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="t-eyebrow">Trophy room</h2>
        {preEvent && (
          <p className="t-body mt-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-muted-foreground">
            Awards are presented Sunday after Island. Winners post here once captains lock them —
            this is a preview of the hardware, not a scoreboard yet.
          </p>
        )}
        {trophies.map((trophy) => {
          const hasWinner = Boolean(trophy.winner_name?.trim());
          return (
            <article key={trophy.id} className="hairline mt-4 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="t-title min-w-0 truncate text-foreground">{trophy.name}</h3>
                <span
                  className={`t-body shrink-0 ${
                    hasWinner ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {hasWinner ? trophy.winner_name : preEvent ? "Sunday" : "Open"}
                </span>
              </div>
              <p className="t-micro mt-1">{trophy.description}</p>
              {trophy.winner_note && (
                <p className="t-micro mt-1 text-copper">{trophy.winner_note}</p>
              )}
              {canScore && <TrophyAward trophy={trophy} />}
            </article>
          );
        })}
        {trophies.length === 0 && (
          <p className="t-micro mt-4">Trophy room loads once the board syncs.</p>
        )}
      </section>
      <PhotoVault canUpload={canUpload} />
    </div>
  );
}
