'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateWorkspaceAction } from '@/lib/actions/settings'
import { workspaceSettingsSchema, type WorkspaceSettingsValues } from '@/lib/schemas/settings'

interface GeneralSectionProps {
  name: string
  slug: string
}

export default function GeneralSection({ name, slug }: GeneralSectionProps) {
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<WorkspaceSettingsValues>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: { name },
  })

  async function onSubmit(data: WorkspaceSettingsValues) {
    setPending(true)
    const formData = new FormData()
    formData.set('name', data.name)

    const result = await updateWorkspaceAction(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Workspace updated')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">General</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input id="workspace-name" {...register('name')} />
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="workspace-slug">Workspace slug</Label>
          <Input id="workspace-slug" value={slug} disabled />
        </div>

        <Button type="submit" className="w-fit" disabled={!isDirty || pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
