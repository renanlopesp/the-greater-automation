import { describe, it, expect } from 'vitest'
import {
  getAppDefinition,
  getAppActions,
  getAppAction,
  getAllAppDefinitions,
  getConnectableAppIds,
} from '@/lib/oauth/app-actions'

describe('App Actions Registry', () => {
  describe('getAppDefinition', () => {
    it('returns GitHub definition', () => {
      const app = getAppDefinition('github')
      expect(app).toBeDefined()
      expect(app!.id).toBe('github')
      expect(app!.name).toBe('GitHub')
      expect(app!.actions.length).toBeGreaterThan(0)
    })

    it('returns Notion definition', () => {
      const app = getAppDefinition('notion')
      expect(app).toBeDefined()
      expect(app!.id).toBe('notion')
    })

    it('returns Slack definition', () => {
      const app = getAppDefinition('slack')
      expect(app).toBeDefined()
      expect(app!.id).toBe('slack')
    })

    it('returns LinkedIn definition', () => {
      const app = getAppDefinition('linkedin')
      expect(app).toBeDefined()
      expect(app!.id).toBe('linkedin')
    })

    it('returns Discord definition', () => {
      const app = getAppDefinition('discord')
      expect(app).toBeDefined()
      expect(app!.id).toBe('discord')
    })

    it('returns undefined for unknown app', () => {
      expect(getAppDefinition('unknown')).toBeUndefined()
    })
  })

  describe('getAppActions', () => {
    it('returns GitHub actions', () => {
      const actions = getAppActions('github')
      expect(actions.length).toBe(4)
      const ids = actions.map((a) => a.id)
      expect(ids).toContain('create_issue')
      expect(ids).toContain('create_pr_comment')
      expect(ids).toContain('list_repos')
      expect(ids).toContain('star_repo')
    })

    it('returns Slack actions', () => {
      const actions = getAppActions('slack')
      expect(actions.length).toBe(4)
      const ids = actions.map((a) => a.id)
      expect(ids).toContain('send_message')
      expect(ids).toContain('send_dm')
      expect(ids).toContain('create_channel')
      expect(ids).toContain('list_channels')
    })

    it('returns empty array for unknown app', () => {
      expect(getAppActions('unknown')).toEqual([])
    })
  })

  describe('getAppAction', () => {
    it('returns specific GitHub action', () => {
      const action = getAppAction('github', 'create_issue')
      expect(action).toBeDefined()
      expect(action!.id).toBe('create_issue')
      expect(action!.name).toBe('Create Issue')
      expect(action!.inputs.length).toBeGreaterThan(0)
    })

    it('returns undefined for unknown action', () => {
      expect(getAppAction('github', 'unknown')).toBeUndefined()
    })

    it('returns undefined for unknown app', () => {
      expect(getAppAction('unknown', 'create_issue')).toBeUndefined()
    })

    it('action inputs have required fields', () => {
      const action = getAppAction('github', 'create_issue')!
      for (const input of action.inputs) {
        expect(input).toHaveProperty('key')
        expect(input).toHaveProperty('label')
        expect(input).toHaveProperty('type')
        expect(input).toHaveProperty('placeholder')
        expect(input).toHaveProperty('required')
      }
    })
  })

  describe('getAllAppDefinitions', () => {
    it('returns all 5 app definitions', () => {
      const apps = getAllAppDefinitions()
      expect(apps.length).toBe(5)
      const ids = apps.map((a) => a.id)
      expect(ids).toContain('github')
      expect(ids).toContain('notion')
      expect(ids).toContain('slack')
      expect(ids).toContain('linkedin')
      expect(ids).toContain('discord')
    })
  })

  describe('getConnectableAppIds', () => {
    it('returns the 5 connectable app IDs', () => {
      const ids = getConnectableAppIds()
      expect(ids).toEqual(['github', 'notion', 'slack', 'linkedin', 'discord'])
    })
  })
})
