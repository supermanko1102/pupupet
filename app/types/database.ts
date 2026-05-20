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
  public: {
    Tables: {
      analysis_usage: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          id: string
          log_id: string
          refund_reason: string | null
          refunded_at: string | null
          source: string
          user_id: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          log_id: string
          refund_reason?: string | null
          refunded_at?: string | null
          source: string
          user_id: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          log_id?: string
          refund_reason?: string | null
          refunded_at?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_usage_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: true
            referencedRelation: "poop_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          entitlement_id: string | null
          environment: string | null
          free_analysis_remaining: number
          last_revenuecat_event_at: string | null
          last_synced_at: string | null
          monthly_analysis_limit: number
          monthly_analysis_used: number
          product_id: string | null
          revenuecat_app_user_id: string
          store: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlement_id?: string | null
          environment?: string | null
          free_analysis_remaining?: number
          last_revenuecat_event_at?: string | null
          last_synced_at?: string | null
          monthly_analysis_limit?: number
          monthly_analysis_used?: number
          product_id?: string | null
          revenuecat_app_user_id: string
          store?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entitlement_id?: string | null
          environment?: string | null
          free_analysis_remaining?: number
          last_revenuecat_event_at?: string | null
          last_synced_at?: string | null
          monthly_analysis_limit?: number
          monthly_analysis_used?: number
          product_id?: string | null
          revenuecat_app_user_id?: string
          store?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          app_user_id: string | null
          created_at: string
          event_id: string
          event_type: string
          processed_at: string | null
          processing_error: string | null
          raw_event: Json
        }
        Insert: {
          app_user_id?: string | null
          created_at?: string
          event_id: string
          event_type: string
          processed_at?: string | null
          processing_error?: string | null
          raw_event: Json
        }
        Update: {
          app_user_id?: string | null
          created_at?: string
          event_id?: string
          event_type?: string
          processed_at?: string | null
          processing_error?: string | null
          raw_event?: Json
        }
        Relationships: []
      }
      pets: {
        Row: {
          birthday: string | null
          breed: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          species: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birthday?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          species?: string
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          birthday?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          species?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      poop_logs: {
        Row: {
          ai_raw_json: Json | null
          ai_escalation_signs: string[]
          ai_findings: string[]
          ai_next_step: string | null
          ai_observation: string | null
          ai_possible_reasons: string[]
          ai_watch_items: string[]
          bristol_score: number | null
          captured_at: string
          color: string | null
          confidence: number | null
          consistency: string | null
          created_at: string
          failure_reason: string | null
          id: string
          image_path: string
          model_version: string | null
          note: string | null
          pet_id: string | null
          recommendation: string | null
          status: string
          summary: string | null
          user_id: string
        }
        Insert: {
          ai_raw_json?: Json | null
          ai_escalation_signs?: string[]
          ai_findings?: string[]
          ai_next_step?: string | null
          ai_observation?: string | null
          ai_possible_reasons?: string[]
          ai_watch_items?: string[]
          bristol_score?: number | null
          captured_at?: string
          color?: string | null
          confidence?: number | null
          consistency?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          image_path: string
          model_version?: string | null
          note?: string | null
          pet_id?: string | null
          recommendation?: string | null
          status?: string
          summary?: string | null
          user_id?: string
        }
        Update: {
          ai_raw_json?: Json | null
          ai_escalation_signs?: string[]
          ai_findings?: string[]
          ai_next_step?: string | null
          ai_observation?: string | null
          ai_possible_reasons?: string[]
          ai_watch_items?: string[]
          bristol_score?: number | null
          captured_at?: string
          color?: string | null
          confidence?: number | null
          consistency?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          image_path?: string
          model_version?: string | null
          note?: string | null
          pet_id?: string | null
          recommendation?: string | null
          status?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poop_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_poop_job: {
        Args: never
        Returns: {
          job_id: string
          job_image_path: string
        }[]
      }
      create_photo_analysis_log: {
        Args: { p_image_path: string; p_user_id: string }
        Returns: {
          current_period_end: string
          free_analysis_remaining: number
          image_path: string
          is_subscribed: boolean
          log_id: string
          subscription_analysis_remaining: number
          usage_source: string
        }[]
      }
      refund_analysis_usage: {
        Args: { p_log_id: string; p_reason?: string }
        Returns: boolean
      }
      reset_stuck_jobs: { Args: never; Returns: number }
      sync_billing_account: {
        Args: {
          p_entitlement_id?: string
          p_environment?: string
          p_event_at?: string
          p_period_end?: string
          p_period_start?: string
          p_product_id?: string
          p_store?: string
          p_subscription_status: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          entitlement_id: string | null
          environment: string | null
          free_analysis_remaining: number
          last_revenuecat_event_at: string | null
          last_synced_at: string | null
          monthly_analysis_limit: number
          monthly_analysis_used: number
          product_id: string | null
          revenuecat_app_user_id: string
          store: string | null
          subscription_status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "billing_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
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
