export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: TeamRole
          created_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: TeamRole
          created_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: TeamRole
          created_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string | null
          avatar_url: string | null
          avatar_type: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          description?: string | null
          avatar_url?: string | null
          avatar_type?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          description?: string | null
          avatar_url?: string | null
          avatar_type?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          team_id: string
          name: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflows: {
        Row: {
          id: string
          team_id: string
          folder_id: string | null
          name: string
          emoji: string | null
          description: string | null
          status: WorkflowStatus
          is_starred: boolean
          created_by: string
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          folder_id?: string | null
          name: string
          emoji?: string | null
          description?: string | null
          status?: WorkflowStatus
          is_starred?: boolean
          created_by: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          folder_id?: string | null
          name?: string
          emoji?: string | null
          description?: string | null
          status?: WorkflowStatus
          is_starred?: boolean
          created_by?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_triggers: {
        Row: {
          id: string
          workflow_id: string
          type: TriggerType
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          type: TriggerType
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          type?: TriggerType
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      workflow_steps: {
        Row: {
          id: string
          workflow_id: string
          position: number
          type: StepType
          name: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          position: number
          type: StepType
          name: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          position?: number
          type?: StepType
          name?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      agent_skills: {
        Row: {
          id: string
          agent_id: string
          workflow_id: string
          name: string
          last_run_at: string | null
          run_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          workflow_id: string
          name: string
          last_run_at?: string | null
          run_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          workflow_id?: string
          name?: string
          last_run_at?: string | null
          run_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          agent_id: string | null
          status: RunStatus
          steps_used: number
          ai_credits_used: number
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          agent_id?: string | null
          status?: RunStatus
          steps_used?: number
          ai_credits_used?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          agent_id?: string | null
          status?: RunStatus
          steps_used?: number
          ai_credits_used?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      app_connections: {
        Row: {
          id: string
          user_id: string
          team_id: string
          app_name: string
          app_logo_url: string | null
          status: ConnectionStatus
          credentials: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
          app_name: string
          app_logo_url?: string | null
          status?: ConnectionStatus
          credentials?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
          app_name?: string
          app_logo_url?: string | null
          status?: ConnectionStatus
          credentials?: Json
          created_at?: string
          updated_at?: string
        }
      }
      usage: {
        Row: {
          id: string
          team_id: string
          period_start: string
          period_end: string
          steps_used: number
          steps_limit: number
          ai_credits_used: number
          ai_credits_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          period_start: string
          period_end: string
          steps_used?: number
          steps_limit?: number
          ai_credits_used?: number
          ai_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          period_start?: string
          period_end?: string
          steps_used?: number
          steps_limit?: number
          ai_credits_used?: number
          ai_credits_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      team_role: TeamRole
      workflow_status: WorkflowStatus
      trigger_type: TriggerType
      step_type: StepType
      run_status: RunStatus
      connection_status: ConnectionStatus
    }
  }
}

// Enum union types matching PostgreSQL enums
export type TeamRole = 'owner' | 'admin' | 'member'
export type WorkflowStatus = 'draft' | 'published'
export type TriggerType =
  | 'manual'
  | 'scheduled'
  | 'webhook'
  | 'form'
  | 'rss'
  | 'mailhook'
  | 'table'
  | 'mcp'
  | 'app'
export type StepType =
  | 'app'
  | 'ai'
  | 'flow_control'
  | 'web_scraping'
  | 'human_in_loop'
  | 'utility'
  | 'http'
  | 'sequence'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ConnectionStatus = 'connected' | 'disconnected' | 'error'
