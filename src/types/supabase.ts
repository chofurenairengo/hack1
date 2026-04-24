// AUTO-GENERATED FILE — DO NOT EDIT
// Regenerate with: supabase gen types typescript --project-id yghjqxktjmtnwngjzljq > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      awards: {
        Row: {
          award_type: string
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          award_type: string
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          award_type?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          created_at: string
          entry_type: string
          event_id: string
          id: string
          is_presenter: boolean
          ng_requested: boolean
          pair_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_type: string
          event_id: string
          id?: string
          is_presenter?: boolean
          ng_requested?: boolean
          pair_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          entry_type?: string
          event_id?: string
          id?: string
          is_presenter?: boolean
          ng_requested?: boolean
          pair_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_pair_fk"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "presentation_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tables: {
        Row: {
          created_at: string
          event_id: string
          id: string
          seat_count: number
          table_number: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          seat_count: number
          table_number: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          seat_count?: number
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_participants: number | null
          mode: string
          organizer_id: string
          phase: string
          scheduled_at: string | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_participants?: number | null
          mode: string
          organizer_id: string
          phase?: string
          scheduled_at?: string | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_participants?: number | null
          mode?: string
          organizer_id?: string
          phase?: string
          scheduled_at?: string | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_messages: {
        Row: {
          body: string
          id: string
          match_id: string
          sender_id: string
          sent_at: string
        }
        Insert: {
          body: string
          id?: string
          match_id: string
          sender_id: string
          sent_at?: string
        }
        Update: {
          body?: string
          id?: string
          match_id?: string
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          table_id: string | null
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          table_id?: string | null
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          table_id?: string | null
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "event_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reveal_consents: {
        Row: {
          id: string
          match_id: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          match_id: string
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          match_id?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reveal_consents_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_reveal_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      presentation_pairs: {
        Row: {
          created_at: string
          event_id: string
          id: string
          introducee_id: string
          presentation_order: number | null
          presenter_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          introducee_id: string
          presentation_order?: number | null
          presenter_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          introducee_id?: string
          presentation_order?: number | null
          presenter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_pairs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_pairs_introducee_id_fkey"
            columns: ["introducee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presentation_pairs_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string | null
          presenter_id: string
          recommended_user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          presenter_id: string
          recommended_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          presenter_id?: string
          recommended_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_recommended_user_id_fkey"
            columns: ["recommended_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_decks: {
        Row: {
          ai_generation_log: Json | null
          created_at: string
          event_id: string
          id: string
          pair_id: string
          pptx_storage_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_generation_log?: Json | null
          created_at?: string
          event_id: string
          id?: string
          pair_id: string
          pptx_storage_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_generation_log?: Json | null
          created_at?: string
          event_id?: string
          id?: string
          pair_id?: string
          pptx_storage_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_decks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_decks_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "presentation_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_images: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          slide_index: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          slide_index: number
          storage_path: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          slide_index?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_images_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      slide_reviews: {
        Row: {
          approved: boolean | null
          deck_id: string
          id: string
          rejection_reason: string | null
          review_type: string
          reviewed_at: string
          reviewer_id: string
        }
        Insert: {
          approved?: boolean | null
          deck_id: string
          id?: string
          rejection_reason?: string | null
          review_type: string
          reviewed_at?: string
          reviewer_id: string
        }
        Update: {
          approved?: boolean | null
          deck_id?: string
          id?: string
          rejection_reason?: string | null
          review_type?: string
          reviewed_at?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "slide_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slide_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stamps: {
        Row: {
          client_nonce: string
          event_id: string
          id: string
          kind: string
          sent_at: string
        }
        Insert: {
          client_nonce: string
          event_id: string
          id?: string
          kind: string
          sent_at?: string
        }
        Update: {
          client_nonce?: string
          event_id?: string
          id?: string
          kind?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      table_members: {
        Row: {
          created_at: string
          id: string
          seat_index: number
          table_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          seat_index: number
          table_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          seat_index?: number
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_members_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "event_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          age: number
          avatar_preset_key: string | null
          bio: string | null
          created_at: string
          email_domain_verified: boolean
          gender: string
          hobbies: string[] | null
          id: string
          is_admin: boolean
          nickname: string
          preferred_genders: string[]
          residence_pref: string | null
          updated_at: string
        }
        Insert: {
          age: number
          avatar_preset_key?: string | null
          bio?: string | null
          created_at?: string
          email_domain_verified?: boolean
          gender: string
          hobbies?: string[] | null
          id: string
          is_admin?: boolean
          nickname: string
          preferred_genders?: string[]
          residence_pref?: string | null
          updated_at?: string
        }
        Update: {
          age?: number
          avatar_preset_key?: string | null
          bio?: string | null
          created_at?: string
          email_domain_verified?: boolean
          gender?: string
          hobbies?: string[] | null
          id?: string
          is_admin?: boolean
          nickname?: string
          preferred_genders?: string[]
          residence_pref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          priority: number
          votee_user_id: string
          voter_user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          priority: number
          votee_user_id: string
          voter_user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          priority?: number
          votee_user_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_votee_user_id_fkey"
            columns: ["votee_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_user_id_fkey"
            columns: ["voter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
