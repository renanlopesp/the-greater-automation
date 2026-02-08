'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { updateProfileAction } from '@/lib/actions/settings'
import { accountSettingsSchema, type AccountSettingsValues } from '@/lib/schemas/settings'

interface AccountSectionProps {
  fullName: string
  email: string
  avatarUrl: string | null
}

export default function AccountSection({ fullName, email, avatarUrl }: AccountSectionProps) {
  const [pending, setPending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AccountSettingsValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: { fullName },
  })

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be less than 2MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    toast('Avatar upload coming soon')
  }

  async function onSubmit(data: AccountSettingsValues) {
    setPending(true)
    const formData = new FormData()
    formData.set('fullName', data.fullName)

    const result = await updateProfileAction(formData)
    setPending(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Profile updated')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-lg font-semibold">Account</h2>

      <div className="flex items-center gap-4">
        <button type="button" onClick={handleAvatarClick} className="rounded-full">
          <Avatar className="h-20 w-20 cursor-pointer">
            <AvatarImage src={previewUrl ?? avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-muted-foreground text-sm">Click avatar to upload a new image</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...register('fullName')} />
          {errors.fullName && <p className="text-destructive text-sm">{errors.fullName.message}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>

        <Button type="submit" className="w-fit" disabled={!isDirty || pending}>
          {pending && <Loader2 className="animate-spin" />}
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
