import { Link } from "@tanstack/react-router";
import { Map, CalendarDays } from "lucide-react";

import { AvatarPair } from "@/components/tin-cup/Avatar";
import { Countdown } from "@/components/tin-cup/Countdown";
import { FormatSheet } from "@/components/tin-cup/FormatSheet";
import { LiveWireTicker } from "@/components/tin-cup/LiveWireTicker";
import { PairingRow } from "@/components/tin-cup/PairingRow";
import { PhotoVault } from "@/components/tin-cup/PhotoVault";
import {
  InstallHint,
  ShareBoardButton,
  WhatsAppGroupButton,
} from "@/components/tin-cup/WhatsAppLinks";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import {
  BUY_IN,
  EVENT,
  TOURNAMENT_BANK,
  VENMO_HANDLE,
  VENMO_IS_PLACEHOLDER,
  WEEKEND_SOCIAL,
  WHATSAPP_GROUP_CONFIGURED,
  venmoUrl,
} from "@/lib/tin-cup";
import type { Match, Player, Round, Team } from "@/hooks/useTournament";
import { DAY1_META, DAY1_PAIRINGS, day1GroupForPlayer } from "@/lib/day1-pairings";
import { COURSE_DETAILS, COURSE_LABEL, defaultCourseId, type CourseId } from "@/lib/courses";
import { tallyStandings } from "@/lib/scoring";

export function PreTournamentPanel({
  rounds = [],
  matches = [],
  players = [],
  teams = [],
  canUpload = false,
  signedIn = false,
  claimedName = null,
  needsClaim = false,
}: {
  rounds?: Round[];
  matches?: Match[];
  players?: Player[];
  teams?: Team[];
  canUpload?: boolean;
  signedIn?: boolean;
  claimedName?: string | null;
  needsClaim?: boolean;
}) {
  const standings = tallyStandings(matches);
  const firstName = claimedName?.trim().split(/\s+/)[0] ?? null;
  const isClaimed = signedIn && Boolean(claimedName) && !needsClaim;
  const myDay1 = claimedName ? day1GroupForPlayer(claimedName) : null;
  const avatars = usePlayerAvatars(players, teams);
  const nextCourseId = defaultCourseId() as CourseId;
  const nextDetails = COURSE_DETAILS[nextCourseId];
  const fridaySocial = WEEKEND_SOCIAL[0];

  return (
    <div className="stack-page pb-2">
      {/* Compact brand */}
      <section className="text-center">
        <img
          src="/tin-cup-logo.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto h-12 w-auto object-contain opacity-95"
        />
        <h1 className="t-display mt-4 text-foreground">
          {isClaimed && firstName ? `Hey ${firstName}` : "Tin Cup 2026"}
        </h1>
        <p className="t-micro mt-1 text-muted-foreground">
          {EVENT.dates} · Innisbrook
        </p>
      </section>

      {/* Sole raised hero: countdown embeds cup line */}
      <div className="stack-tight">
        <Countdown />
        <div className="flex items-center justify-center gap-3 px-1">
          <p className="t-numeral text-lg">
            <span className="text-gold-light">{standings.strongMental}</span>
            <span className="mx-1 text-muted-foreground">–</span>
            <span className="text-copper">{standings.grassRoots}</span>
          </p>
          <span className="t-micro text-muted-foreground">Cup · 13.5 wins</span>
        </div>
      </div>

      {/* Weekend command strip — next up */}
      <section className="surface-raised overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="t-eyebrow">Next up</p>
          <p className="t-title mt-1.5 text-foreground">
            {nextDetails.dayLabel} · {COURSE_LABEL[nextCourseId]}
          </p>
          <p className="t-micro mt-1 text-muted-foreground">
            First tee {nextDetails.firstTee} · {nextDetails.format}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <Link
            to="/scout"
            search={{ course: nextCourseId, hole: 1 }}
            className="press flex min-h-14 flex-col items-start justify-center gap-0.5 bg-card px-4 py-3"
          >
            <span className="inline-flex items-center gap-1.5 t-micro font-semibold text-foreground">
              <Map className="size-3.5 opacity-70" /> Game plan
            </span>
            <span className="t-micro text-muted-foreground">Maps & notes</span>
          </Link>
          <Link
            to="/schedule"
            className="press flex min-h-14 flex-col items-start justify-center gap-0.5 bg-card px-4 py-3"
          >
            <span className="inline-flex items-center gap-1.5 t-micro font-semibold text-foreground">
              <CalendarDays className="size-3.5 opacity-70" /> Weekend
            </span>
            <span className="t-micro text-muted-foreground">Tees & dinners</span>
          </Link>
          <Link
            to="/rosters"
            className="press flex min-h-14 flex-col items-start justify-center gap-0.5 bg-card px-4 py-3"
          >
            <span className="t-micro font-semibold text-foreground">Teams</span>
            <span className="t-micro text-muted-foreground">Rosters</span>
          </Link>
          <div className="flex min-h-14 flex-col items-start justify-center gap-0.5 bg-card px-4 py-3">
            <WhatsAppGroupButton className="!min-h-0 !border-0 !bg-transparent !px-0 !py-0 t-micro font-semibold text-foreground" />
            <span className="t-micro text-muted-foreground">
              {WHATSAPP_GROUP_CONFIGURED ? "Group chat" : "Scores live here"}
            </span>
          </div>
        </div>
        {fridaySocial && (
          <p className="border-t border-border px-4 py-2.5 t-micro text-muted-foreground">
            <span className="font-medium text-foreground/90">{fridaySocial.day}</span>
            {" · "}
            {fridaySocial.title}
          </p>
        )}
      </section>

      {/* For you — claimed only */}
      {isClaimed && myDay1 && (
        <section className="surface-raised p-4">
          <p className="t-eyebrow">For you · Day 1</p>
          <div className="mt-3 flex items-center gap-3">
            <AvatarPair
              people={[
                {
                  name: claimedName!,
                  teamSlug: avatars.data?.getByName(claimedName!)?.teamSlug,
                  src: avatars.data?.getByName(claimedName!)?.url,
                },
                {
                  name: myDay1.partner,
                  teamSlug: avatars.data?.getByName(myDay1.partner)?.teamSlug,
                  src: avatars.data?.getByName(myDay1.partner)?.url,
                },
              ]}
              size="md"
            />
            <div className="min-w-0">
              <p className="t-title text-foreground">Match {myDay1.pairing.matchIndex}</p>
              <p className="t-micro mt-1 text-muted-foreground">
                w/ {myDay1.partner.split(" ")[0]} · vs {myDay1.opponents}
              </p>
              <p className="t-micro mt-0.5 text-muted-foreground">
                {DAY1_META.tee} · {DAY1_META.course}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Link
              to="/scout"
              search={{ course: "south", hole: 1 }}
              className="press t-micro font-semibold text-foreground underline-offset-2 hover:underline"
            >
              Plan South →
            </Link>
            <Link to="/profile" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              My hub
            </Link>
            <Link to="/rosters" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              Team
            </Link>
            <Link to="/schedule" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
              Weekend
            </Link>
          </div>
        </section>
      )}

      {/* Claim / install — field onboarding */}
      {signedIn && needsClaim && (
        <Link
          to="/profile"
          className="press surface-raised flex items-center justify-between gap-3 border border-gold/30 p-4"
        >
          <span className="min-w-0">
            <span className="t-title block text-foreground">Claim your roster name</span>
            <span className="t-micro mt-1 block text-muted-foreground">
              Unlocks pairing card, private notes, and photo credits
            </span>
          </span>
          <span className="t-micro shrink-0 font-semibold text-gold-light">Account →</span>
        </Link>
      )}

      <InstallHint prominent />

      {/* Primary CTA stack */}
      <section className="stack-tight">
        {!signedIn && (
          <Link
            to="/profile"
            className="press btn-quiet t-body flex w-full justify-center"
          >
            Sign in · claim your spot
          </Link>
        )}
        <a
          href={venmoUrl}
          target="_blank"
          rel="noreferrer"
          className="press btn-gold t-body flex w-full items-center justify-center px-6 py-3.5"
        >
          Pay ${BUY_IN}
        </a>
        <p className="t-micro text-center text-muted-foreground">
          @{VENMO_HANDLE} · {TOURNAMENT_BANK}
        </p>
        {VENMO_IS_PLACEHOLDER && (
          <p className="t-micro text-center text-copper">Set VITE_VENMO_HANDLE before the weekend.</p>
        )}
      </section>

      {/* Day 1 compact */}
      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="t-section text-foreground">Day 1</h2>
            <p className="t-micro mt-0.5 text-muted-foreground">
              {DAY1_META.course} · {DAY1_META.tee} · Scramble + Alt Shot
            </p>
          </div>
          <Link to="/schedule" className="t-micro shrink-0 text-muted-foreground">
            All days →
          </Link>
        </div>
        <ul className="surface-inset divide-y divide-border overflow-hidden">
          {DAY1_PAIRINGS.map((p) => (
            <PairingRow
              key={p.matchIndex}
              index={p.matchIndex}
              sideALabel={p.sideA}
              sideBLabel={p.sideB}
              sideAPeople={p.playersA.map((name) => ({
                name,
                teamSlug: "strong-mental",
                src: avatars.data?.getByName(name)?.url,
              }))}
              sideBPeople={p.playersB.map((name) => ({
                name,
                teamSlug: "grass-roots",
                src: avatars.data?.getByName(name)?.url,
              }))}
              highlight={myDay1?.pairing.matchIndex === p.matchIndex}
              meta={DAY1_META.formats}
            />
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FormatSheet />
          <Link
            to="/scout"
            search={{ course: "south", hole: 1 }}
            className="press t-micro text-muted-foreground underline-offset-2 hover:underline"
          >
            South planner
          </Link>
          <Link to="/purse" className="press t-micro text-muted-foreground underline-offset-2 hover:underline">
            Money details
          </Link>
        </div>
      </section>

      <LiveWireTicker
        matches={matches}
        sideBets={[]}
        players={players}
        teams={teams}
        variant="pre"
        limit={6}
        toastEnabled={false}
      />

      {/* Pulse only when there is something to show or user can add */}
      <PhotoVault canUpload={canUpload} variant="pulse" hideWhenEmpty={!canUpload} />

      {/* Quiet footer actions */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link to="/schedule" className="press t-micro text-muted-foreground">
          Schedule
        </Link>
        <Link to="/rosters" className="press t-micro text-muted-foreground">
          Teams
        </Link>
        <Link to="/scout" className="press t-micro text-muted-foreground">
          Plan
        </Link>
        <WhatsAppGroupButton className="!min-h-0 !border-0 !bg-transparent !px-0 !py-0 t-micro text-muted-foreground" />
        <ShareBoardButton className="!min-h-0 !border-0 !bg-transparent !px-0 !py-0 t-micro text-muted-foreground" />
      </div>
      {WHATSAPP_GROUP_CONFIGURED && (
        <p className="-mt-4 t-micro text-center text-muted-foreground">
          Chat on WhatsApp · scores here
        </p>
      )}
      <Link
        to="/"
        search={{ board: true }}
        className="press t-micro text-center text-muted-foreground underline-offset-2 hover:underline"
      >
        Clubhouse display board
      </Link>
    </div>
  );
}
