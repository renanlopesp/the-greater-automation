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
          created_by: string | null
          id: string
          is_active: boolean
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          sender_id?: string | null
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
      agent_skills: {
        Row: {
          agent_id: string
          content: string
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          metadata: Json
          name: string
          parameters: Json | null
          source: string
          type: string
          updated_at: string | null
          version: number
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json
          name: string
          parameters?: Json | null
          source?: string
          type?: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json
          name?: string
          parameters?: Json | null
          source?: string
          type?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'agent_knowledge_skills_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_workflow_runs: {
        Row: {
          actions_executed: Json | null
          agent_id: string
          completed_at: string | null
          condition_results: Json | null
          created_at: string | null
          current_step_index: number | null
          duration_ms: number | null
          error: string | null
          event_log_id: string | null
          id: string
          pipeline_steps: Json | null
          started_at: string | null
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          actions_executed?: Json | null
          agent_id: string
          completed_at?: string | null
          condition_results?: Json | null
          created_at?: string | null
          current_step_index?: number | null
          duration_ms?: number | null
          error?: string | null
          event_log_id?: string | null
          id?: string
          pipeline_steps?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          actions_executed?: Json | null
          agent_id?: string
          completed_at?: string | null
          condition_results?: Json | null
          created_at?: string | null
          current_step_index?: number | null
          duration_ms?: number | null
          error?: string | null
          event_log_id?: string | null
          id?: string
          pipeline_steps?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_skill_runs_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_skill_runs_skill_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'agent_workflows'
            referencedColumns: ['id']
          },
        ]
      }
      agent_workflows: {
        Row: {
          action_template: Json | null
          actions: Json | null
          agent_id: string
          conditions: Json | null
          created_at: string
          description: string | null
          execution_mode: string | null
          id: string
          is_enabled: boolean | null
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
          actions?: Json | null
          agent_id: string
          conditions?: Json | null
          created_at?: string
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_enabled?: boolean | null
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
          actions?: Json | null
          agent_id?: string
          conditions?: Json | null
          created_at?: string
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_enabled?: boolean | null
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
          is_orchestrator: boolean
          max_tokens: number | null
          model: string | null
          name: string
          notification_settings: Json
          palette: string
          snewclaw_instance_id: string | null
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
          is_orchestrator?: boolean
          max_tokens?: number | null
          model?: string | null
          name: string
          notification_settings?: Json
          palette?: string
          snewclaw_instance_id?: string | null
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
          is_orchestrator?: boolean
          max_tokens?: number | null
          model?: string | null
          name?: string
          notification_settings?: Json
          palette?: string
          snewclaw_instance_id?: string | null
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
            foreignKeyName: 'agents_snewclaw_instance_id_fkey'
            columns: ['snewclaw_instance_id']
            isOneToOne: false
            referencedRelation: 'snewclaw_instances'
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
      message_feedback: {
        Row: {
          created_at: string
          feedback: string
          id: string
          message_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback: string
          id?: string
          message_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string
          id?: string
          message_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_feedback_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'agent_messages'
            referencedColumns: ['id']
          },
        ]
      }
      messaging_links: {
        Row: {
          channel_type: string
          conversation_id: string | null
          created_at: string | null
          external_chat_id: string
          external_username: string | null
          id: string
          is_verified: boolean
          team_id: string
          user_id: string
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          channel_type?: string
          conversation_id?: string | null
          created_at?: string | null
          external_chat_id: string
          external_username?: string | null
          id?: string
          is_verified?: boolean
          team_id: string
          user_id: string
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          channel_type?: string
          conversation_id?: string | null
          created_at?: string | null
          external_chat_id?: string
          external_username?: string | null
          id?: string
          is_verified?: boolean
          team_id?: string
          user_id?: string
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messaging_links_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'agent_conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messaging_links_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_enabled: boolean
          email_enabled: boolean
          failures_enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_enabled?: boolean
          email_enabled?: boolean
          failures_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_enabled?: boolean
          email_enabled?: boolean
          failures_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          team_id: string
          title: string
          type: Database['public']['Enums']['notification_type']
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          team_id: string
          title: string
          type?: Database['public']['Enums']['notification_type']
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          team_id?: string
          title?: string
          type?: Database['public']['Enums']['notification_type']
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
      }
      nuvemshop_webhooks: {
        Row: {
          created_at: string
          event: string
          external_webhook_id: string
          id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          event: string
          external_webhook_id: string
          id?: string
          store_id: string
        }
        Update: {
          created_at?: string
          event?: string
          external_webhook_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'nuvemshop_webhooks_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      plans: {
        Row: {
          ai_credits_limit: number
          created_at: string
          description: string | null
          features: Json
          id: string
          max_snewclaw_instances: number
          max_team_members: number
          name: string
          snewclaw_idle_timeout_minutes: number
          sort_order: number
          steps_limit: number
          stripe_product_id: string | null
        }
        Insert: {
          ai_credits_limit?: number
          created_at?: string
          description?: string | null
          features?: Json
          id: string
          max_snewclaw_instances?: number
          max_team_members?: number
          name: string
          snewclaw_idle_timeout_minutes?: number
          sort_order?: number
          steps_limit?: number
          stripe_product_id?: string | null
        }
        Update: {
          ai_credits_limit?: number
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          max_snewclaw_instances?: number
          max_team_members?: number
          name?: string
          snewclaw_idle_timeout_minutes?: number
          sort_order?: number
          steps_limit?: number
          stripe_product_id?: string | null
        }
        Relationships: []
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
      snewclaw_commands: {
        Row: {
          command: string
          created_at: string
          id: string
          instance_id: string
          payload: Json
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          command: string
          created_at?: string
          id?: string
          instance_id: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          command?: string
          created_at?: string
          id?: string
          instance_id?: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'snewclaw_commands_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'snewclaw_instances'
            referencedColumns: ['id']
          },
        ]
      }
      snewclaw_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          instance_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          instance_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'snewclaw_events_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'snewclaw_instances'
            referencedColumns: ['id']
          },
        ]
      }
      snewclaw_instances: {
        Row: {
          config: Json
          consecutive_failures: number
          created_at: string
          error_message: string | null
          fly_machine_id: string | null
          fly_volume_id: string | null
          id: string
          last_activity_at: string | null
          last_health_check_at: string | null
          region: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          consecutive_failures?: number
          created_at?: string
          error_message?: string | null
          fly_machine_id?: string | null
          fly_volume_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_health_check_at?: string | null
          region?: string
          status?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          consecutive_failures?: number
          created_at?: string
          error_message?: string | null
          fly_machine_id?: string | null
          fly_volume_id?: string | null
          id?: string
          last_activity_at?: string | null
          last_health_check_at?: string | null
          region?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'snewclaw_instances_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      snewclaw_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          instance_id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          instance_id: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          instance_id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'snewclaw_messages_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'snewclaw_instances'
            referencedColumns: ['id']
          },
        ]
      }
      snewclaw_secrets: {
        Row: {
          created_at: string
          encrypted_value: string
          id: string
          iv: string
          key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          id?: string
          iv: string
          key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          id?: string
          iv?: string
          key?: string
          updated_at?: string
          user_id?: string
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
      store_abandoned_cart_notifications: {
        Row: {
          checkout_id: number
          checkout_total: number | null
          customer_email: string | null
          customer_name: string | null
          id: string
          notified_at: string
          recovered_at: string | null
          store_id: string
        }
        Insert: {
          checkout_id: number
          checkout_total?: number | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          notified_at?: string
          recovered_at?: string | null
          store_id: string
        }
        Update: {
          checkout_id?: number
          checkout_total?: number | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          notified_at?: string
          recovered_at?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_abandoned_cart_notifications_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          external_id: string
          id: string
          items: Json
          order_number: string | null
          ordered_at: string
          payment_status: string | null
          status: string
          store_id: string
          total: number
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_id: string
          id?: string
          items?: Json
          order_number?: string | null
          ordered_at: string
          payment_status?: string | null
          status: string
          store_id: string
          total: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string
          id?: string
          items?: Json
          order_number?: string | null
          ordered_at?: string
          payment_status?: string | null
          status?: string
          store_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'store_orders_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      store_price_history: {
        Row: {
          currency: string | null
          id: string
          monitor_id: string
          price: number
          scraped_at: string
        }
        Insert: {
          currency?: string | null
          id?: string
          monitor_id: string
          price: number
          scraped_at?: string
        }
        Update: {
          currency?: string | null
          id?: string
          monitor_id?: string
          price?: number
          scraped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_price_history_monitor_id_fkey'
            columns: ['monitor_id']
            isOneToOne: false
            referencedRelation: 'store_price_monitors'
            referencedColumns: ['id']
          },
        ]
      }
      store_price_monitors: {
        Row: {
          alert_threshold_pct: number | null
          created_at: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_price: number | null
          marketplace: string
          own_product_id: string | null
          previous_price: number | null
          price_changed_at: string | null
          product_name: string
          store_id: string
          url: string | null
          workflow_id: string | null
        }
        Insert: {
          alert_threshold_pct?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_price?: number | null
          marketplace: string
          own_product_id?: string | null
          previous_price?: number | null
          price_changed_at?: string | null
          product_name: string
          store_id: string
          url?: string | null
          workflow_id?: string | null
        }
        Update: {
          alert_threshold_pct?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_price?: number | null
          marketplace?: string
          own_product_id?: string | null
          previous_price?: number | null
          price_changed_at?: string | null
          product_name?: string
          store_id?: string
          url?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'store_price_monitors_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'store_price_monitors_own_product_id_fkey'
            columns: ['own_product_id']
            isOneToOne: false
            referencedRelation: 'store_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'store_price_monitors_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'workflows'
            referencedColumns: ['id']
          },
        ]
      }
      store_products: {
        Row: {
          cost_price: number | null
          created_at: string
          external_id: string
          external_updated_at: string | null
          id: string
          images: string[]
          is_published: boolean
          last_synced_at: string
          name: string
          price: number | null
          sku: string | null
          stock_quantity: number
          store_id: string
          variants: Json
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          external_id: string
          external_updated_at?: string | null
          id?: string
          images?: string[]
          is_published?: boolean
          last_synced_at?: string
          name: string
          price?: number | null
          sku?: string | null
          stock_quantity?: number
          store_id: string
          variants?: Json
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          external_id?: string
          external_updated_at?: string | null
          id?: string
          images?: string[]
          is_published?: boolean
          last_synced_at?: string
          name?: string
          price?: number | null
          sku?: string | null
          stock_quantity?: number
          store_id?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'store_products_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      store_stock_alerts: {
        Row: {
          cooldown_minutes: number
          created_at: string
          id: string
          is_enabled: boolean
          last_triggered_at: string | null
          product_id: string | null
          store_id: string
          threshold: number
        }
        Insert: {
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          product_id?: string | null
          store_id: string
          threshold?: number
        }
        Update: {
          cooldown_minutes?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_triggered_at?: string | null
          product_id?: string | null
          store_id?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: 'store_stock_alerts_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'store_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'store_stock_alerts_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          onboarding_completed: boolean
          platform: string
          platform_access_token: string | null
          platform_store_id: string | null
          platform_url: string | null
          priorities: string[]
          segment: string
          settings: Json
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name: string
          onboarding_completed?: boolean
          platform: string
          platform_access_token?: string | null
          platform_store_id?: string | null
          platform_url?: string | null
          priorities?: string[]
          segment: string
          settings?: Json
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          onboarding_completed?: boolean
          platform?: string
          platform_access_token?: string | null
          platform_store_id?: string | null
          platform_url?: string | null
          priorities?: string[]
          segment?: string
          settings?: Json
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stores_team_id_fkey'
            columns: ['team_id']
            isOneToOne: true
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'subscriptions_team_id_fkey'
            columns: ['team_id']
            isOneToOne: true
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database['public']['Enums']['team_role']
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database['public']['Enums']['team_role']
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database['public']['Enums']['team_role']
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_invitations_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
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
          has_store: boolean
          id: string
          name: string
          plan_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          has_store?: boolean
          id?: string
          name: string
          plan_id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          has_store?: boolean
          id?: string
          name?: string
          plan_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_plan_id_fkey'
            columns: ['plan_id']
            isOneToOne: false
            referencedRelation: 'plans'
            referencedColumns: ['id']
          },
        ]
      }
      telegram_message_queue: {
        Row: {
          attempts: number
          chat_id: string
          created_at: string | null
          error: string | null
          id: string
          link_id: string | null
          message_text: string
          processed_at: string | null
          status: string
          username: string | null
        }
        Insert: {
          attempts?: number
          chat_id: string
          created_at?: string | null
          error?: string | null
          id?: string
          link_id?: string | null
          message_text: string
          processed_at?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          attempts?: number
          chat_id?: string
          created_at?: string | null
          error?: string | null
          id?: string
          link_id?: string | null
          message_text?: string
          processed_at?: string | null
          status?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'telegram_message_queue_link_id_fkey'
            columns: ['link_id']
            isOneToOne: false
            referencedRelation: 'messaging_links'
            referencedColumns: ['id']
          },
        ]
      }
      trigger_subscriptions: {
        Row: {
          agent_id: string
          agent_workflow_id: string
          app_id: string
          composio_trigger_id: string
          created_at: string
          event_count: number
          field_mappings: Json | null
          filters: Json | null
          id: string
          is_enabled: boolean
          last_event_at: string | null
          trigger_config: Json | null
          trigger_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          agent_workflow_id: string
          app_id: string
          composio_trigger_id: string
          created_at?: string
          event_count?: number
          field_mappings?: Json | null
          filters?: Json | null
          id?: string
          is_enabled?: boolean
          last_event_at?: string | null
          trigger_config?: Json | null
          trigger_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          agent_workflow_id?: string
          app_id?: string
          composio_trigger_id?: string
          created_at?: string
          event_count?: number
          field_mappings?: Json | null
          filters?: Json | null
          id?: string
          is_enabled?: boolean
          last_event_at?: string | null
          trigger_config?: Json | null
          trigger_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trigger_subscriptions_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trigger_subscriptions_agent_workflow_id_fkey'
            columns: ['agent_workflow_id']
            isOneToOne: false
            referencedRelation: 'agent_workflows'
            referencedColumns: ['id']
          },
        ]
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
      get_agent_available_connections: {
        Args: { p_agent_id: string; p_user_id: string }
        Returns: {
          account_label: string
          app_id: string
          connection_user_id: string
          is_own_connection: boolean
        }[]
      }
      get_user_email: { Args: { user_uuid: string }; Returns: string }
      get_user_team_ids: { Args: { user_uuid: string }; Returns: string[] }
      has_pending_invitation: {
        Args: { target_team_id: string; user_email: string }
        Returns: boolean
      }
      increment_ai_credits: {
        Args: { p_credits: number; p_team_id: string }
        Returns: undefined
      }
      interval_to_cron: {
        Args: { p_interval_unit: string; p_interval_value: number }
        Returns: string
      }
      is_team_admin_or_owner: {
        Args: { target_team_id: string; user_uuid: string }
        Returns: boolean
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
      notification_type:
        | 'workflow_published'
        | 'workflow_unpublished'
        | 'workflow_run_completed'
        | 'workflow_run_failed'
        | 'workflow_run_approval_required'
        | 'general'
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
      notification_type: [
        'workflow_published',
        'workflow_unpublished',
        'workflow_run_completed',
        'workflow_run_failed',
        'workflow_run_approval_required',
        'general',
      ],
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
