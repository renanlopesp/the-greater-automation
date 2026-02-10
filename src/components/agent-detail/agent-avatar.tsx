import BoringAvatar from 'boring-avatars'
import { getAgentPalette } from '@/lib/agent-palettes'

interface AgentAvatarProps {
  name?: string
  palette?: string | null
}

export default function AgentAvatar({ name = 'Agent', palette }: AgentAvatarProps) {
  return <BoringAvatar name={name} variant="bauhaus" size={80} colors={getAgentPalette(palette)} />
}
