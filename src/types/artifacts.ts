// Artifact types for orchestrator chat responses

export type ArtifactType = 'data' | 'table' | 'document' | 'campaign-table' | 'approval'

export interface ArtifactKPI {
  label: string
  value: string
  delta?: string
  positive?: boolean
}

export interface ArtifactRow {
  [key: string]: string | number | boolean | null
}

export interface ArtifactConnection {
  name: string
  status: 'connected' | 'warning' | 'disconnected'
  lastSync?: string
}

export interface MessageTemplate {
  channel: 'whatsapp' | 'email' | 'sms'
  preview: {
    header?: string
    body: string
    footer?: string
    cta?: string
  }
  recipients?: Array<{ id: string; name: string; active: boolean }>
  meta?: Array<{ label: string; value: string }>
}

export interface Artifact {
  id: string
  title: string
  type: ArtifactType
  content?: string
  rows?: ArtifactRow[]
  columns?: string[]
  kpis?: ArtifactKPI[]
  connections?: ArtifactConnection[]
  messageTemplate?: MessageTemplate
}

export interface CoworkerReference {
  id: string
  name: string
  catalogId: string
  type: 'used' | 'suggested'
  reason?: string
}

export interface ParsedOrchestratorResponse {
  text: string
  coworker?: CoworkerReference
  followUps: string[]
  artifacts: Artifact[]
}
