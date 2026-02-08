import { describe, expect, it } from 'vitest'
import { loginSchema, signupSchema } from '@/lib/schemas/auth'

describe('loginSchema', () => {
  it('passes with valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('fails with invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('fails with short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '1234567' })
    expect(result.success).toBe(false)
  })

  it('fails with missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('passes with valid data', () => {
    const result = signupSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('fails with missing fullName', () => {
    const result = signupSchema.safeParse({
      fullName: '',
      email: 'jane@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('fails with invalid email', () => {
    const result = signupSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'bad-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('trims fullName', () => {
    const result = signupSchema.safeParse({
      fullName: '  Jane Doe  ',
      email: 'jane@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Jane Doe')
    }
  })
})
