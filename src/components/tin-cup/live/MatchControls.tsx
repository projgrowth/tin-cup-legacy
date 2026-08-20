import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  tournamentQueryKey,
  type Match,
  type Player,
  type SideBet,
  type Team,
  useRowWriteStatus,
} from "@/hooks/useTournament";
import { enqueueWrite, expectedVersionAfterWrite } from "@/lib/write-queue";

const RESULT_LABEL: Record<string, string> = {
  "strong-mental": "Strong Mental",
  "grass-roots": "Grass Roots",
  halved: "Halved",
  pending: "Not played",
};

/** Captain-only inline result entry — one tap per match, straight from the board. */
export function MatchResultButtons({ match, teams }: { match: Match; teams: Team[] }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const writeStatus = useRowWriteStatus("matches", match.id);
  useEffect(() => {
    if (!recentlySaved) return;
    const id = window.setTimeout(() => setRecentlySaved(false), 3_000);
    return () => window.clearTimeout(id);
  }, [recentlySaved]);
  const shortName = (slug: string) => {
    const name = teams.find((t) => t.slug === slug)?.name ?? slug;
    return name.split(" ")[0] ?? name;
  };

  async function post(result: string) {
    const previous = match.result;
    if (result === previous) return;
    setSaving(result);
    const status = await enqueueWrite(
      "matches",
      match.id,
      { result },
      match.revision ?? match.updated_at,
    );
    setSaving(null);
    if (status === "rejected") {
      toast.error("Could not save that result. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That match changed on another device. Refresh before saving again.");
      return;
    }
    toast.success(
      status === "saved"
        ? `${match.label}: ${RESULT_LABEL[result]}`
        : "Saved offline — syncs when you get signal",
      {
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: () => {
            void enqueueWrite(
              "matches",
              match.id,
              { result: previous },
              expectedVersionAfterWrite(match.revision ?? match.updated_at, status),
            ).then(() => queryClient.invalidateQueries({ queryKey: tournamentQueryKey }));
          },
        },
      },
    );
    setRecentlySaved(true);
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
  }

  const options = [
    { value: "strong-mental", label: shortName("strong-mental") },
    { value: "halved", label: "Halve" },
    { value: "grass-roots", label: shortName("grass-roots") },
  ];

  return (
    <div className="mt-2 space-y-1.5">
      <p
        className={`t-micro ${writeStatus === "conflict" || writeStatus === "failed" ? "text-copper" : "text-muted-foreground"}`}
        role="status"
      >
        {saving
          ? "Saving…"
          : writeStatus === "conflict"
            ? "Conflict · review before scoring again"
            : writeStatus === "failed"
              ? "Failed · retry from the sync banner"
              : writeStatus === "pending"
                ? "Saved offline · waiting to sync"
                : recentlySaved
                  ? "Saved"
                  : match.result === "pending"
                    ? "Not reported"
                    : "Result synced"}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {options.map((option) => {
          const active = match.result === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={saving !== null}
              aria-pressed={active}
              onClick={() => void post(option.value)}
              className={`press min-h-12 w-full rounded-xl border t-body font-semibold disabled:opacity-50 ${
                active
                  ? "border-foreground/30 bg-secondary text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {saving === option.value ? "…" : option.label}
            </button>
          );
        })}
        {match.result !== "pending" && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void post("pending")}
            className="press min-h-12 w-full rounded-xl border border-border t-body text-muted-foreground disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/** Captain-only pairing editor — tap roster names to build each side. */
export function MatchPairingEditor({
  match,
  teams,
  players,
}: {
  match: Match;
  teams: Team[];
  players: Player[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const parse = (value: string | null) =>
    (value ?? "")
      .split("/")
      .map((n) => n.trim())
      .filter(Boolean);
  const [sideA, setSideA] = useState<string[]>([]);
  const [sideB, setSideB] = useState<string[]>([]);

  const teamId = (slug: string) => teams.find((t) => t.slug === slug)?.id;
  const rosterFor = (slug: string) => players.filter((p) => p.team_id === teamId(slug));
  const teamName = (slug: string) => teams.find((t) => t.slug === slug)?.name ?? slug;

  function toggle(list: string[], set: (next: string[]) => void, name: string) {
    set(list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
  }

  async function save() {
    const allowedA = new Set(rosterFor("strong-mental").map((player) => player.name));
    const allowedB = new Set(rosterFor("grass-roots").map((player) => player.name));
    const cleanA = sideA.filter((name) => allowedA.has(name));
    const cleanB = sideB.filter((name) => allowedB.has(name));
    setSaving(true);
    const status = await enqueueWrite(
      "matches",
      match.id,
      {
        side_a: cleanA.join(" / ") || null,
        side_b: cleanB.join(" / ") || null,
      },
      match.revision ?? match.updated_at,
    );
    setSaving(false);
    if (status === "rejected") {
      toast.error("Could not save that pairing. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That pairing changed on another device. Refresh before saving again.");
      return;
    }
    toast.success(status === "saved" ? "Pairing saved" : "Saved offline — syncs later");
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setSideA(parse(match.side_a));
          setSideB(parse(match.side_b));
          setOpen(true);
        }}
        className="press mt-2 inline-flex min-h-11 items-center t-micro text-muted-foreground"
      >
        {match.side_a || match.side_b ? "Edit pairing" : "Set pairing"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/25 p-3">
      {(
        [
          { slug: "strong-mental", list: sideA, set: setSideA },
          { slug: "grass-roots", list: sideB, set: setSideB },
        ] as const
      ).map((side) => (
        <div key={side.slug}>
          <p className="t-micro">{teamName(side.slug)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {rosterFor(side.slug).map((player) => {
              const active = side.list.includes(player.name);
              return (
                <button
                  key={player.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(side.list, side.set, player.name)}
                  className={`press t-micro min-h-11 rounded-full border px-3 ${
                    active
                      ? "border-foreground/30 bg-secondary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {player.name}
                </button>
              );
            })}
            {rosterFor(side.slug).length === 0 && (
              <span className="t-micro">Roster not loaded</span>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="press btn-gold t-body flex-1"
        >
          {saving ? "Saving…" : "Save pairing"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="press btn-quiet t-body">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Captain-only one-tap claim for an open CTP / long drive pot. */
export function BetClaim({ bet, players }: { bet: SideBet; players: Player[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [other, setOther] = useState(false);
  const [saving, setSaving] = useState(false);

  const rosterNames = players.map((p) => p.name);
  const isRosterName = (n: string) => rosterNames.includes(n.trim());

  async function save() {
    const final = name.trim();
    if (!final) {
      toast.error("Pick or enter the player who claimed it.");
      return;
    }
    setSaving(true);
    const status = await enqueueWrite(
      "side_bets",
      bet.id,
      {
        player_name: final,
        distance: distance.trim() || null,
      },
      bet.revision ?? bet.updated_at,
    );
    setSaving(false);
    if (status === "rejected") {
      toast.error("Could not log that claim. Captains only.");
      return;
    }
    if (status === "conflict") {
      toast.error("That claim changed on another device. Refresh before saving again.");
      return;
    }
    toast.success(status === "saved" ? "Claim logged" : "Saved offline — syncs later");
    void queryClient.invalidateQueries({ queryKey: tournamentQueryKey });
    setOpen(false);
    setName("");
    setDistance("");
    setOther(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          const existing = bet.player_name ?? "";
          setName(existing);
          setOther(existing ? !isRosterName(existing) : false);
          setDistance(bet.distance ?? "");
        }}
        className="press mt-1 inline-flex min-h-11 items-center t-micro text-muted-foreground"
      >
        {bet.player_name ? "Edit claim" : "Claim"}
      </button>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
      {other || players.length === 0 ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="control t-body w-full"
        />
      ) : (
        <select
          value={isRosterName(name) ? name : ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "__other__") {
              setOther(true);
              setName("");
            } else {
              setName(value);
            }
          }}
          className="control t-body w-full"
        >
          <option value="">Pick player</option>
          {players.map((player) => (
            <option key={player.id} value={player.name}>
              {player.name}
            </option>
          ))}
          <option value="__other__">Other…</option>
        </select>
      )}
      <input
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        placeholder="Distance"
        className="control t-body w-24"
      />
      {other && players.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setOther(false);
            setName("");
          }}
          className="col-span-2 text-left t-body text-muted-foreground"
        >
          ← Back to roster
        </button>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="press btn-gold t-body"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setOther(false);
        }}
        className="press btn-quiet t-body"
      >
        Cancel
      </button>
    </div>
  );
}
