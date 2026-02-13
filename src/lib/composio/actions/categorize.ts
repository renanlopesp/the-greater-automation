/**
 * Auto-categorize Composio actions from their naming convention.
 *
 * Composio actions follow the pattern `{APP}_{VERB}_{NOUN}` (e.g., GITHUB_CREATE_ISSUE).
 * This utility dynamically parses any action name for any app — nothing is hardcoded per app.
 */

export type ActionType = 'create' | 'update' | 'delete' | 'find' | 'other'

export interface CategorizedAction {
  /** Human-readable category name (Title Case), e.g. "Issue", "Pull Request" */
  category: string
  /** Semantic action type for icon mapping */
  actionType: ActionType
}

/** Verbs that map to "create" */
const CREATE_VERBS = new Set(['CREATE', 'ADD', 'SEND', 'POST', 'INVITE', 'STAR', 'ACCEPT'])

/** Verbs that map to "update" */
const UPDATE_VERBS = new Set([
  'UPDATE',
  'EDIT',
  'SET',
  'MODIFY',
  'PATCH',
  'RENAME',
  'MOVE',
  'MERGE',
  'CLOSE',
  'REOPEN',
  'ASSIGN',
  'UNASSIGN',
  'LOCK',
  'UNLOCK',
  'PIN',
  'UNPIN',
  'ARCHIVE',
  'UNARCHIVE',
  'ENABLE',
  'DISABLE',
  'MARK',
  'APPROVE',
  'REJECT',
])

/** Verbs that map to "delete" */
const DELETE_VERBS = new Set(['DELETE', 'REMOVE', 'UNSTAR', 'REVOKE', 'DESTROY', 'DROP'])

/** Verbs that map to "find" */
const FIND_VERBS = new Set([
  'FIND',
  'LIST',
  'GET',
  'SEARCH',
  'FETCH',
  'CHECK',
  'QUERY',
  'LOOKUP',
  'RETRIEVE',
  'COUNT',
])

function classifyVerb(verb: string): ActionType {
  const upper = verb.toUpperCase()
  if (CREATE_VERBS.has(upper)) return 'create'
  if (UPDATE_VERBS.has(upper)) return 'update'
  if (DELETE_VERBS.has(upper)) return 'delete'
  if (FIND_VERBS.has(upper)) return 'find'
  return 'other'
}

/**
 * Convert tokens to a human-readable Title Case category name.
 * e.g., ['PULL', 'REQUEST'] → "Pull Request"
 *        ['USER', 'REPOS'] → "User Repo"
 */
function tokensToCategory(tokens: string[]): string {
  if (tokens.length === 0) return 'General'

  return tokens
    .map((t) => {
      const lower = t.toLowerCase()
      // Depluralize simple cases (e.g., "REPOS" → "Repo", "ISSUES" → "Issue", "BRANCHES" → "Branch")
      const singular = depluralize(lower)
      return singular.charAt(0).toUpperCase() + singular.slice(1)
    })
    .join(' ')
}

/** Simple depluralization for common patterns */
function depluralize(word: string): string {
  if (word.endsWith('ches') || word.endsWith('shes') || word.endsWith('sses')) {
    return word.slice(0, -2)
  }
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y'
  }
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && word.length > 3) {
    return word.slice(0, -1)
  }
  return word
}

/**
 * Categorize a Composio action from its name.
 *
 * @param actionName - The Composio action name (e.g., "GITHUB_CREATE_ISSUE")
 * @param appId - The app ID (e.g., "github") — used to strip the app prefix
 * @returns Category and action type for UI display
 *
 * @example
 * categorizeAction('GITHUB_CREATE_ISSUE', 'github')
 * // → { category: 'Issue', actionType: 'create' }
 *
 * categorizeAction('SLACK_LIST_CHANNELS', 'slack')
 * // → { category: 'Channel', actionType: 'find' }
 */
export function categorizeAction(actionName: string, appId: string): CategorizedAction {
  // Strip the app prefix (e.g., "GITHUB_" from "GITHUB_CREATE_ISSUE")
  const prefix = appId.toUpperCase() + '_'
  const stripped = actionName.startsWith(prefix) ? actionName.slice(prefix.length) : actionName

  // Split into tokens
  const tokens = stripped.split('_').filter(Boolean)

  if (tokens.length === 0) {
    return { category: 'General', actionType: 'other' }
  }

  // First token is typically the verb
  const verb = tokens[0]
  const actionType = classifyVerb(verb)

  // Remaining tokens form the category
  // Special case: if verb is recognized, category = remaining tokens
  // If verb is not recognized (actionType === 'other'), include all tokens as category
  let categoryTokens: string[]
  if (actionType === 'other') {
    categoryTokens = tokens
  } else {
    categoryTokens = tokens.slice(1)
  }

  // Handle "TO" preposition in action names like "ADD_COMMENT_TO_ISSUE"
  const toIndex = categoryTokens.findIndex((t) => t.toUpperCase() === 'TO')
  if (toIndex !== -1 && toIndex < categoryTokens.length - 1) {
    // The noun after "TO" is the main category (e.g., "ISSUE" in "ADD_COMMENT_TO_ISSUE")
    categoryTokens = categoryTokens.slice(toIndex + 1)
  }

  const category = tokensToCategory(categoryTokens)

  return { category, actionType }
}
