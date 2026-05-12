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
      activities: {
        Row: {
          content: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["activity_entity"]
          id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["activity_entity"]
          id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["activity_entity"]
          id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["contact_status"]
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          assigned_to: string | null
          client_name: string
          created_at: string
          due_date: string | null
          id: string
          position: number
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          user_id: string
          value: number
        }
        Insert: {
          assigned_to?: string | null
          client_name: string
          created_at?: string
          due_date?: string | null
          id?: string
          position?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          user_id: string
          value?: number
        }
        Update: {
          assigned_to?: string | null
          client_name?: string
          created_at?: string
          due_date?: string | null
          id?: string
          position?: number
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_email: string | null
          client_name: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          user_id: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          user_id: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          contact_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          created_at: string
          id: string
          month: string
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_name: string
          created_at: string
          id: string
          logo_url: string | null
          timezone: string
        }
        Insert: {
          agency_name?: string
          created_at?: string
          id: string
          logo_url?: string | null
          timezone?: string
        }
        Update: {
          agency_name?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          timezone?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          linked_contact_id: string | null
          linked_contact_name: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          linked_contact_id?: string | null
          linked_contact_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          linked_contact_id?: string | null
          linked_contact_name?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_linked_contact_id_fkey"
            columns: ["linked_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_demo_data: { Args: { p_user: string }; Returns: undefined }
    }
    Enums: {
      activity_entity: "contact" | "lead" | "deal"
      activity_type: "note" | "status_change" | "follow_up"
      contact_status: "lead" | "client" | "inactive"
      deal_stage: "discovery" | "proposal" | "negotiation" | "won" | "lost"
      invoice_status: "draft" | "sent" | "paid" | "overdue"
      lead_source: "referral" | "website" | "social_media" | "cold_outreach"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "converted"
      task_priority: "low" | "medium" | "high"
      task_status: "pending" | "in_progress" | "done"
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
    Enums: {
      activity_entity: ["contact", "lead", "deal"],
      activity_type: ["note", "status_change", "follow_up"],
      contact_status: ["lead", "client", "inactive"],
      deal_stage: ["discovery", "proposal", "negotiation", "won", "lost"],
      invoice_status: ["draft", "sent", "paid", "overdue"],
      lead_source: ["referral", "website", "social_media", "cold_outreach"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "converted",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: ["pending", "in_progress", "done"],
    },
  },
} as const
