import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  player_id: string | null;
  display_name: string;
  avatar_path: string | null;
  status_text: string | null;
  flair: string | null;
};

export function usePublicProfiles() {
  return useQuery({
    queryKey: ["social-profiles"],
    queryFn: async () => {
      const current = await supabase
        .from("profiles")
        .select("id, player_id, display_name, avatar_path, status_text, flair")
        .not("player_id", "is", null);
      if (!current.error) return (current.data ?? []) as PublicProfile[];
      const legacy = await supabase
        .from("profiles")
        .select("id, player_id, display_name, avatar_path")
        .not("player_id", "is", null);
      if (legacy.error) throw legacy.error;
      return (legacy.data ?? []).map((row) => ({ ...row, status_text: null, flair: null }));
    },
    retry: false,
  });
}
