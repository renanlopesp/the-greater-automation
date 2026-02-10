import { z } from 'zod'

export const createFolderSchema = z.object({
  teamId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name must be 100 characters or less'),
  parentId: z.string().uuid().nullable().optional(),
})

export const renameFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name must be 100 characters or less'),
})

export const deleteFolderSchema = z.object({
  folderId: z.string().uuid(),
  mode: z.enum(['move-to-root', 'delete-all']),
})

export const moveToFolderSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1, 'At least one item must be selected'),
  folderId: z.string().uuid().nullable(),
})
