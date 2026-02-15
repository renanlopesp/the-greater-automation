import { describe, it, expect } from 'vitest'
import { evaluateConditions } from '../condition-engine'
import type { WorkflowCondition } from '../types'

describe('condition-engine', () => {
  describe('equals operator', () => {
    it('should match equal strings', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'equals', value: 'active' },
      ]
      const data = { status: 'active' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
      expect(result.results[0].passed).toBe(true)
      expect(result.results[0].actual_value).toBe('active')
    })

    it('should match equal numbers', () => {
      const conditions: WorkflowCondition[] = [{ field: 'count', operator: 'equals', value: 42 }]
      const data = { count: 42 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should match equal booleans', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'is_enabled', operator: 'equals', value: true },
      ]
      const data = { is_enabled: true }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when values do not match', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'equals', value: 'active' },
      ]
      const data = { status: 'inactive' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('not_equals operator', () => {
    it('should pass when values differ', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'not_equals', value: 'inactive' },
      ]
      const data = { status: 'active' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when values match', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'not_equals', value: 'active' },
      ]
      const data = { status: 'active' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('contains operator', () => {
    it('should match substring (case-insensitive)', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'message', operator: 'contains', value: 'urgent' },
      ]
      const data = { message: 'This is an URGENT alert' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when substring is not found', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'message', operator: 'contains', value: 'urgent' },
      ]
      const data = { message: 'This is a normal message' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should fail when field is not a string', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'count', operator: 'contains', value: '42' },
      ]
      const data = { count: 42 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('not_contains operator', () => {
    it('should pass when substring is not found', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'message', operator: 'not_contains', value: 'spam' },
      ]
      const data = { message: 'This is a normal message' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when substring is found', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'message', operator: 'not_contains', value: 'spam' },
      ]
      const data = { message: 'This is SPAM content' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should pass when field is not a string', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'count', operator: 'not_contains', value: '42' },
      ]
      const data = { count: 42 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })
  })

  describe('matches operator', () => {
    it('should match valid regex pattern', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'email', operator: 'matches', value: '^[a-z]+@[a-z]+\\.[a-z]+$' },
      ]
      const data = { email: 'user@example.com' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when pattern does not match', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'email', operator: 'matches', value: '^[a-z]+@[a-z]+\\.[a-z]+$' },
      ]
      const data = { email: 'invalid-email' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should fail on invalid regex', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'email', operator: 'matches', value: '[invalid(' },
      ]
      const data = { email: 'user@example.com' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should fail when field is not a string', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'count', operator: 'matches', value: '\\d+' },
      ]
      const data = { count: 42 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('exists operator', () => {
    it('should pass when field exists and is not null', () => {
      const conditions: WorkflowCondition[] = [{ field: 'name', operator: 'exists' }]
      const data = { name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when field is undefined', () => {
      const conditions: WorkflowCondition[] = [{ field: 'missing', operator: 'exists' }]
      const data = { name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should fail when field is null', () => {
      const conditions: WorkflowCondition[] = [{ field: 'name', operator: 'exists' }]
      const data = { name: null }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('not_exists operator', () => {
    it('should pass when field is undefined', () => {
      const conditions: WorkflowCondition[] = [{ field: 'missing', operator: 'not_exists' }]
      const data = { name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should pass when field is null', () => {
      const conditions: WorkflowCondition[] = [{ field: 'name', operator: 'not_exists' }]
      const data = { name: null }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when field exists', () => {
      const conditions: WorkflowCondition[] = [{ field: 'name', operator: 'not_exists' }]
      const data = { name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })
  })

  describe('numeric comparison operators', () => {
    it('should pass gt when value is greater', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'gt', value: 50 }]
      const data = { score: 75 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail gt when value is equal', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'gt', value: 50 }]
      const data = { score: 50 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should pass lt when value is less', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'lt', value: 50 }]
      const data = { score: 25 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail lt when value is equal', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'lt', value: 50 }]
      const data = { score: 50 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
    })

    it('should pass gte when value is equal', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'gte', value: 50 }]
      const data = { score: 50 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should pass gte when value is greater', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'gte', value: 50 }]
      const data = { score: 75 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should pass lte when value is equal', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'lte', value: 50 }]
      const data = { score: 50 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should pass lte when value is less', () => {
      const conditions: WorkflowCondition[] = [{ field: 'score', operator: 'lte', value: 50 }]
      const data = { score: 25 }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })
  })

  describe('nested field access', () => {
    it('should access nested fields with dot-path', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'body.sender', operator: 'equals', value: 'alice' },
      ]
      const data = { body: { sender: 'alice', message: 'hello' } }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
      expect(result.results[0].actual_value).toBe('alice')
    })

    it('should access deeply nested fields', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'data.user.profile.name', operator: 'equals', value: 'Alice' },
      ]
      const data = {
        data: {
          user: {
            profile: {
              name: 'Alice',
            },
          },
        },
      }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should return undefined for missing nested paths', () => {
      const conditions: WorkflowCondition[] = [{ field: 'body.missing.path', operator: 'exists' }]
      const data = { body: { sender: 'alice' } }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
      expect(result.results[0].actual_value).toBeUndefined()
    })
  })

  describe('empty conditions', () => {
    it('should pass when conditions array is empty', () => {
      const conditions: WorkflowCondition[] = []
      const data = { anything: 'goes' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
      expect(result.results).toEqual([])
    })
  })

  describe('AND logic', () => {
    it('should pass only when all conditions pass', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'score', operator: 'gt', value: 50 },
        { field: 'name', operator: 'exists' },
      ]
      const data = { status: 'active', score: 75, name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(true)
    })

    it('should fail when any condition fails', () => {
      const conditions: WorkflowCondition[] = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'score', operator: 'gt', value: 50 },
        { field: 'name', operator: 'exists' },
      ]
      const data = { status: 'active', score: 25, name: 'Alice' }
      const result = evaluateConditions(conditions, data)
      expect(result.passed).toBe(false)
      expect(result.results[0].passed).toBe(true)
      expect(result.results[1].passed).toBe(false)
      expect(result.results[2].passed).toBe(true)
    })
  })
})
