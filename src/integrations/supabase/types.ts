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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      couples: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      daily_checks: {
        Row: {
          adjusted: boolean | null
          adjusted_note: string | null
          appreciation_note: string | null
          check_date: string
          climate: number | null
          couple_id: string
          created_at: string
          gave_appreciation: boolean | null
          id: string
          love_map_answer: string | null
          love_map_completed: boolean | null
          love_map_question: string | null
          turn_toward: string | null
          turn_toward_example: string | null
          turn_toward_options: string[] | null
          user_id: string
          was_present: boolean | null
        }
        Insert: {
          adjusted?: boolean | null
          adjusted_note?: string | null
          appreciation_note?: string | null
          check_date?: string
          climate?: number | null
          couple_id: string
          created_at?: string
          gave_appreciation?: boolean | null
          id?: string
          love_map_answer?: string | null
          love_map_completed?: boolean | null
          love_map_question?: string | null
          turn_toward?: string | null
          turn_toward_example?: string | null
          turn_toward_options?: string[] | null
          user_id: string
          was_present?: boolean | null
        }
        Update: {
          adjusted?: boolean | null
          adjusted_note?: string | null
          appreciation_note?: string | null
          check_date?: string
          climate?: number | null
          couple_id?: string
          created_at?: string
          gave_appreciation?: boolean | null
          id?: string
          love_map_answer?: string | null
          love_map_completed?: boolean | null
          love_map_question?: string | null
          turn_toward?: string | null
          turn_toward_example?: string | null
          turn_toward_options?: string[] | null
          user_id?: string
          was_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          area: string
          comment: string | null
          couple_id: string
          created_at: string
          id: string
          need_today: string | null
          score: number
          user_id: string
          want_today: string | null
          week_start: string
        }
        Insert: {
          area: string
          comment?: string | null
          couple_id: string
          created_at?: string
          id?: string
          need_today?: string | null
          score: number
          user_id: string
          want_today?: string | null
          week_start: string
        }
        Update: {
          area?: string
          comment?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          need_today?: string | null
          score?: number
          user_id?: string
          want_today?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      love_map_questions: {
        Row: {
          category: string | null
          id: string
          question: string
        }
        Insert: {
          category?: string | null
          id?: string
          question: string
        }
        Update: {
          category?: string | null
          id?: string
          question?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          couple_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          type: string
        }
        Insert: {
          content: string
          couple_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          couple_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          type?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_reminder_enabled: boolean
          daily_reminder_time: string
          id: string
          messages_enabled: boolean
          repairs_enabled: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string
          id?: string
          messages_enabled?: boolean
          repairs_enabled?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          daily_reminder_enabled?: boolean
          daily_reminder_time?: string
          id?: string
          messages_enabled?: boolean
          repairs_enabled?: boolean
          user_id?: string
        }
        Relationships: []
      }
      partner_invitations: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          invitee_email: string
          inviter_id: string
          status: string
          token: string | null
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          status?: string
          token?: string | null
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_invitations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          area: string
          completed: boolean
          couple_id: string
          created_at: string
          id: string
          month: string
          title: string
          user_id: string
        }
        Insert: {
          area: string
          completed?: boolean
          couple_id: string
          created_at?: string
          id?: string
          month: string
          title: string
          user_id: string
        }
        Update: {
          area?: string
          completed?: boolean
          couple_id?: string
          created_at?: string
          id?: string
          month?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priorities_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          couple_id: string | null
          created_at: string
          display_name: string
          id: string
          pairing_code: string | null
          share_development: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          pairing_code?: string | null
          share_development?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          pairing_code?: string | null
          share_development?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_couple"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          sender_id: string
          type: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sender_id: string
          type: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      quarterly_goals: {
        Row: {
          couple_id: string
          created_at: string | null
          experience_done: boolean | null
          experience_goal: string | null
          id: string
          practical_done: boolean | null
          practical_goal: string | null
          quarter_start: string
          relationship_done: boolean | null
          relationship_goal: string | null
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string | null
          experience_done?: boolean | null
          experience_goal?: string | null
          id?: string
          practical_done?: boolean | null
          practical_goal?: string | null
          quarter_start: string
          relationship_done?: boolean | null
          relationship_goal?: string | null
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string | null
          experience_done?: boolean | null
          experience_goal?: string | null
          id?: string
          practical_done?: boolean | null
          practical_goal?: string | null
          quarter_start?: string
          relationship_done?: boolean | null
          relationship_goal?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quick_repairs: {
        Row: {
          category: string | null
          couple_id: string
          created_at: string
          delivery: string | null
          id: string
          partner_response: string | null
          phrase: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          couple_id: string
          created_at?: string
          delivery?: string | null
          id?: string
          partner_response?: string | null
          phrase?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          couple_id?: string
          created_at?: string
          delivery?: string | null
          id?: string
          partner_response?: string | null
          phrase?: string | null
          user_id?: string
        }
        Relationships: []
      }
      repair_responses: {
        Row: {
          created_at: string
          id: string
          learning: string | null
          prompt_id: string
          repair_id: string
          responder_id: string
          response: string
          time_needed: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          learning?: string | null
          prompt_id: string
          repair_id: string
          responder_id: string
          response: string
          time_needed?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          learning?: string | null
          prompt_id?: string
          repair_id?: string
          responder_id?: string
          response?: string
          time_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_responses_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          completed_at: string | null
          couple_id: string
          created_at: string
          feeling_body: string | null
          id: string
          ideal_outcome: string | null
          interpretation: string | null
          learning: string | null
          needs: string[] | null
          needs_other: string | null
          needs_time_reason: string | null
          observable_fact: string | null
          request: string | null
          self_responsibility: string | null
          status: string
          story: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          couple_id: string
          created_at?: string
          feeling_body?: string | null
          id?: string
          ideal_outcome?: string | null
          interpretation?: string | null
          learning?: string | null
          needs?: string[] | null
          needs_other?: string | null
          needs_time_reason?: string | null
          observable_fact?: string | null
          request?: string | null
          self_responsibility?: string | null
          status?: string
          story?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          couple_id?: string
          created_at?: string
          feeling_body?: string | null
          id?: string
          ideal_outcome?: string | null
          interpretation?: string | null
          learning?: string | null
          needs?: string[] | null
          needs_other?: string | null
          needs_time_reason?: string | null
          observable_fact?: string | null
          request?: string | null
          self_responsibility?: string | null
          status?: string
          story?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_conversations: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          status: string
          week_start: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          status?: string
          week_start: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          status?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_conversations_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_entries: {
        Row: {
          appreciations: string[] | null
          checkout_feeling: string | null
          conversation_id: string
          created_at: string
          id: string
          intention: string | null
          issues: Json | null
          logistics: Json | null
          meeting_notes: Json | null
          partner_learning: string | null
          ready: boolean | null
          takeaway: string | null
          user_id: string
          wins: string[] | null
        }
        Insert: {
          appreciations?: string[] | null
          checkout_feeling?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          intention?: string | null
          issues?: Json | null
          logistics?: Json | null
          meeting_notes?: Json | null
          partner_learning?: string | null
          ready?: boolean | null
          takeaway?: string | null
          user_id: string
          wins?: string[] | null
        }
        Update: {
          appreciations?: string[] | null
          checkout_feeling?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          intention?: string | null
          issues?: Json | null
          logistics?: Json | null
          meeting_notes?: Json | null
          partner_learning?: string | null
          ready?: boolean | null
          takeaway?: string | null
          user_id?: string
          wins?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_entries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "weekly_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
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
  public: {
    Enums: {},
  },
} as const
