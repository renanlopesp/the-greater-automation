import { create } from 'zustand'

interface AgentWorkspaceState {
  selectedArtifactId: string | null
  activeTab: 'activity' | 'results' | 'configure' | 'connections'
  artifactPanelWidth: number
}

interface AgentWorkspaceActions {
  setSelectedArtifact: (id: string | null) => void
  setActiveTab: (tab: AgentWorkspaceState['activeTab']) => void
  setArtifactPanelWidth: (width: number) => void
  resetWorkspace: () => void
}

type AgentWorkspaceStore = AgentWorkspaceState & AgentWorkspaceActions

const initialState: AgentWorkspaceState = {
  selectedArtifactId: null,
  activeTab: 'activity',
  artifactPanelWidth: 400,
}

export const useAgentWorkspaceStore = create<AgentWorkspaceStore>((set) => ({
  ...initialState,

  setSelectedArtifact: (id) => set({ selectedArtifactId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setArtifactPanelWidth: (width) => set({ artifactPanelWidth: width }),
  resetWorkspace: () => set(initialState),
}))
