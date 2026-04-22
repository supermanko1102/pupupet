export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      pets: {
        Row: {
          birthday: string | null;
          breed: string | null;
          created_at: string;
          id: string;
          name: string;
          notes: string | null;
          species: 'dog' | 'cat' | 'other';
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          birthday?: string | null;
          breed?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          notes?: string | null;
          species?: 'dog' | 'cat' | 'other';
          user_id?: string;
          weight_kg?: number | null;
        };
        Update: {
          birthday?: string | null;
          breed?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          species?: 'dog' | 'cat' | 'other';
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      poop_logs: {
        Row: {
          bristol_score: number | null;
          captured_at: string;
          color: string | null;
          confidence: number | null;
          consistency: string | null;
          created_at: string;
          id: string;
          image_path: string;
          model_version: string | null;
          pet_id: string | null;
          recommendation: string | null;
          risk_level: 'normal' | 'observe' | 'vet' | null;
          status: 'uploaded' | 'analyzing' | 'done' | 'failed';
          summary: string | null;
          user_id: string;
        };
        Insert: {
          bristol_score?: number | null;
          captured_at?: string;
          color?: string | null;
          confidence?: number | null;
          consistency?: string | null;
          created_at?: string;
          id?: string;
          image_path: string;
          model_version?: string | null;
          pet_id?: string | null;
          recommendation?: string | null;
          risk_level?: 'normal' | 'observe' | 'vet' | null;
          status?: 'uploaded' | 'analyzing' | 'done' | 'failed';
          summary?: string | null;
          user_id?: string;
        };
        Update: {
          bristol_score?: number | null;
          captured_at?: string;
          color?: string | null;
          confidence?: number | null;
          consistency?: string | null;
          created_at?: string;
          id?: string;
          image_path?: string;
          model_version?: string | null;
          pet_id?: string | null;
          recommendation?: string | null;
          risk_level?: 'normal' | 'observe' | 'vet' | null;
          status?: 'uploaded' | 'analyzing' | 'done' | 'failed';
          summary?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'poop_logs_pet_id_fkey';
            columns: ['pet_id'];
            isOneToOne: false;
            referencedRelation: 'pets';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
