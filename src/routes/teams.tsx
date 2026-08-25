import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/teams")({
  beforeLoad: () => {
    throw redirect({ to: "/rosters" });
  },
  component: () => null,
});
