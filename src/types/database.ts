export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4'
  }
  public: {
    Tables: {
      agent_conversations: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          team_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
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
          {
            foreignKeyName: 'agent_conversations_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_conversations_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
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
          {
            foreignKeyName: 'agent_messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      agent_modules: {
        Row: {
          agent_id: string
          config: Json | null
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          module_type: string
          name: string
          required_connections: string[] | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          module_type: string
          name: string
          required_connections?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          module_type?: string
          name?: string
          required_connections?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_modules_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_notification_settings: {
        Row: {
          agent_id: string
          created_at: string
          daily_summary_enabled: boolean | null
          id: string
          report_hour: number | null
          telegram_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          daily_summary_enabled?: boolean | null
          id?: string
          report_hour?: number | null
          telegram_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          daily_summary_enabled?: boolean | null
          id?: string
          report_hour?: number | null
          telegram_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_notification_settings_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_skills: {
        Row: {
          agent_id: string
          content: string | null
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          name: string
          source: string | null
          type: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          agent_id: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          name: string
          source?: string | null
          type?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          agent_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          name?: string
          source?: string | null
          type?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'agent_skills_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agent_workflows: {
        Row: {
          action_template: Json | null
          agent_id: string
          created_at: string
          description: string | null
          execution_mode: string | null
          id: string
          is_enabled: boolean | null
          last_run_at: string | null
          module_id: string | null
          name: string
          run_count: number | null
          source: string | null
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          action_template?: Json | null
          agent_id: string
          created_at?: string
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          module_id?: string | null
          name: string
          run_count?: number | null
          source?: string | null
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          action_template?: Json | null
          agent_id?: string
          created_at?: string
          description?: string | null
          execution_mode?: string | null
          id?: string
          is_enabled?: boolean | null
          last_run_at?: string | null
          module_id?: string | null
          name?: string
          run_count?: number | null
          source?: string | null
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_workflows_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string | null
          avatar_type: string | null
          avatar_url: string | null
          conversation_starters: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          is_orchestrator: boolean | null
          max_tokens: number | null
          model: string | null
          name: string
          palette: string
          report_kind: string | null
          status: string | null
          system_prompt: string | null
          team_id: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          agent_type?: string | null
          avatar_type?: string | null
          avatar_url?: string | null
          conversation_starters?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_orchestrator?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name: string
          palette?: string
          report_kind?: string | null
          status?: string | null
          system_prompt?: string | null
          team_id: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          agent_type?: string | null
          avatar_type?: string | null
          avatar_url?: string | null
          conversation_starters?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_orchestrator?: boolean | null
          max_tokens?: number | null
          model?: string | null
          name?: string
          palette?: string
          report_kind?: string | null
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
          app_logo_url: string | null
          app_name: string
          created_at: string
          credentials: Json
          id: string
          status: Database['public']['Enums']['connection_status']
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_logo_url?: string | null
          app_name: string
          created_at?: string
          credentials?: Json
          id?: string
          status?: Database['public']['Enums']['connection_status']
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_logo_url?: string | null
          app_name?: string
          created_at?: string
          credentials?: Json
          id?: string
          status?: Database['public']['Enums']['connection_status']
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
      brand_dna: {
        Row: {
          alerts: Json | null
          audience: string | null
          average_ticket: number | null
          brand_texts: Json | null
          color_palette: Json | null
          created_at: string | null
          fonts: Json | null
          greeting: string | null
          id: string
          intro: string | null
          is_confirmed: boolean | null
          niche: string | null
          opportunities: Json | null
          owner_name: string | null
          palette_description: string | null
          platform: string | null
          positioning: string | null
          recommended_skills: Json | null
          revenue_projection: Json | null
          store_name: string | null
          strengths: Json | null
          team_id: string
          tone: string | null
          updated_at: string | null
          words_to_avoid: string[] | null
          words_to_use: string[] | null
        }
        Insert: {
          alerts?: Json | null
          audience?: string | null
          average_ticket?: number | null
          brand_texts?: Json | null
          color_palette?: Json | null
          created_at?: string | null
          fonts?: Json | null
          greeting?: string | null
          id?: string
          intro?: string | null
          is_confirmed?: boolean | null
          niche?: string | null
          opportunities?: Json | null
          owner_name?: string | null
          palette_description?: string | null
          platform?: string | null
          positioning?: string | null
          recommended_skills?: Json | null
          revenue_projection?: Json | null
          store_name?: string | null
          strengths?: Json | null
          team_id: string
          tone?: string | null
          updated_at?: string | null
          words_to_avoid?: string[] | null
          words_to_use?: string[] | null
        }
        Update: {
          alerts?: Json | null
          audience?: string | null
          average_ticket?: number | null
          brand_texts?: Json | null
          color_palette?: Json | null
          created_at?: string | null
          fonts?: Json | null
          greeting?: string | null
          id?: string
          intro?: string | null
          is_confirmed?: boolean | null
          niche?: string | null
          opportunities?: Json | null
          owner_name?: string | null
          palette_description?: string | null
          platform?: string | null
          positioning?: string | null
          recommended_skills?: Json | null
          revenue_projection?: Json | null
          store_name?: string | null
          strengths?: Json | null
          team_id?: string
          tone?: string | null
          updated_at?: string | null
          words_to_avoid?: string[] | null
          words_to_use?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: 'brand_dna_team_id_fkey'
            columns: ['team_id']
            isOneToOne: true
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          skill_slug: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          skill_slug?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          skill_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          anthropic_session_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          task_id: string | null
          team_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anthropic_session_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          task_id?: string | null
          team_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anthropic_session_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          task_id?: string | null
          team_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_user_id_fkey'
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
      message_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_feedback_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
          external_chat_id?: string
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          cta_url: string | null
          id: string
          is_read: boolean | null
          source_agent_id: string | null
          team_id: string
          title: string
          urgency: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_url?: string | null
          id?: string
          is_read?: boolean | null
          source_agent_id?: string | null
          team_id: string
          title: string
          urgency?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_url?: string | null
          id?: string
          is_read?: boolean | null
          source_agent_id?: string | null
          team_id?: string
          title?: string
          urgency?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_source_agent_id_fkey'
            columns: ['source_agent_id']
            isOneToOne: false
            referencedRelation: 'agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      nuvemshop_webhooks: {
        Row: {
          created_at: string
          event: string
          external_webhook_id: string | null
          id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          event: string
          external_webhook_id?: string | null
          id?: string
          store_id: string
        }
        Update: {
          created_at?: string
          event?: string
          external_webhook_id?: string | null
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
          max_team_members: number
          name: string
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
          max_team_members?: number
          name: string
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
          max_team_members?: number
          name?: string
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
      skill_executions: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          input: Json | null
          output: Json | null
          parent_execution_id: string | null
          skill_id: string
          status: string
          task_id: string | null
          team_id: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          parent_execution_id?: string | null
          skill_id: string
          status?: string
          task_id?: string | null
          team_id: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          parent_execution_id?: string | null
          skill_id?: string
          status?: string
          task_id?: string | null
          team_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'skill_executions_parent_execution_id_fkey'
            columns: ['parent_execution_id']
            isOneToOne: false
            referencedRelation: 'skill_executions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skill_executions_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'skills'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skill_executions_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'skill_executions_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      skills: {
        Row: {
          category: string
          color: string | null
          config_schema: Json | null
          connected_skills: Json | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          emoji: string | null
          expected_results: string[] | null
          icon: string | null
          id: string
          input_schema: Json | null
          is_native: boolean | null
          knowledge: Json | null
          name: string
          output_schema: Json | null
          outputs: Json | null
          phase: number
          requires_connections: string[] | null
          slug: string
          stats: Json | null
          status: string
          system_prompt: string | null
          team_id: string
          tools: Json | null
          updated_at: string | null
          what_it_does: Json | null
        }
        Insert: {
          category: string
          color?: string | null
          config_schema?: Json | null
          connected_skills?: Json | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          emoji?: string | null
          expected_results?: string[] | null
          icon?: string | null
          id?: string
          input_schema?: Json | null
          is_native?: boolean | null
          knowledge?: Json | null
          name: string
          output_schema?: Json | null
          outputs?: Json | null
          phase?: number
          requires_connections?: string[] | null
          slug: string
          stats?: Json | null
          status?: string
          system_prompt?: string | null
          team_id: string
          tools?: Json | null
          updated_at?: string | null
          what_it_does?: Json | null
        }
        Update: {
          category?: string
          color?: string | null
          config_schema?: Json | null
          connected_skills?: Json | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          emoji?: string | null
          expected_results?: string[] | null
          icon?: string | null
          id?: string
          input_schema?: Json | null
          is_native?: boolean | null
          knowledge?: Json | null
          name?: string
          output_schema?: Json | null
          outputs?: Json | null
          phase?: number
          requires_connections?: string[] | null
          slug?: string
          stats?: Json | null
          status?: string
          system_prompt?: string | null
          team_id?: string
          tools?: Json | null
          updated_at?: string | null
          what_it_does?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'skills_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string
          currency: string | null
          customer: Json | null
          customer_email: string | null
          customer_name: string | null
          external_id: string | null
          id: string
          items: Json | null
          last_synced_at: string | null
          ordered_at: string | null
          payment_status: string | null
          platform_order_id: string | null
          products: Json | null
          raw_data: Json | null
          shipping_status: string | null
          status: string | null
          store_id: string
          total: number | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          items?: Json | null
          last_synced_at?: string | null
          ordered_at?: string | null
          payment_status?: string | null
          platform_order_id?: string | null
          products?: Json | null
          raw_data?: Json | null
          shipping_status?: string | null
          status?: string | null
          store_id: string
          total?: number | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer?: Json | null
          customer_email?: string | null
          customer_name?: string | null
          external_id?: string | null
          id?: string
          items?: Json | null
          last_synced_at?: string | null
          ordered_at?: string | null
          payment_status?: string | null
          platform_order_id?: string | null
          products?: Json | null
          raw_data?: Json | null
          shipping_status?: string | null
          status?: string | null
          store_id?: string
          total?: number | null
          total_amount?: number | null
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
      store_price_monitors: {
        Row: {
          competitor_name: string | null
          competitor_url: string
          created_at: string
          id: string
          last_checked_at: string | null
          last_price: number | null
          product_id: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          competitor_name?: string | null
          competitor_url: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_price?: number | null
          product_id?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          competitor_name?: string | null
          competitor_url?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          last_price?: number | null
          product_id?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_price_monitors_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'store_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'store_price_monitors_store_id_fkey'
            columns: ['store_id']
            isOneToOne: false
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      store_products: {
        Row: {
          barcode: string | null
          category: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          currency: string | null
          description: string | null
          external_id: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_published: boolean | null
          last_synced_at: string | null
          name: string
          platform_product_id: string | null
          price: number | null
          raw_data: Json | null
          sku: string | null
          stock: number | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
          variants: Json | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_published?: boolean | null
          last_synced_at?: string | null
          name: string
          platform_product_id?: string | null
          price?: number | null
          raw_data?: Json | null
          sku?: string | null
          stock?: number | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_published?: boolean | null
          last_synced_at?: string | null
          name?: string
          platform_product_id?: string | null
          price?: number | null
          raw_data?: Json | null
          sku?: string | null
          stock?: number | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
          variants?: Json | null
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
          created_at: string
          id: string
          is_global: boolean | null
          product_id: string | null
          store_id: string
          threshold: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean | null
          product_id?: string | null
          store_id: string
          threshold?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean | null
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
      store_suppliers: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lead_time_days: number | null
          name: string
          notes: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          name: string
          notes?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'store_suppliers_store_id_fkey'
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
          onboarding_completed: boolean | null
          platform: string | null
          platform_access_token: string | null
          platform_refresh_token: string | null
          platform_store_id: string | null
          platform_token_expires_at: string | null
          priorities: string[] | null
          segment: string | null
          settings: Json | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          onboarding_completed?: boolean | null
          platform?: string | null
          platform_access_token?: string | null
          platform_refresh_token?: string | null
          platform_store_id?: string | null
          platform_token_expires_at?: string | null
          priorities?: string[] | null
          segment?: string | null
          settings?: Json | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          onboarding_completed?: boolean | null
          platform?: string | null
          platform_access_token?: string | null
          platform_refresh_token?: string | null
          platform_store_id?: string | null
          platform_token_expires_at?: string | null
          priorities?: string[] | null
          segment?: string | null
          settings?: Json | null
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
      tasks: {
        Row: {
          active_skill: string | null
          artifact_data: Json | null
          artifact_type: string | null
          conversation_id: string | null
          created_at: string
          id: string
          initial_message: string | null
          selected_skill: string | null
          skill_status: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_skill?: string | null
          artifact_data?: Json | null
          artifact_type?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          initial_message?: string | null
          selected_skill?: string | null
          skill_status?: string | null
          status?: string
          team_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_skill?: string | null
          artifact_data?: Json | null
          artifact_type?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          initial_message?: string | null
          selected_skill?: string | null
          skill_status?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database['public']['Enums']['team_role']
          team_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: Database['public']['Enums']['team_role']
          team_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database['public']['Enums']['team_role']
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_invitations_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
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
          anthropic_agent_id: string | null
          anthropic_env_id: string | null
          avatar_url: string | null
          created_at: string
          has_store: boolean | null
          id: string
          name: string
          plan_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          anthropic_agent_id?: string | null
          anthropic_env_id?: string | null
          avatar_url?: string | null
          created_at?: string
          has_store?: boolean | null
          id?: string
          name: string
          plan_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          anthropic_agent_id?: string | null
          anthropic_env_id?: string | null
          avatar_url?: string | null
          created_at?: string
          has_store?: boolean | null
          id?: string
          name?: string
          plan_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fk_teams_plan'
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
      workflow_run_outputs: {
        Row: {
          created_at: string
          id: string
          module_id: string | null
          output_data: Json | null
          output_type: string
          summary_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_id?: string | null
          output_data?: Json | null
          output_type: string
          summary_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string | null
          output_data?: Json | null
          output_type?: string
          summary_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_run_outputs_module_id_fkey'
            columns: ['module_id']
            isOneToOne: false
            referencedRelation: 'agent_modules'
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
      activate_skill: {
        Args: { p_slug: string; p_team_id: string }
        Returns: undefined
      }
      create_task_with_conversation: {
        Args: {
          p_initial_message: string
          p_team_id: string
          p_title: string
          p_user_id: string
        }
        Returns: {
          conversation_id: string
          task_id: string
        }[]
      }
      get_team_skills: {
        Args: { p_team_id: string }
        Returns: {
          category: string
          color: string | null
          config_schema: Json | null
          connected_skills: Json | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          emoji: string | null
          expected_results: string[] | null
          icon: string | null
          id: string
          input_schema: Json | null
          is_native: boolean | null
          knowledge: Json | null
          name: string
          output_schema: Json | null
          outputs: Json | null
          phase: number
          requires_connections: string[] | null
          slug: string
          stats: Json | null
          status: string
          system_prompt: string | null
          team_id: string
          tools: Json | null
          updated_at: string | null
          what_it_does: Json | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'skills'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_ai_credits: {
        Args: { p_amount: number; p_team_id: string }
        Returns: undefined
      }
      interval_to_cron: {
        Args: { p_interval_unit: string; p_interval_value: number }
        Returns: string
      }
    }
    Enums: {
      connection_status: 'connected' | 'disconnected' | 'error'
      run_status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
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
      run_status: ['pending', 'running', 'completed', 'failed', 'cancelled'],
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
