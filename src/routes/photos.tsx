import { createFileRoute } from "@tanstack/react-router";
import { MediaGallery } from "@/components/tin-cup/MediaGallery";
import { Shell } from "@/components/tin-cup/Shell";
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
    <Shell variant="content">
      <MediaGallery
        players={tournament.data?.players ?? []}
        teams={tournament.data?.teams ?? []}
        rounds={tournament.data?.rounds ?? []}
      />
    </Shell>
  );
}
