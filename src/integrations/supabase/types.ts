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
          couple_id: string
          created_at: string
          gave_appreciation: boolean | null
          id: string
          love_map_answer: string | null
          love_map_completed: boolean | null
          love_map_question: string | null
          turn_toward: string | null
          turn_toward_example: string | null
          user_id: string
          was_present: boolean | null
        }
        Insert: {
          adjusted?: boolean | null
          adjusted_note?: string | null
          appreciation_note?: string | null
          check_date?: string
          couple_id: string
          created_at?: string
          gave_appreciation?: boolean | null
          id?: string
          love_map_answer?: string | null
          love_map_completed?: boolean | null
          love_map_question?: string | null
          turn_toward?: string | null
          turn_toward_example?: string | null
          user_id: string
          was_present?: boolean | null
        }
        Update: {
          adjusted?: boolean | null
          adjusted_note?: string | null
          appreciation_note?: string | null
          check_date?: string
          couple_id?: string
          created_at?: string
          gave_appreciation?: boolean | null
          id?: string
          love_map_answer?: string | null
          love_map_completed?: boolean | null
          love_map_question?: string | null
          turn_toward?: string | null
          turn_toward_example?: string | null
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
          score: number
          user_id: string
          week_start: string
        }
        Insert: {
          area: string
          comment?: string | null
          couple_id: string
          created_at?: string
          id?: string
          score: number
          user_id: string
          week_start: string
        }
        Update: {
          area?: string
          comment?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          score?: number
          user_id?: string
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
      partner_invitations: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          invitee_email: string
          inviter_id: string
          status: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          status?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          status?: string
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
          conversation_id: string
          created_at: string
          id: string
          issues: Json | null
          ready: boolean | null
          takeaway: string | null
          user_id: string
          wins: string[] | null
        }
        Insert: {
          appreciations?: string[] | null
          conversation_id: string
          created_at?: string
          id?: string
          issues?: Json | null
          ready?: boolean | null
          takeaway?: string | null
          user_id: string
          wins?: string[] | null
        }
        Update: {
          appreciations?: string[] | null
          conversation_id?: string
          created_at?: string
          id?: string
          issues?: Json | null
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
  public: {
    Enums: {},
  },
} as const
