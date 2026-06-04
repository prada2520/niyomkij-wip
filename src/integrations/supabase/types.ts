export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WipStatusEnum =
  | 'รับเข้าคลัง'
  | 'รอพิมพ์' | 'กำลังพิมพ์' | 'คืนคลัง (หลังพิมพ์)'
  | 'รอปั๊ม' | 'กำลังปั๊ม' | 'คืนคลัง (หลังปั๊ม)'
  | 'รอประกอบกล่อง' | 'กำลังประกอบกล่อง'
  | 'รอเคลือบ' | 'กำลังเคลือบ'
  | 'รอปะลูกฟูก' | 'กำลังปะลูกฟูก'
  | 'พร้อมส่งมอบ'

export type UserRoleEnum = 'SUPER_ADMIN' | 'OPERATOR' | 'EXECUTIVE'

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          role: UserRoleEnum
          department: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          role?: UserRoleEnum
          department?: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          role?: UserRoleEnum
          department?: string
        }
      }
      wip_jobs: {
        Row: {
          id: string
          production_order_no: string
          customer: string
          product_name: string
          box_size: string
          quantity: number
          date_received: string
          delivery_deadline: string | null
          current_status: WipStatusEnum
          next_process: string
          responsible_dept: string
          remarks: string
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          production_order_no: string
          customer: string
          product_name?: string
          box_size?: string
          quantity?: number
          date_received?: string
          delivery_deadline?: string | null
          current_status?: WipStatusEnum
          next_process?: string
          responsible_dept?: string
          remarks?: string
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          production_order_no?: string
          customer?: string
          product_name?: string
          box_size?: string
          quantity?: number
          date_received?: string
          delivery_deadline?: string | null
          current_status?: WipStatusEnum
          next_process?: string
          responsible_dept?: string
          remarks?: string
          image_url?: string | null
          updated_at?: string
        }
      }
      wip_movements: {
        Row: {
          id: string
          job_id: string
          production_order_no: string
          date_time: string
          from_status: WipStatusEnum
          to_status: WipStatusEnum
          department: string
          operator: string
          quantity: number
          remarks: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          production_order_no: string
          date_time?: string
          from_status: WipStatusEnum
          to_status: WipStatusEnum
          department?: string
          operator?: string
          quantity?: number
          remarks?: string
          created_at?: string
        }
        Update: never
      }
      audit_logs: {
        Row: {
          id: string
          date_time: string
          user_name: string
          action: string
          target: string
          details: string
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date_time?: string
          user_name: string
          action: string
          target: string
          details?: string
          user_id?: string | null
          created_at?: string
        }
        Update: never
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: UserRoleEnum
      }
    }
    Enums: {
      wip_status: WipStatusEnum
      user_role: UserRoleEnum
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export const Constants = {
  public: { Enums: {} },
} as const
