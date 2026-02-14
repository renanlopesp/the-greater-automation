export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_conversations_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'agent_conversations'
            referencedColumns: ['id']
          },
        ]
      }
      agent_skill_runs: {
        Row: {
          id: string
          skill_id: string
          agent_id: string
          status: string
          trigger_data: Json | null
          condition_results: Json | null
          actions_executed: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          duration_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          skill_id: string
          agent_id: string
          status?: string
          trigger_data?: Json | null
          condition_results?: Json | null
          actions_executed?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          skill_id?: string
          agent_id?: string
          status?: string
          trigger_data?: Json | null
          condition_results?: Json | null
          actions_executed?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_skill_runs_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'agent_skills'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_skill_runs_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_skills: {
        Row: {
          action_template: Json | null
          actions: Json
          agent_id: string
          conditions: Json
          created_at: string
          description: string | null
          execution_mode: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          name: string
          run_count: number
          source: string | null
          trigger_config: Json | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          action_template?: Json | null
          actions?: Json
          agent_id: string
          conditions?: Json
          created_at?: string
          description?: string | null
          execution_mode?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          source?: string | null
          trigger_config?: Json | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          action_template?: Json | null
          actions?: Json
          agent_id?: string
          conditions?: Json
          created_at?: string
          description?: string | null
          execution_mode?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          source?: string | null
          trigger_config?: Json | null
          updated_at?: string
          workflow_id?: string | null
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
      agents: {
        Row: {
          avatar_type: string | null
          avatar_url: string | null
          conversation_starters: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model: string | null
          name: string
          palette: string
          status: string | null
          system_prompt: string | null
          team_id: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          avatar_type?: string | null
          avatar_url?: string | null
          conversation_starters?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name: string
          palette?: string
          status?: string | null
          system_prompt?: string | null
          team_id: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          avatar_type?: string | null
          avatar_url?: string | null
          conversation_starters?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          palette?: string
          status?: string | null
          system_prompt?: string | null
          team_id?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agents_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      app_connections: {
        Row: {
          account_id: string | null
          account_label: string | null
          app_id: string
          composio_connection_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_label?: string | null
          app_id?: string
          composio_connection_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_label?: string | null
          app_id?: string
          composio_connection_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'app_connections_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'app_connections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cron_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'folders_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'folders_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      human_approvals: {
        Row: {
          action_type: string
          assignee: string | null
          assignee_type: string
          context_data: Json | null
          created_at: string
          expires_at: string
          id: string
          include_context: boolean
          prompt: string
          responded_at: string | null
          responded_by: string | null
          response: Json | null
          run_id: string
          status: string
          step_id: string | null
          step_position: number
          timeout_minutes: number | null
          workflow_id: string
        }
        Insert: {
          action_type?: string
          assignee?: string | null
          assignee_type?: string
          context_data?: Json | null
          created_at?: string
          expires_at: string
          id?: string
          include_context?: boolean
          prompt: string
          responded_at?: string | null
          responded_by?: string | null
          response?: Json | null
          run_id: string
          status?: string
          step_id?: string | null
          step_position: number
          timeout_minutes?: number | null
          workflow_id: string
        }
        Update: {
          action_type?: string
          assignee?: string | null
          assignee_type?: string
          context_data?: Json | null
          created_at?: string
          expires_at?: string
          id?: string
          include_context?: boolean
          prompt?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: Json | null
          run_id?: string
          status?: string
          step_id?: string | null
          step_position?: number
          timeout_minutes?: number | null
          workflow_id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      step_test_results: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          expires_at: string
          id: string
          output: Json | null
          status: string
          step_config: Json
          step_id: string | null
          step_name: string
          step_position: number
          step_type: Database['public']['Enums']['step_type']
          tested_by: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          duration_ms: number
          error?: string | null
          expires_at?: string
          id?: string
          output?: Json | null
          status: string
          step_config?: Json
          step_id?: string | null
          step_name: string
          step_position: number
          step_type: Database['public']['Enums']['step_type']
          tested_by: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          expires_at?: string
          id?: string
          output?: Json | null
          status?: string
          step_config?: Json
          step_id?: string | null
          step_name?: string
          step_position?: number
          step_type?: Database['public']['Enums']['step_type']
          tested_by?: string
          workflow_id?: string
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
      team_members: {
        Row: {
          created_at: string
          role: Database['public']['Enums']['team_role']
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database['public']['Enums']['team_role']
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database['public']['Enums']['team_role']
          team_id?: string
          user_id?: string
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
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage: {
        Row: {
          ai_credits_limit: number
          ai_credits_used: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          steps_limit: number
          steps_used: number
          team_id: string
          updated_at: string
        }
        Insert: {
          ai_credits_limit?: number
          ai_credits_used?: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          steps_limit?: number
          steps_used?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          ai_credits_limit?: number
          ai_credits_used?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          steps_limit?: number
          steps_used?: number
          team_id?: string
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
      workflow_run_steps: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          run_id: string
          started_at: string | null
          status: Database['public']['Enums']['run_status']
          step_id: string | null
          step_position: number
          step_type: Database['public']['Enums']['step_type']
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: Database['public']['Enums']['run_status']
          step_id?: string | null
          step_position: number
          step_type: Database['public']['Enums']['step_type']
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['run_status']
          step_id?: string | null
          step_position?: number
          step_type?: Database['public']['Enums']['step_type']
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
      workflow_runs: {
        Row: {
          agent_id: string | null
          ai_credits_used: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          started_at: string | null
          status: Database['public']['Enums']['run_status']
          steps_used: number
          trigger_data: Json | null
          trigger_type: Database['public']['Enums']['trigger_type'] | null
          workflow_id: string
        }
        Insert: {
          agent_id?: string | null
          ai_credits_used?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['run_status']
          steps_used?: number
          trigger_data?: Json | null
          trigger_type?: Database['public']['Enums']['trigger_type'] | null
          workflow_id: string
        }
        Update: {
          agent_id?: string | null
          ai_credits_used?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['run_status']
          steps_used?: number
          trigger_data?: Json | null
          trigger_type?: Database['public']['Enums']['trigger_type'] | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_runs_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workflow_runs_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_steps: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          position: number
          type: Database['public']['Enums']['step_type']
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          position: number
          type: Database['public']['Enums']['step_type']
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          position?: number
          type?: Database['public']['Enums']['step_type']
          updated_at?: string
          workflow_id?: string
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
      workflow_triggers: {
        Row: {
          config: Json
          created_at: string
          id: string
          type: Database['public']['Enums']['trigger_type']
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          type: Database['public']['Enums']['trigger_type']
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          type?: Database['public']['Enums']['trigger_type']
          updated_at?: string
          workflow_id?: string
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
      workflows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          emoji: string | null
          folder_id: string | null
          id: string
          is_starred: boolean
          name: string
          published_at: string | null
          status: Database['public']['Enums']['workflow_status']
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          emoji?: string | null
          folder_id?: string | null
          id?: string
          is_starred?: boolean
          name: string
          published_at?: string | null
          status?: Database['public']['Enums']['workflow_status']
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          emoji?: string | null
          folder_id?: string | null
          id?: string
          is_starred?: boolean
          name?: string
          published_at?: string | null
          status?: Database['public']['Enums']['workflow_status']
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflows_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
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
            foreignKeyName: 'workflows_team_id_fkey'
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
      cleanup_expired_test_results: { Args: never; Returns: number }
      interval_to_cron: {
        Args: { p_interval_unit: string; p_interval_value: number }
        Returns: string
      }
      seed_demo_data: { Args: { user_uuid: string }; Returns: undefined }
      unschedule_cron_job: { Args: { job_name: string }; Returns: undefined }
      update_agent_config: {
        Args: {
          p_agent_id: string
          p_conversation_starters?: Json
          p_is_active?: boolean
          p_max_tokens?: number
          p_model?: string
          p_status?: string
          p_system_prompt?: string
          p_temperature?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      connection_status: 'connected' | 'disconnected' | 'error'
      run_status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'cancelled'
        | 'waiting'
        | 'waiting_for_input'
      step_type:
        | 'app'
        | 'ai'
        | 'flow_control'
        | 'web_scraping'
        | 'human_in_loop'
        | 'utility'
        | 'http'
        | 'sequence'
      team_role: 'owner' | 'admin' | 'member'
      trigger_type:
        | 'manual'
        | 'scheduled'
        | 'webhook'
        | 'form'
        | 'rss'
        | 'mailhook'
        | 'table'
        | 'mcp'
        | 'app'
      workflow_status: 'draft' | 'published'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      connection_status: ['connected', 'disconnected', 'error'],
      run_status: [
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
        'waiting',
        'waiting_for_input',
      ],
      step_type: [
        'app',
        'ai',
        'flow_control',
        'web_scraping',
        'human_in_loop',
        'utility',
        'http',
        'sequence',
      ],
      team_role: ['owner', 'admin', 'member'],
      trigger_type: [
        'manual',
        'scheduled',
        'webhook',
        'form',
        'rss',
        'mailhook',
        'table',
        'mcp',
        'app',
      ],
      workflow_status: ['draft', 'published'],
    },
  },
} as const
