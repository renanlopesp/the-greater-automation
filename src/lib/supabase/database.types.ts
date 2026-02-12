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
        Relationships: []
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      agents: {
        Row: {
          id: string
          team_id: string
          name: string
          description: string | null
          avatar_url: string | null
          avatar_type: string | null
          palette: string
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
          palette?: string
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
          palette?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agents_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'folders_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'workflows_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflows_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflows_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'workflow_triggers_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: true
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'workflow_steps_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'agent_skills_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_skills_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          agent_id: string | null
          status: RunStatus
          steps_used: number
          ai_credits_used: number
          trigger_type: TriggerType | null
          trigger_data: Json
          error: string | null
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
          trigger_type?: TriggerType | null
          trigger_data?: Json
          error?: string | null
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
          trigger_type?: TriggerType | null
          trigger_data?: Json
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_runs_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflow_runs_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_run_steps: {
        Row: {
          id: string
          run_id: string
          step_id: string | null
          step_position: number
          step_type: StepType
          status: RunStatus
          input: Json
          output: Json
          error: string | null
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
        }
        Insert: {
          id?: string
          run_id: string
          step_id?: string | null
          step_position: number
          step_type: StepType
          status?: RunStatus
          input?: Json
          output?: Json
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
        }
        Update: {
          id?: string
          run_id?: string
          step_id?: string | null
          step_position?: number
          step_type?: StepType
          status?: RunStatus
          input?: Json
          output?: Json
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_run_steps_run_id_fkey'
            columns: ['run_id']
            isOneToOne: false
            referencedRelation: 'workflow_runs'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'app_connections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'app_connections_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      step_test_results: {
        Row: {
          id: string
          workflow_id: string
          step_id: string | null
          step_position: number
          step_type: StepType
          step_name: string
          step_config: Json
          status: 'running' | 'success' | 'failed'
          output: Json
          error: string | null
          duration_ms: number
          tested_by: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          step_id?: string | null
          step_position: number
          step_type: StepType
          step_name: string
          step_config?: Json
          status: 'running' | 'success' | 'failed'
          output?: Json
          error?: string | null
          duration_ms: number
          tested_by: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          step_id?: string | null
          step_position?: number
          step_type?: StepType
          step_name?: string
          step_config?: Json
          status?: 'success' | 'failed'
          output?: Json
          error?: string | null
          duration_ms?: number
          tested_by?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'step_test_results_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
      }
      human_approvals: {
        Row: {
          id: string
          run_id: string
          step_id: string | null
          step_position: number
          workflow_id: string
          action_type: string
          assignee_type: string
          assignee: string | null
          prompt: string
          include_context: boolean
          context_data: Json
          status: string
          response: Json
          responded_by: string | null
          responded_at: string | null
          timeout_minutes: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          run_id: string
          step_id?: string | null
          step_position: number
          workflow_id: string
          action_type?: string
          assignee_type?: string
          assignee?: string | null
          prompt: string
          include_context?: boolean
          context_data?: Json
          status?: string
          response?: Json
          responded_by?: string | null
          responded_at?: string | null
          timeout_minutes?: number
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          run_id?: string
          step_id?: string | null
          step_position?: number
          workflow_id?: string
          action_type?: string
          assignee_type?: string
          assignee?: string | null
          prompt?: string
          include_context?: boolean
          context_data?: Json
          status?: string
          response?: Json
          responded_by?: string | null
          responded_at?: string | null
          timeout_minutes?: number
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'human_approvals_run_id_fkey'
            columns: ['run_id']
            isOneToOne: false
            referencedRelation: 'workflow_runs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'human_approvals_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'usage_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      unschedule_cron_job: {
        Args: { job_name: string }
        Returns: undefined
      }
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
export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting'
  | 'waiting_for_input'
export type ConnectionStatus = 'connected' | 'disconnected' | 'error'
