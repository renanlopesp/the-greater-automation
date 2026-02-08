import { create } from 'zustand'
import type { WorkflowTrigger } from '@/lib/workflow-editor/trigger-defaults'
import type { WorkflowStep } from '@/lib/workflow-editor/step-defaults'

interface WorkflowEditorState {
  workflowId: string
  workflowName: string
  workflowEmoji: string
  isStarred: boolean
  trigger: WorkflowTrigger | null
  steps: WorkflowStep[]
  selectedStepId: string | null
  isAssistantOpen: boolean
  isDirty: boolean
}

interface WorkflowEditorActions {
  setWorkflowName: (name: string) => void
  setWorkflowEmoji: (emoji: string) => void
  toggleStar: () => void
  setTrigger: (trigger: WorkflowTrigger | null) => void
  addStep: (step: Omit<WorkflowStep, 'position'>) => void
  updateStep: (id: string, updates: Partial<Omit<WorkflowStep, 'id'>>) => void
  deleteStep: (id: string) => void
  reorderSteps: (fromIndex: number, toIndex: number) => void
  selectStep: (id: string | null) => void
  toggleAssistant: () => void
  initializeWorkflow: (data: Partial<WorkflowEditorState>) => void
  resetStore: () => void
}

export type WorkflowEditorStore = WorkflowEditorState & WorkflowEditorActions

const initialState: WorkflowEditorState = {
  workflowId: '',
  workflowName: 'Untitled workflow',
  workflowEmoji: '',
  isStarred: false,
  trigger: null,
  steps: [],
  selectedStepId: null,
  isAssistantOpen: true,
  isDirty: false,
}

export const useWorkflowEditorStore = create<WorkflowEditorStore>((set) => ({
  ...initialState,

  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

  setWorkflowEmoji: (emoji) => set({ workflowEmoji: emoji, isDirty: true }),

  toggleStar: () => set((state) => ({ isStarred: !state.isStarred, isDirty: true })),

  setTrigger: (trigger) => set({ trigger, isDirty: true }),

  addStep: (step) =>
    set((state) => ({
      steps: [...state.steps, { ...step, position: state.steps.length }],
      isDirty: true,
    })),

  updateStep: (id, updates) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      isDirty: true,
    })),

  deleteStep: (id) =>
    set((state) => ({
      steps: state.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })),
      selectedStepId: state.selectedStepId === id ? null : state.selectedStepId,
      isDirty: true,
    })),

  reorderSteps: (fromIndex, toIndex) =>
    set((state) => {
      const steps = [...state.steps]
      const [moved] = steps.splice(fromIndex, 1)
      steps.splice(toIndex, 0, moved)
      return {
        steps: steps.map((s, i) => ({ ...s, position: i })),
        isDirty: true,
      }
    }),

  selectStep: (id) => set({ selectedStepId: id }),

  toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),

  initializeWorkflow: (data) => set({ ...initialState, ...data, isDirty: false }),

  resetStore: () => set(initialState),
}))
