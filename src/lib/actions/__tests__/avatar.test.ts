import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadAvatarAction } from '@/lib/actions/avatar'

// Mock Supabase server client
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
    from: () => ({
      update: (...args: unknown[]) => {
        mockUpdate(...args)
        return { eq: (...eqArgs: unknown[]) => mockEq(...eqArgs) }
      },
    }),
  }),
}))

describe('uploadAvatarAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/avatars/user-123/avatar.jpg' },
    })
    mockEq.mockResolvedValue({ error: null })
  })

  it('returns error when no file provided', async () => {
    const formData = new FormData()
    const result = await uploadAvatarAction(formData)
    expect(result.error).toBe('No file provided')
  })

  it('returns error when file is too large', async () => {
    const formData = new FormData()
    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    })
    formData.set('avatar', largeFile)

    const result = await uploadAvatarAction(formData)
    expect(result.error).toBe('File must be less than 2MB')
  })

  it('returns error when file is not an image', async () => {
    const formData = new FormData()
    const textFile = new File(['hello'], 'file.txt', { type: 'text/plain' })
    formData.set('avatar', textFile)

    const result = await uploadAvatarAction(formData)
    expect(result.error).toBe('File must be an image')
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const formData = new FormData()
    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })
    formData.set('avatar', file)

    const result = await uploadAvatarAction(formData)
    expect(result.error).toBe('Not authenticated')
  })

  it('uploads file and returns avatar URL on success', async () => {
    const formData = new FormData()
    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })
    formData.set('avatar', file)

    const result = await uploadAvatarAction(formData)

    expect(mockUpload).toHaveBeenCalledWith('user-123/avatar.jpg', file, {
      upsert: true,
      contentType: 'image/jpeg',
    })
    expect(result.avatarUrl).toContain('https://storage.supabase.co/avatars/user-123/avatar.jpg')
  })

  it('returns error when upload fails', async () => {
    mockUpload.mockResolvedValue({ error: new Error('upload failed') })

    const formData = new FormData()
    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' })
    formData.set('avatar', file)

    const result = await uploadAvatarAction(formData)
    expect(result.error).toBe('Failed to upload avatar')
  })

  it('uses png extension for PNG files', async () => {
    const formData = new FormData()
    const file = new File(['img'], 'avatar.png', { type: 'image/png' })
    formData.set('avatar', file)

    await uploadAvatarAction(formData)

    expect(mockUpload).toHaveBeenCalledWith(
      'user-123/avatar.png',
      file,
      expect.objectContaining({ contentType: 'image/png' })
    )
  })
})
