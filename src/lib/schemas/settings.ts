import { z } from 'zod'

export const accountSettingsSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
})

export const workspaceSettingsSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required'),
})

export type AccountSettingsValues = z.infer<typeof accountSettingsSchema>
export type WorkspaceSettingsValues = z.infer<typeof workspaceSettingsSchema>
