import { describe, it, expect } from 'vitest'
import { executeUtilityStep, resolveTemplate } from '../utility-executor'
import type { UtilityStepConfig } from '../step-defaults'

describe('utility-executor', () => {
  describe('resolveTemplate', () => {
    it('should resolve simple placeholder', () => {
      const context = { name: 'World' }
      expect(resolveTemplate('Hello {{name}}!', context)).toBe('Hello World!')
    })

    it('should resolve nested path', () => {
      const context = { step_1: { output: { content: 'data' } } }
      expect(resolveTemplate('Result: {{step_1.output.content}}', context)).toBe('Result: data')
    })

    it('should resolve multiple placeholders', () => {
      const context = { a: 'foo', b: 'bar' }
      expect(resolveTemplate('{{a}} and {{b}}', context)).toBe('foo and bar')
    })

    it('should replace missing values with empty string', () => {
      expect(resolveTemplate('Value: {{missing}}', {})).toBe('Value: ')
    })

    it('should return template as-is when no placeholders', () => {
      expect(resolveTemplate('No placeholders', {})).toBe('No placeholders')
    })
  })

  describe('format operation', () => {
    it('should resolve placeholders in format_template', () => {
      const config: UtilityStepConfig = {
        utility_type: 'format',
        format_template: 'Hello {{step_1.output.name}}!',
      }
      const context = { step_1: { output: { name: 'Alice' } } }
      const result = executeUtilityStep(config, context)

      expect(result.utility_type).toBe('format')
      expect(result.result).toBe('Hello Alice!')
    })

    it('should handle nested paths in context', () => {
      const config: UtilityStepConfig = {
        utility_type: 'format',
        format_template: '{{a.b.c.d}}',
      }
      const context = { a: { b: { c: { d: 'deep' } } } }
      const result = executeUtilityStep(config, context)

      expect(result.result).toBe('deep')
    })

    it('should return template when no placeholders', () => {
      const config: UtilityStepConfig = {
        utility_type: 'format',
        format_template: 'Plain text',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toBe('Plain text')
    })

    it('should throw when format_template is empty', () => {
      const config: UtilityStepConfig = {
        utility_type: 'format',
        format_template: '',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Format utility requires a format_template'
      )
    })
  })

  describe('parse_json operation', () => {
    it('should parse valid JSON object', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_json',
        input_source: '{"name":"Alice","age":30}',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('parse_json')
      expect(result.result).toEqual({ name: 'Alice', age: 30 })
    })

    it('should parse valid JSON array', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_json',
        input_source: '[1, 2, 3]',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual([1, 2, 3])
    })

    it('should throw on invalid JSON', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_json',
        input_source: '{invalid}',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Invalid JSON')
    })

    it('should throw when input_source is empty', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_json',
        input_source: '',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Parse JSON utility requires input_source'
      )
    })
  })

  describe('parse_csv operation', () => {
    it('should parse CSV with headers and rows', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_csv',
        input_source: 'name,age\nAlice,30\nBob,25',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('parse_csv')
      expect(result.result).toEqual([
        { name: 'Alice', age: '30' },
        { name: 'Bob', age: '25' },
      ])
      expect(result.item_count).toBe(2)
    })

    it('should return empty array for header-only CSV', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_csv',
        input_source: 'name,age',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual([])
      expect(result.item_count).toBe(0)
    })

    it('should trim whitespace from headers and values', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_csv',
        input_source: ' name , age \n Alice , 30 ',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual([{ name: 'Alice', age: '30' }])
    })

    it('should throw when input_source is empty', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_csv',
        input_source: '',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Parse CSV utility requires input_source'
      )
    })
  })

  describe('merge operation', () => {
    it('should merge array of objects', () => {
      const config: UtilityStepConfig = {
        utility_type: 'merge',
        input_source: '[{"a":1},{"b":2},{"c":3}]',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('merge')
      expect(result.result).toEqual({ a: 1, b: 2, c: 3 })
      expect(result.item_count).toBe(3)
    })

    it('should use last value for duplicate keys', () => {
      const config: UtilityStepConfig = {
        utility_type: 'merge',
        input_source: '[{"a":1},{"a":2}]',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual({ a: 2 })
    })

    it('should throw when input is not an array', () => {
      const config: UtilityStepConfig = {
        utility_type: 'merge',
        input_source: '{"a":1}',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Merge utility requires an array of objects'
      )
    })

    it('should throw on invalid JSON', () => {
      const config: UtilityStepConfig = {
        utility_type: 'merge',
        input_source: 'not json',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Merge failed')
    })

    it('should throw when input_source is empty', () => {
      const config: UtilityStepConfig = {
        utility_type: 'merge',
        input_source: '',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Merge utility requires input_source')
    })
  })

  describe('filter operation', () => {
    it('should filter by string condition', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[{"name":"Alice","active":true},{"name":"Bob","active":false}]',
        filter_condition: 'item.active === true',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('filter')
      expect(result.result).toEqual([{ name: 'Alice', active: true }])
      expect(result.item_count).toBe(1)
    })

    it('should filter by numeric condition', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[{"val":1},{"val":5},{"val":10}]',
        filter_condition: 'item.val > 3',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual([{ val: 5 }, { val: 10 }])
      expect(result.item_count).toBe(2)
    })

    it('should return empty array when no items match', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[{"val":1},{"val":2}]',
        filter_condition: 'item.val > 100',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual([])
      expect(result.item_count).toBe(0)
    })

    it('should throw when input is not an array', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '{"a":1}',
        filter_condition: 'item.a > 0',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Filter utility requires an array')
    })

    it('should throw when filter_condition is missing', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[1,2,3]',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Filter utility requires input_source and filter_condition'
      )
    })

    it('should throw when condition contains unsafe characters (semicolon)', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[1,2,3]',
        filter_condition: 'item; process.exit()',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Filter condition must follow the pattern'
      )
    })

    it('should throw when condition contains unsafe characters (braces)', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[1,2,3]',
        filter_condition: '(() => { return true })()',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Filter condition must follow the pattern'
      )
    })

    it('should throw when condition contains backticks', () => {
      const config: UtilityStepConfig = {
        utility_type: 'filter',
        input_source: '[1,2,3]',
        filter_condition: '`${constructor}`',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Filter condition must follow the pattern'
      )
    })
  })

  describe('map operation', () => {
    it('should resolve template per item', () => {
      const config: UtilityStepConfig = {
        utility_type: 'map',
        input_source: '[{"name":"Alice"},{"name":"Bob"}]',
        format_template: 'Hello {{item.name}}!',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('map')
      expect(result.result).toEqual(['Hello Alice!', 'Hello Bob!'])
      expect(result.item_count).toBe(2)
    })

    it('should resolve nested item properties', () => {
      const config: UtilityStepConfig = {
        utility_type: 'map',
        input_source: '[{"user":{"name":"Alice"}},{"user":{"name":"Bob"}}]',
        format_template: '{{item.user.name}}',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toEqual(['Alice', 'Bob'])
    })

    it('should throw when input is not an array', () => {
      const config: UtilityStepConfig = {
        utility_type: 'map',
        input_source: '{"a":1}',
        format_template: '{{item.a}}',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Map utility requires an array')
    })

    it('should throw when format_template is missing', () => {
      const config: UtilityStepConfig = {
        utility_type: 'map',
        input_source: '[1,2,3]',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Map utility requires input_source and format_template'
      )
    })
  })

  describe('math operation', () => {
    it('should evaluate basic arithmetic', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '2 + 3 * 4',
      }
      const result = executeUtilityStep(config, {})

      expect(result.utility_type).toBe('math')
      expect(result.result).toBe(14)
    })

    it('should handle decimals', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '1.5 + 2.5',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toBe(4)
    })

    it('should handle parentheses', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '(2 + 3) * 4',
      }
      const result = executeUtilityStep(config, {})

      expect(result.result).toBe(20)
    })

    it('should throw on invalid characters', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '2 + alert(1)',
      }

      expect(() => executeUtilityStep(config, {})).toThrow(
        'Invalid math expression: only numbers and basic operators allowed'
      )
    })

    it('should throw on division by zero (Infinity)', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '1/0',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Division by zero')
    })

    it('should throw when expression is empty', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '',
      }

      expect(() => executeUtilityStep(config, {})).toThrow('Math utility requires math_expression')
    })
  })

  describe('general', () => {
    it('should throw for unknown utility type', () => {
      const config = {
        utility_type: 'unknown',
      } as unknown as UtilityStepConfig

      expect(() => executeUtilityStep(config, {})).toThrow('Unknown utility type: unknown')
    })

    it('should always include utility_type in result', () => {
      const config: UtilityStepConfig = {
        utility_type: 'math',
        math_expression: '1+1',
      }
      const result = executeUtilityStep(config, {})

      expect(result).toHaveProperty('utility_type', 'math')
      expect(result).toHaveProperty('result', 2)
    })

    it('should include item_count for array operations', () => {
      const config: UtilityStepConfig = {
        utility_type: 'parse_csv',
        input_source: 'a,b\n1,2\n3,4',
      }
      const result = executeUtilityStep(config, {})

      expect(result.item_count).toBe(2)
    })
  })
})
