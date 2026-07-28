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
      addons: {
        Row: {
          category: string
          created_at: string
          description: string | null
          developer: string | null
          docs_url: string | null
          featured: boolean
          features: Json
          gallery_video: string | null
          icon: string | null
          id: string
          install_url: string | null
          long_description: string | null
          name: string
          price_monthly: number
          screenshots: Json
          slug: string
          status: string
          tagline: string | null
          updated_at: string
          version: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          developer?: string | null
          docs_url?: string | null
          featured?: boolean
          features?: Json
          gallery_video?: string | null
          icon?: string | null
          id?: string
          install_url?: string | null
          long_description?: string | null
          name: string
          price_monthly?: number
          screenshots?: Json
          slug: string
          status?: string
          tagline?: string | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          developer?: string | null
          docs_url?: string | null
          featured?: boolean
          features?: Json
          gallery_video?: string | null
          icon?: string | null
          id?: string
          install_url?: string | null
          long_description?: string | null
          name?: string
          price_monthly?: number
          screenshots?: Json
          slug?: string
          status?: string
          tagline?: string | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          hours: number | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          hours?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          tenant_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          hours?: number | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          meta_description: string | null
          published: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          meta_description?: string | null
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          meta_description?: string | null
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          employee_code: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id: string
          joined_at: string | null
          last_name: string
          manager_id: string | null
          phone: string | null
          position: string | null
          salary: number | null
          status: Database["public"]["Enums"]["employee_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          employee_code: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name: string
          id?: string
          joined_at?: string | null
          last_name: string
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          employee_code?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          first_name?: string
          id?: string
          joined_at?: string | null
          last_name?: string
          manager_id?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["employee_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string | null
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string | null
          created_at: string
          days_per_year: number
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          days_per_year?: number
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          days_per_year?: number
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          period_month: number
          period_year: number
          processed_at: string | null
          status: Database["public"]["Enums"]["payroll_status"]
          tenant_id: string
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          period_month: number
          period_year: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          tenant_id: string
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          period_month?: number
          period_year?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payroll_status"]
          tenant_id?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          breakdown: Json | null
          created_at: string
          deductions: number
          employee_id: string
          gross_salary: number
          id: string
          net_salary: number
          payroll_run_id: string | null
          period_month: number
          period_year: number
          tenant_id: string
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          deductions?: number
          employee_id: string
          gross_salary?: number
          id?: string
          net_salary?: number
          payroll_run_id?: string | null
          period_month: number
          period_year: number
          tenant_id: string
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          deductions?: number
          employee_id?: string
          gross_salary?: number
          id?: string
          net_salary?: number
          payroll_run_id?: string | null
          period_month?: number
          period_year?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_tenant: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      claim_super_admin: { Args: never; Returns: boolean }
      current_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      promote_to_super_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      revoke_super_admin: { Args: { target_user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "hr_admin" | "manager" | "employee"
      attendance_status: "present" | "absent" | "late" | "half_day" | "on_leave"
      employee_status: "active" | "on_leave" | "terminated"
      employment_type: "full_time" | "part_time" | "contract" | "intern"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      payroll_status: "draft" | "processing" | "paid"
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
      app_role: ["super_admin", "hr_admin", "manager", "employee"],
      attendance_status: ["present", "absent", "late", "half_day", "on_leave"],
      employee_status: ["active", "on_leave", "terminated"],
      employment_type: ["full_time", "part_time", "contract", "intern"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      payroll_status: ["draft", "processing", "paid"],
    },
  },
} as const
