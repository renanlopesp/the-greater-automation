import { describe, expect, it } from 'vitest'
import { categorizeAction } from '../categorize'
import type { ActionType } from '../categorize'

describe('categorizeAction', () => {
  describe('verb classification', () => {
    it.each<[string, ActionType]>([
      ['GITHUB_CREATE_ISSUE', 'create'],
      ['GITHUB_ADD_COMMENT_TO_ISSUE', 'create'],
      ['SLACK_SEND_MESSAGE', 'create'],
      ['GITHUB_STAR_REPO', 'create'],
      ['GITHUB_ACCEPT_INVITATION', 'create'],
    ])('%s → actionType "%s"', (actionName, expectedType) => {
      const result = categorizeAction(actionName, actionName.split('_')[0].toLowerCase())
      expect(result.actionType).toBe(expectedType)
    })

    it.each<[string, ActionType]>([
      ['GITHUB_UPDATE_ISSUE', 'update'],
      ['GITHUB_EDIT_COMMENT', 'update'],
      ['GITHUB_CLOSE_ISSUE', 'update'],
      ['GITHUB_MERGE_PR', 'update'],
      ['GITHUB_LOCK_ISSUE', 'update'],
    ])('%s → actionType "%s"', (actionName, expectedType) => {
      const result = categorizeAction(actionName, actionName.split('_')[0].toLowerCase())
      expect(result.actionType).toBe(expectedType)
    })

    it.each<[string, ActionType]>([
      ['GITHUB_DELETE_BRANCH', 'delete'],
      ['GITHUB_REMOVE_LABEL', 'delete'],
      ['GITHUB_UNSTAR_REPO', 'delete'],
    ])('%s → actionType "%s"', (actionName, expectedType) => {
      const result = categorizeAction(actionName, actionName.split('_')[0].toLowerCase())
      expect(result.actionType).toBe(expectedType)
    })

    it.each<[string, ActionType]>([
      ['GITHUB_FIND_BRANCHES', 'find'],
      ['GITHUB_LIST_USER_REPOS', 'find'],
      ['GITHUB_GET_ISSUE', 'find'],
      ['GITHUB_SEARCH_CODE', 'find'],
    ])('%s → actionType "%s"', (actionName, expectedType) => {
      const result = categorizeAction(actionName, actionName.split('_')[0].toLowerCase())
      expect(result.actionType).toBe(expectedType)
    })
  })

  describe('category extraction', () => {
    it('extracts category from GITHUB_CREATE_ISSUE', () => {
      expect(categorizeAction('GITHUB_CREATE_ISSUE', 'github').category).toBe('Issue')
    })

    it('extracts category from GITHUB_LIST_USER_REPOS', () => {
      expect(categorizeAction('GITHUB_LIST_USER_REPOS', 'github').category).toBe('User Repo')
    })

    it('extracts category from SLACK_SEND_MESSAGE', () => {
      expect(categorizeAction('SLACK_SEND_MESSAGE', 'slack').category).toBe('Message')
    })

    it('extracts category from SLACK_LIST_CHANNELS', () => {
      expect(categorizeAction('SLACK_LIST_CHANNELS', 'slack').category).toBe('Channel')
    })

    it('extracts category from LINEAR_UPDATE_TICKET', () => {
      expect(categorizeAction('LINEAR_UPDATE_TICKET', 'linear').category).toBe('Ticket')
    })

    it('extracts category from NOTION_CREATE_PAGE', () => {
      expect(categorizeAction('NOTION_CREATE_PAGE', 'notion').category).toBe('Page')
    })

    it('handles multi-word categories like PULL_REQUEST', () => {
      expect(categorizeAction('GITHUB_CREATE_PULL_REQUEST', 'github').category).toBe('Pull Request')
    })

    it('depluralize BRANCHES → Branch', () => {
      expect(categorizeAction('GITHUB_FIND_BRANCHES', 'github').category).toBe('Branch')
    })

    it('depluralize ISSUES → Issue', () => {
      expect(categorizeAction('GITHUB_FIND_ISSUES', 'github').category).toBe('Issue')
    })

    it('depluralize REPOS → Repo', () => {
      expect(categorizeAction('GITHUB_LIST_REPOS', 'github').category).toBe('Repo')
    })
  })

  describe('"TO" preposition handling', () => {
    it('ADD_COMMENT_TO_ISSUE → category "Issue"', () => {
      const result = categorizeAction('GITHUB_ADD_COMMENT_TO_ISSUE', 'github')
      expect(result.category).toBe('Issue')
      expect(result.actionType).toBe('create')
    })

    it('ADD_LABEL_TO_PR → category "Pr"', () => {
      const result = categorizeAction('GITHUB_ADD_LABEL_TO_PR', 'github')
      expect(result.category).toBe('Pr')
      expect(result.actionType).toBe('create')
    })
  })

  describe('app prefix stripping', () => {
    it('strips GITHUB_ prefix correctly', () => {
      const result = categorizeAction('GITHUB_CREATE_ISSUE', 'github')
      expect(result.category).toBe('Issue')
    })

    it('strips SLACK_ prefix correctly', () => {
      const result = categorizeAction('SLACK_CREATE_CHANNEL', 'slack')
      expect(result.category).toBe('Channel')
    })

    it('is case-insensitive for app ID', () => {
      const result = categorizeAction('GITHUB_CREATE_ISSUE', 'GitHub')
      expect(result.category).toBe('Issue')
    })

    it('handles action without matching prefix gracefully', () => {
      const result = categorizeAction('CREATE_ISSUE', 'github')
      // No GITHUB_ prefix to strip, so it processes all tokens
      expect(result.actionType).toBe('create')
      expect(result.category).toBe('Issue')
    })
  })

  describe('edge cases', () => {
    it('returns General for empty action after prefix strip', () => {
      // 'GITHUB_' (with trailing underscore) fully strips to empty
      const result = categorizeAction('GITHUB_', 'github')
      expect(result.category).toBe('General')
      expect(result.actionType).toBe('other')
    })

    it('handles unrecognized verbs as "other" type', () => {
      const result = categorizeAction('GITHUB_CUSTOM_SOMETHING', 'github')
      expect(result.actionType).toBe('other')
    })

    it('works with any app, not just GitHub/Slack', () => {
      const result = categorizeAction('JIRA_CREATE_TICKET', 'jira')
      expect(result.category).toBe('Ticket')
      expect(result.actionType).toBe('create')
    })
  })
})
