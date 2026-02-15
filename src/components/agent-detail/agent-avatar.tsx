import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'

interface AgentAvatarProps {
  name?: string
  palette?: string | null
  size?: number
}

export default function AgentAvatar({ name = 'Agent', palette, size = 80 }: AgentAvatarProps) {
  return (
    <BoringAvatar name={name} variant="bauhaus" size={size} colors={getAgentPalette(palette)} />
  )
}
