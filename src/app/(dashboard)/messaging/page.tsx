import { redirect } from 'next/navigation'

export default function MessagingPage() {
  redirect('/dashboard?open_settings=messaging')
}
