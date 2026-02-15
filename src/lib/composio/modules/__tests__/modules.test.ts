import { describe, expect, it } from 'vitest'
import { getAppModule, hasAppModule, getRegisteredAppIds } from '../registry'
import { githubModule } from '../github'
import { slackModule } from '../slack'

describe('App Module Registry', () => {
  describe('getAppModule', () => {
    it('returns the GitHub module with correct appId and displayName', () => {
      const result = getAppModule('github')
      expect(result).toBeDefined()
      expect(result?.appId).toBe('github')
      expect(result?.displayName).toBe('GitHub')
    })

    it('returns the Slack module', () => {
      const result = getAppModule('slack')
      expect(result).toBeDefined()
      expect(result?.appId).toBe('slack')
      expect(result?.displayName).toBe('Slack')
    })

    it('returns undefined for unknown app', () => {
      const result = getAppModule('unknown')
      expect(result).toBeUndefined()
    })

    it('returns GitHub module for case-insensitive lookup', () => {
      const result = getAppModule('GITHUB')
      expect(result).toBeDefined()
      expect(result?.appId).toBe('github')
    })
  })

  describe('hasAppModule', () => {
    it('returns true for github', () => {
      expect(hasAppModule('github')).toBe(true)
    })

    it('returns false for unknown app', () => {
      expect(hasAppModule('unknown')).toBe(false)
    })
  })

  describe('getRegisteredAppIds', () => {
    it('returns array containing github and slack', () => {
      const appIds = getRegisteredAppIds()
      expect(appIds).toContain('github')
      expect(appIds).toContain('slack')
      expect(appIds).toHaveLength(2)
    })
  })
})

describe('GitHub Module', () => {
  it('has correct appId and displayName', () => {
    expect(githubModule.appId).toBe('github')
    expect(githubModule.displayName).toBe('GitHub')
  })

  it('has GITHUB_CREATE_ISSUE action with fieldOverrides', () => {
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    expect(action).toBeDefined()
    expect(action.fieldOverrides).toBeDefined()
  })

  it('GITHUB_CREATE_ISSUE has field override for repo with type select', () => {
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    const repoField = action.fieldOverrides?.repo
    expect(repoField).toBeDefined()
    expect(repoField?.type).toBe('select')
  })

  it('repo field uses GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER as data source', () => {
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    const repoField = action.fieldOverrides?.repo
    expect(repoField?.dataSource.action).toBe('GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER')
    expect(repoField?.dataSource.displayField).toBe('full_name')
    expect(repoField?.dataSource.valueField).toBe('name')
  })

  it('GITHUB_CREATE_ISSUE has field override for labels with type multi-select', () => {
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    const labelsField = action.fieldOverrides?.labels
    expect(labelsField).toBeDefined()
    expect(labelsField?.type).toBe('multi-select')
  })

  it('labels field has dependsOn owner and repo', () => {
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    const labelsField = action.fieldOverrides?.labels
    expect(labelsField?.dependsOn).toEqual(['owner', 'repo'])
  })

  it('has no category or defaultCategory properties (auto-derived now)', () => {
    // Categories are now auto-derived via categorizeAction(), not stored in modules
    const action = githubModule.actions.GITHUB_CREATE_ISSUE
    expect(action).not.toHaveProperty('category')
    expect(action).not.toHaveProperty('categoryIcon')
    expect(githubModule).not.toHaveProperty('defaultCategory')
  })

  it('actions without fieldOverrides still exist for override lookup', () => {
    // Actions like GITHUB_STAR_REPO were removed
    // since they had no fieldOverrides — they don't need module entries
    expect(githubModule.actions.GITHUB_STAR_REPO).toBeUndefined()
  })
})

describe('Slack Module', () => {
  it('has correct appId and displayName', () => {
    expect(slackModule.appId).toBe('slack')
    expect(slackModule.displayName).toBe('Slack')
  })

  it('SLACK_SEND_MESSAGE has channel field override with type select', () => {
    const action = slackModule.actions.SLACK_SEND_MESSAGE
    const channelField = action.fieldOverrides?.channel
    expect(channelField).toBeDefined()
    expect(channelField?.type).toBe('select')
  })

  it('channel uses SLACK_LIST_CHANNELS as data source', () => {
    const action = slackModule.actions.SLACK_SEND_MESSAGE
    const channelField = action.fieldOverrides?.channel
    expect(channelField?.dataSource.action).toBe('SLACK_LIST_CHANNELS')
    expect(channelField?.dataSource.displayField).toBe('name')
    expect(channelField?.dataSource.valueField).toBe('id')
  })

  it('has no category or defaultCategory properties (auto-derived now)', () => {
    expect(slackModule).not.toHaveProperty('defaultCategory')
    const action = slackModule.actions.SLACK_SEND_MESSAGE
    expect(action).not.toHaveProperty('category')
    expect(action).not.toHaveProperty('categoryIcon')
  })

  it('actions without fieldOverrides were removed', () => {
    // SLACK_CREATE_CHANNEL and SLACK_LIST_CHANNELS had no fieldOverrides
    expect(slackModule.actions.SLACK_CREATE_CHANNEL).toBeUndefined()
    expect(slackModule.actions.SLACK_LIST_CHANNELS).toBeUndefined()
  })
})
