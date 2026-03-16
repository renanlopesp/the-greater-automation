import ChatViewClient from '@/components/chat/chat-view-client'

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChatViewClient chatId={id} />
}
