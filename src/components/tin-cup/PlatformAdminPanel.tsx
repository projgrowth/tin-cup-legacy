import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, History, MessageSquareWarning, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isPreviewMode } from "@/lib/runtime-mode";

const platformEnabled = () =>
  isPreviewMode() || String(import.meta.env.VITE_WEEKEND_STORY_V2 ?? "").toLowerCase() === "true";

export function PlatformAdminPanel() {
  const queryClient = useQueryClient();
  const health = useQuery({
    queryKey: ["platform-admin-health"],
    enabled: platformEnabled(),
    retry: false,
    queryFn: async () => {
      if (isPreviewMode()) {
        return {
          hidden: [],
          history: [
            {
              id: "preview-audit",
              entity_type: "match",
              revision: 3,
              created_at: new Date().toISOString(),
            },
          ],
          outbox: [
            {
              id: "preview-push",
              kind: "my_match",
              status: "sent",
              attempts: 1,
              last_error: null,
            },
          ],
          reports: [],
          confirmations: [],
          polls: [],
          checkins: [],
          prompts: [],
          analytics: [],
        };
      }
      const [hidden, history, outbox, reports, confirmations, polls, checkins, prompts, analytics] =
        await Promise.all([
          supabase
            .from("story_comments")
            .select("id, body, author_id, deleted_at, moderated_by")
            .not("deleted_at", "is", null)
            .order("deleted_at", { ascending: false })
            .limit(30),
          supabase
            .from("score_history")
            .select("id, entity_type, revision, created_at")
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("notification_outbox")
            .select("id, kind, status, attempts, last_error")
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("story_reports")
            .select("comment_id, reporter_id, reason, created_at, resolved_at")
            .is("resolved_at", null)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("match_confirmations")
            .select("match_id, player_id, state, updated_at")
            .eq("state", "needs-review")
            .order("updated_at", { ascending: false })
            .limit(30),
          supabase
            .from("clubhouse_polls")
            .select("id, question, closed_at, deleted_at")
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("player_checkins")
            .select("user_id, status, expires_at")
            .gt("expires_at", new Date().toISOString()),
          supabase
            .from("engagement_prompts")
            .select("id, title, starts_at, ends_at")
            .order("starts_at", { ascending: false })
            .limit(30),
          supabase
            .from("product_events")
            .select("name")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);
      const error =
        hidden.error ||
        history.error ||
        outbox.error ||
        reports.error ||
        confirmations.error ||
        polls.error ||
        checkins.error ||
        prompts.error ||
        analytics.error;
      if (error) throw error;
      return {
        hidden: hidden.data ?? [],
        history: history.data ?? [],
        outbox: outbox.data ?? [],
        reports: reports.data ?? [],
        confirmations: confirmations.data ?? [],
        polls: polls.data ?? [],
        checkins: checkins.data ?? [],
        prompts: prompts.data ?? [],
        analytics: analytics.data ?? [],
      };
    },
  });
  const restore = useMutation({
    mutationFn: async (id: string) => {
      if (isPreviewMode()) return;
      const { error } = await supabase
        .from("story_comments")
        .update({ deleted_at: null, moderated_by: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isPreviewMode() ? "Restore simulated in preview" : "Comment restored");
      void queryClient.invalidateQueries({ queryKey: ["platform-admin-health"] });
      void queryClient.invalidateQueries({ queryKey: ["story-comments"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const retry = useMutation({
    mutationFn: async (id: string) => {
      if (isPreviewMode()) return;
      const { error } = await supabase
        .from("notification_outbox")
        .update({ status: "pending", available_at: new Date().toISOString(), last_error: null })
        .eq("id", id)
        .eq("status", "failed");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isPreviewMode() ? "Retry simulated in preview" : "Delivery queued for retry");
      void queryClient.invalidateQueries({ queryKey: ["platform-admin-health"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const resolveReport = useMutation({
    mutationFn: async (commentId: string) => {
      if (isPreviewMode()) return;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("story_reports")
        .update({ resolved_at: new Date().toISOString(), resolved_by: auth.user?.id ?? null })
        .eq("comment_id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isPreviewMode() ? "Resolution simulated in preview" : "Report resolved");
      void queryClient.invalidateQueries({ queryKey: ["platform-admin-health"] });
    },
    onError: (error) => toast.error(error.message),
  });

  if (!platformEnabled()) {
    return (
      <section className="surface p-4">
        <p className="t-eyebrow">Social & push health</p>
        <p className="t-body mt-2 text-foreground">Backend features are safely disabled</p>
        <p className="t-micro mt-1">
          Core tournament pages remain available in read-only story mode.
        </p>
      </section>
    );
  }
  if (health.isLoading) return <div className="surface h-32 animate-pulse" />;
  if (health.isError || !health.data) {
    return (
      <section className="surface border-copper/40 p-4" role="alert">
        <AlertTriangle className="size-5 text-copper" />
        <p className="t-body mt-2 text-foreground">Platform migration is unavailable</p>
        <p className="t-micro mt-1">Story stays read-only and notifications stay disabled.</p>
      </section>
    );
  }

  const failed = health.data.outbox.filter((row) => row.status === "failed");
  return (
    <section className="space-y-3" aria-labelledby="platform-admin-title">
      <div>
        <p className="t-eyebrow">Moderation & delivery</p>
        <h2 id="platform-admin-title" className="t-section mt-1 text-foreground">
          Social and push health
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-4">
          <MessageSquareWarning className="size-5 text-muted-foreground" />
          <p className="t-numeral mt-2 text-foreground">{health.data.hidden.length}</p>
          <p className="t-micro">Hidden comments</p>
        </div>
        <div className="surface p-4">
          <BellRing className="size-5 text-muted-foreground" />
          <p className="t-numeral mt-2 text-foreground">{failed.length}</p>
          <p className="t-micro">Failed deliveries</p>
        </div>
        <div className="surface p-4">
          <History className="size-5 text-muted-foreground" />
          <p className="t-numeral mt-2 text-foreground">{health.data.history.length}</p>
          <p className="t-micro">Recent score revisions</p>
        </div>
        <div className="surface p-4">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="t-numeral mt-2 text-foreground">
            {health.data.reports.length + health.data.confirmations.length}
          </p>
          <p className="t-micro">Social review items</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-4">
          <p className="t-numeral text-foreground">{health.data.polls.length}</p>
          <p className="t-micro mt-1">Clubhouse polls</p>
        </div>
        <div className="surface p-4">
          <p className="t-numeral text-foreground">{health.data.checkins.length}</p>
          <p className="t-micro mt-1">Active check-ins</p>
        </div>
        <div className="surface p-4">
          <p className="t-numeral text-foreground">{health.data.prompts.length}</p>
          <p className="t-micro mt-1">Scheduled prompts</p>
        </div>
        <div className="surface p-4">
          <p className="t-numeral text-foreground">{health.data.analytics.length}</p>
          <p className="t-micro mt-1">Recent product events</p>
        </div>
      </div>
      {health.data.reports.length > 0 && (
        <div className="surface p-4">
          <h3 className="t-eyebrow">Clubhouse reports</h3>
          <ul className="mt-2 divide-y divide-border">
            {health.data.reports.map((report) => (
              <li
                key={`${report.comment_id}:${report.reporter_id}`}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span className="t-body min-w-0 flex-1 text-foreground">
                  {report.reason} · {new Date(report.created_at).toLocaleString()}
                </span>
                <button
                  type="button"
                  disabled={resolveReport.isPending}
                  onClick={() => resolveReport.mutate(report.comment_id)}
                  className="press btn-quiet min-h-11 px-3 text-sm"
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {health.data.confirmations.length > 0 && (
        <div className="surface border-copper/35 p-4">
          <h3 className="t-eyebrow text-copper">Result review requests</h3>
          <ul className="mt-2 divide-y divide-border">
            {health.data.confirmations.map((row) => (
              <li key={`${row.match_id}:${row.player_id}`} className="py-3 t-body text-foreground">
                Match {row.match_id.slice(0, 8)} · player {row.player_id.slice(0, 8)}
              </li>
            ))}
          </ul>
          <p className="t-micro border-t border-border pt-3">
            Resolve through revision-safe scoring; confirmations never change results.
          </p>
        </div>
      )}
      {health.data.hidden.length > 0 && (
        <div className="surface p-4">
          <h3 className="t-eyebrow">Moderation queue</h3>
          <ul className="mt-2 divide-y divide-border">
            {health.data.hidden.map((comment) => (
              <li key={comment.id} className="flex items-center justify-between gap-3 py-3">
                <p className="t-body min-w-0 flex-1 truncate text-foreground">{comment.body}</p>
                <button
                  type="button"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(comment.id)}
                  className="press btn-quiet t-micro min-h-11 px-3"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {failed.length > 0 && (
        <div className="surface p-4">
          <h3 className="t-eyebrow">Failed push delivery</h3>
          <ul className="mt-2 divide-y divide-border">
            {failed.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="t-body block text-foreground">{row.kind.replace("_", " ")}</span>
                  <span className="t-micro block">{row.last_error || "Delivery failed"}</span>
                </span>
                <button
                  type="button"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(row.id)}
                  className="press btn-quiet t-micro flex min-h-11 items-center gap-2 px-3"
                >
                  <RotateCcw className="size-4" /> Retry
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {health.data.history.length > 0 && (
        <details className="surface p-4">
          <summary className="press t-body min-h-11 cursor-pointer text-foreground">
            Inspect score history
          </summary>
          <ol className="divide-y divide-border">
            {health.data.history.map((entry) => (
              <li key={entry.id} className="py-2 t-micro">
                {entry.entity_type} · revision {entry.revision ?? "—"} ·{" "}
                {new Date(entry.created_at).toLocaleString()}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
