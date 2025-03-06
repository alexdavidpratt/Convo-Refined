export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          topics: Json
          responses: Json
          created_at: string
          updated_at: string
          scheduled_date: string | null
          description: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          topics?: Json
          responses?: Json
          created_at?: string
          updated_at?: string
          scheduled_date?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          topics?: Json
          responses?: Json
          created_at?: string
          updated_at?: string
          scheduled_date?: string | null
          description?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          created_at?: string
        }
      }
    }
  }
}