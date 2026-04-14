import { redirect } from 'next/navigation'

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/studio/create/${id}`)
}
