/**
 * Defines how a form field should be rendered and where to fetch its data.
 * Only fields that need special treatment (dropdowns, multi-selects) need overrides.
 * Fields without overrides render based on their JSON Schema type from Composio.
 */
export interface FieldOverride {
  /** Override the default input type */
  type: 'select' | 'multi-select'
  /** How to fetch options for this field */
  dataSource: {
    /** Composio action name to execute for fetching options (e.g., GITHUB_LIST_USER_REPOS) */
    action: string
    /** Field path in the result items to display (e.g., "full_name") */
    displayField: string
    /** Field path in the result items to use as value (e.g., "full_name") */
    valueField: string
    /** Static params to pass to the fetch action */
    params?: Record<string, unknown>
    /** Path to the array in the action result (e.g., "data" or "items"). Default: root array or "data" */
    resultPath?: string
  }
  /** Keys of other fields this depends on. When those change, this field resets and re-fetches */
  dependsOn?: string[]
}

/** Metadata for a Composio action within a module.
 * Categories and icons are now auto-derived from action names via categorizeAction().
 * Only field-level overrides remain — to specify which fields should become searchable
 * comboboxes with live OAuth data instead of plain text inputs.
 */
export interface ActionDefinition {
  /** Field-level overrides. Key = Composio parameter key */
  fieldOverrides?: Record<string, FieldOverride>
}

/** An app module definition — exists only for field overrides */
export interface AppModule {
  /** App ID matching Composio/our system (e.g., "github") */
  appId: string
  /** Display name */
  displayName: string
  /** Action-level overrides. Key = Composio action name (e.g., "GITHUB_CREATE_ISSUE") */
  actions: Record<string, ActionDefinition>
}

/** Registry of all app modules */
export type AppModuleRegistry = Record<string, AppModule>
