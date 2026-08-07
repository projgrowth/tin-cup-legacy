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
          caption: string | null;
          created_at: string;
          id: string;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          id?: string;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          id?: string;
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
          id: string;
          player_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          player_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          player_id?: string | null;
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
