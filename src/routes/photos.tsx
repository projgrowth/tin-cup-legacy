import { createFileRoute } from "@tanstack/react-router";
import { MediaGallery } from "@/components/tin-cup/MediaGallery";
import { ErrorState, LoadingRows, Shell } from "@/components/tin-cup/Shell";
import { useTournament } from "@/hooks/useTournament";

export const Route = createFileRoute("/photos")({
  head: () => ({
    meta: [
      { title: "Weekend Gallery — Tin Cup Invitational 2026" },
      {
        name: "description",
        content: "Favorite and download photos from the Tin Cup Invitational weekend.",
      },
    ],
  }),
  component: PhotosPage,
});

function PhotosPage() {
  const tournament = useTournament();
  return (
    <Shell variant="dashboard">
      {tournament.isPending && !tournament.data ? (
        <LoadingRows rows={4} height={180} />
      ) : tournament.isError && !tournament.data ? (
        <ErrorState onRetry={() => void tournament.refetch()} />
      ) : (
        <MediaGallery
          players={tournament.data?.players ?? []}
          teams={tournament.data?.teams ?? []}
          rounds={tournament.data?.rounds ?? []}
        />
      )}
    </Shell>
  );
}
