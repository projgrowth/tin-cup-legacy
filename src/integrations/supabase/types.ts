export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      hole_notes: {
        Row: {
          course_id: string;
          created_at: string;
          green_note: string | null;
          hole: number;
          id: string;
          notes: string | null;
          target_line: string | null;
          target_score: number | null;
          tee_club: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          green_note?: string | null;
          hole: number;
          id?: string;
          notes?: string | null;
          target_line?: string | null;
          target_score?: number | null;
          tee_club?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          green_note?: string | null;
          hole?: number;
          id?: string;
          notes?: string | null;
          target_line?: string | null;
          target_score?: number | null;
          tee_club?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          label: string;
          points: number;
          revision: number;
          result: string;
          round_id: string;
          side_a: string | null;
          side_b: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          points?: number;
          revision?: number;
          result?: string;
          round_id: string;
          side_a?: string | null;
          side_b?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          points?: number;
          revision?: number;
          result?: string;
          round_id?: string;
          side_a?: string | null;
          side_b?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          alt_text: string | null;
          caption: string | null;
          course_id: string | null;
          created_at: string;
          event_tag: string | null;
          featured: boolean;
          id: string;
          round_id: string | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          alt_text?: string | null;
          caption?: string | null;
          course_id?: string | null;
          created_at?: string;
          event_tag?: string | null;
          featured?: boolean;
          id?: string;
          round_id?: string | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          alt_text?: string | null;
          caption?: string | null;
          course_id?: string | null;
          created_at?: string;
          event_tag?: string | null;
          featured?: boolean;
          id?: string;
          round_id?: string | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          is_captain: boolean;
          name: string;
          sort_order: number;
          team_id: string;
        };
        Insert: {
          id?: string;
          is_captain?: boolean;
          name: string;
          sort_order?: number;
          team_id: string;
        };
        Update: {
          id?: string;
          is_captain?: boolean;
          name?: string;
          sort_order?: number;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          flair: string | null;
          id: string;
          player_id: string | null;
          status_text: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          flair?: string | null;
          id: string;
          player_id?: string | null;
          status_text?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          flair?: string | null;
          id?: string;
          player_id?: string | null;
          status_text?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          enabled: boolean;
          endpoint: string;
          failure_count: number;
          id: string;
          last_success_at: string | null;
          p256dh: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          enabled?: boolean;
          endpoint: string;
          failure_count?: number;
          id?: string;
          last_success_at?: string | null;
          p256dh: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          enabled?: boolean;
          endpoint?: string;
          failure_count?: number;
          id?: string;
          last_success_at?: string | null;
          p256dh?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          final_result: boolean;
          lead_changes: boolean;
          mentions: boolean;
          my_match: boolean;
          organizer_announcements: boolean;
          match_reviews: boolean;
          tee_reminders: boolean;
          quiet_start: string | null;
          quiet_end: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          final_result?: boolean;
          lead_changes?: boolean;
          mentions?: boolean;
          my_match?: boolean;
          organizer_announcements?: boolean;
          match_reviews?: boolean;
          tee_reminders?: boolean;
          quiet_start?: string | null;
          quiet_end?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          final_result?: boolean;
          lead_changes?: boolean;
          mentions?: boolean;
          my_match?: boolean;
          organizer_announcements?: boolean;
          match_reviews?: boolean;
          tee_reminders?: boolean;
          quiet_start?: string | null;
          quiet_end?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          attempts: number;
          available_at: string;
          created_at: string;
          dedupe_key: string;
          id: string;
          kind: string;
          last_error: string | null;
          payload: Json;
          recipient_id: string | null;
          sent_at: string | null;
          status: string;
        };
        Insert: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          dedupe_key: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          payload?: Json;
          recipient_id?: string | null;
          sent_at?: string | null;
          status?: string;
        };
        Update: {
          attempts?: number;
          available_at?: string;
          created_at?: string;
          dedupe_key?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          payload?: Json;
          recipient_id?: string | null;
          sent_at?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      round_plans: {
        Row: {
          created_at: string;
          id: string;
          plan: string;
          round_slug: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          plan?: string;
          round_slug: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          plan?: string;
          round_slug?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rounds: {
        Row: {
          course: string;
          day_label: string;
          format: string;
          format_detail: string | null;
          id: string;
          meal: string | null;
          play_date: string;
          points: number;
          slug: string;
          sort_order: number;
          tee_window: string;
        };
        Insert: {
          course: string;
          day_label: string;
          format: string;
          format_detail?: string | null;
          id?: string;
          meal?: string | null;
          play_date: string;
          points?: number;
          slug: string;
          sort_order?: number;
          tee_window: string;
        };
        Update: {
          course?: string;
          day_label?: string;
          format?: string;
          format_detail?: string | null;
          id?: string;
          meal?: string | null;
          play_date?: string;
          points?: number;
          slug?: string;
          sort_order?: number;
          tee_window?: string;
        };
        Relationships: [];
      };
      side_bets: {
        Row: {
          amount: number;
          distance: string | null;
          hole: number | null;
          id: string;
          kind: string;
          label: string;
          player_name: string | null;
          revision: number;
          round_id: string | null;
          sort_order: number;
          team_slug: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          distance?: string | null;
          hole?: number | null;
          id?: string;
          kind: string;
          label: string;
          player_name?: string | null;
          revision?: number;
          round_id?: string | null;
          sort_order?: number;
          team_slug?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          distance?: string | null;
          hole?: number | null;
          id?: string;
          kind?: string;
          label?: string;
          player_name?: string | null;
          revision?: number;
          round_id?: string | null;
          sort_order?: number;
          team_slug?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "side_bets_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      score_history: {
        Row: {
          actor_id: string | null;
          after_state: Json;
          before_state: Json;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          revision: number | null;
        };
        Insert: {
          actor_id?: string | null;
          after_state: Json;
          before_state: Json;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          revision?: number | null;
        };
        Update: {
          actor_id?: string | null;
          after_state?: Json;
          before_state?: Json;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          revision?: number | null;
        };
        Relationships: [];
      };
      story_comments: {
        Row: {
          id: string;
          moment_key: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          moderated_by: string | null;
          pinned_at: string | null;
          pinned_by: string | null;
          announcement_expires_at: string | null;
        };
        Insert: {
          id?: string;
          moment_key: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          moderated_by?: string | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          announcement_expires_at?: string | null;
        };
        Update: {
          id?: string;
          moment_key?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          moderated_by?: string | null;
          pinned_at?: string | null;
          pinned_by?: string | null;
          announcement_expires_at?: string | null;
        };
        Relationships: [];
      };
      story_reactions: {
        Row: { moment_key: string; user_id: string; kind: string; created_at: string };
        Insert: { moment_key: string; user_id: string; kind: string; created_at?: string };
        Update: { moment_key?: string; user_id?: string; kind?: string; created_at?: string };
        Relationships: [];
      };
      comment_mentions: {
        Row: { comment_id: string; mentioned_user_id: string; created_at: string };
        Insert: { comment_id: string; mentioned_user_id: string; created_at?: string };
        Update: { comment_id?: string; mentioned_user_id?: string; created_at?: string };
        Relationships: [];
      };
      story_reports: {
        Row: {
          comment_id: string;
          reporter_id: string;
          reason: string;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          comment_id: string;
          reporter_id: string;
          reason?: string;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          reason?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [];
      };
      clubhouse_reads: {
        Row: { user_id: string; last_read_at: string };
        Insert: { user_id: string; last_read_at?: string };
        Update: { last_read_at?: string };
        Relationships: [];
      };
      user_experience_preferences: {
        Row: {
          user_id: string;
          appearance: string;
          home_modules: string[];
          compact_feed: boolean;
          layout_mode: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          appearance?: string;
          home_modules?: string[];
          compact_feed?: boolean;
          layout_mode?: string;
          updated_at?: string;
        };
        Update: {
          appearance?: string;
          home_modules?: string[];
          compact_feed?: boolean;
          layout_mode?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_predictions: {
        Row: {
          match_id: string;
          user_id: string;
          choice: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          user_id: string;
          choice: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: { choice?: string; note?: string | null; updated_at?: string };
        Relationships: [];
      };
      match_confirmations: {
        Row: {
          match_id: string;
          player_id: string;
          user_id: string;
          state: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          player_id: string;
          user_id: string;
          state: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: { state?: string; updated_at?: string };
        Relationships: [];
      };
      clubhouse_polls: {
        Row: {
          id: string;
          author_id: string;
          question: string;
          created_at: string;
          updated_at: string;
          closes_at: string | null;
          closed_at: string | null;
          deleted_at: string | null;
          moderated_by: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          question: string;
          created_at?: string;
          updated_at?: string;
          closes_at?: string | null;
          closed_at?: string | null;
          deleted_at?: string | null;
          moderated_by?: string | null;
        };
        Update: {
          question?: string;
          updated_at?: string;
          closes_at?: string | null;
          closed_at?: string | null;
          deleted_at?: string | null;
          moderated_by?: string | null;
        };
        Relationships: [];
      };
      clubhouse_poll_options: {
        Row: { id: string; poll_id: string; label: string; sort_order: number };
        Insert: { id?: string; poll_id: string; label: string; sort_order?: number };
        Update: { label?: string; sort_order?: number };
        Relationships: [];
      };
      clubhouse_poll_votes: {
        Row: {
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: { option_id?: string; updated_at?: string };
        Relationships: [];
      };
      player_checkins: {
        Row: {
          user_id: string;
          player_id: string;
          status: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          user_id: string;
          player_id: string;
          status: string;
          created_at?: string;
          expires_at: string;
        };
        Update: { status?: string; created_at?: string; expires_at?: string };
        Relationships: [];
      };
      engagement_prompts: {
        Row: {
          id: string;
          author_id: string;
          kind: string;
          title: string;
          detail: string | null;
          starts_at: string;
          ends_at: string;
          round_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          kind: string;
          title: string;
          detail?: string | null;
          starts_at: string;
          ends_at: string;
          round_id?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          detail?: string | null;
          starts_at?: string;
          ends_at?: string;
          round_id?: string | null;
        };
        Relationships: [];
      };
      photo_favorites: {
        Row: { photo_id: string; user_id: string; created_at: string };
        Insert: { photo_id: string; user_id: string; created_at?: string };
        Update: { created_at?: string };
        Relationships: [];
      };
      product_events: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          route: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          route: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: { name?: string; route?: string; metadata?: Json };
        Relationships: [];
      };
      client_error_events: {
        Row: {
          id: string;
          route: string;
          release: string;
          browser_category: string;
          message: string;
          stack_excerpt: string | null;
          session_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          route: string;
          release: string;
          browser_category: string;
          message: string;
          stack_excerpt?: string | null;
          session_hash: string;
          created_at?: string;
        };
        Update: {
          route?: string;
          release?: string;
          browser_category?: string;
          message?: string;
          stack_excerpt?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          captain_name: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          captain_name: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          captain_name?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      trophies: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          name: string;
          revision: number;
          slug: string;
          sort_order: number;
          updated_at: string;
          winner_name: string | null;
          winner_note: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          name: string;
          revision?: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          winner_name?: string | null;
          winner_note?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          revision?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          winner_name?: string | null;
          winner_note?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "admin" | "captain" | "player";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "captain", "player"],
    },
  },
} as const;
