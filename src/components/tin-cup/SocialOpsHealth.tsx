import { AlertTriangle, CheckCircle2, MessageSquare, Radio, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useEngagementPlatform } from "@/hooks/useEngagementPlatform";
import { useMatchSocial } from "@/hooks/useMatchSocial";
import { useWeekendStory } from "@/hooks/useWeekendStory";
import { socialFeatureEnabled } from "@/lib/runtime-mode";

export function SocialOpsHealth() {
  const { user } = useAuth();
  const story = useWeekendStory(user?.id);
  const match = useMatchSocial(user?.id);
  const engagement = useEngagementPlatform(user?.id);
  const reports = story.reports.filter((report) => !report.resolved_at).length;
  const reviews = match.confirmations.filter((row) => row.state === "needs-review");
  const blockedMatches = new Set(
    reviews
      .filter((row) => reviews.filter((candidate) => candidate.matchId === row.matchId).length >= 2)
      .map((row) => row.matchId),
  ).size;
  const staged = [
    "clubhouse",
    "customization",
    "predictions",
    "confirmations",
    "polls",
    "checkins",
    "prompts",
    "achievements",
    "gallery",
    "analytics",
  ] as const;
  const enabled = staged.filter((feature) => socialFeatureEnabled(feature)).length;
  return (
    <section className="surface overflow-hidden" aria-labelledby="social-health-title">
      <div className="border-b border-border p-4">
        <p className="t-eyebrow flex items-center gap-1.5 text-gold-light">
          <Radio className="size-3.5" /> Social platform
        </p>
        <h2 id="social-health-title" className="t-title mt-1">
          Clubhouse health
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {[
          { icon: MessageSquare, label: "Posts", value: story.clubhousePosts.length, alert: false },
          { icon: AlertTriangle, label: "Reports", value: reports, alert: reports > 0 },
          {
            icon: Sparkles,
            label: "Polls / picks",
            value: engagement.polls.length + match.predictions.length,
            alert: false,
          },
          {
            icon: CheckCircle2,
            label: "Ops blockers",
            value: blockedMatches,
            alert: blockedMatches > 0,
          },
        ].map((item) => (
          <div key={item.label} className="bg-card p-4">
            <item.icon
              className={`size-4 ${item.alert ? "text-copper" : "text-muted-foreground"}`}
            />
            <p
              className={`t-hero mt-2 ${item.alert ? "text-copper" : "text-foreground"}`}
            >
              {item.value}
            </p>
            <p className="t-micro mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 p-4">
        <p className="t-micro">
          <span className="font-semibold text-foreground">
            {enabled}/{staged.length} staged features enabled.
          </span>{" "}
          Realtime invalidation, rate limiting, direct mentions, private check-ins, and local
          preview isolation are configured.
        </p>
        <p className="t-micro">
          {engagement.checkIns.length} active check-ins · {engagement.prompts.length} scheduled
          prompts · {engagement.favorites.length} saved photo favorites.
        </p>
        {reviews.length > 0 && (
          <p className="t-micro text-copper">
            {reviews.length} player review request{reviews.length === 1 ? "" : "s"} across{" "}
            {new Set(reviews.map((row) => row.matchId)).size} matches.
          </p>
        )}
      </div>
    </section>
  );
}
