import { create } from 'zustand'
import { getTriggerDefaultConfig } from '@/lib/workflow-editor/trigger-defaults'
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
  workflowStatus: 'draft' | 'published'
  activeTab: 'editor' | 'runs' | 'tests'
  pendingRunId: string | null
  undoStack: WorkflowEditorState[]
  redoStack: WorkflowEditorState[]
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
  undo: () => void
  redo: () => void
  setWorkflowStatus: (status: 'draft' | 'published') => void
  setActiveTab: (tab: 'editor' | 'runs' | 'tests') => void
  setPendingRunId: (runId: string | null) => void
  clearDirty: () => void
}

export type WorkflowEditorStore = WorkflowEditorState & WorkflowEditorActions

const initialState: WorkflowEditorState = {
  workflowId: '',
  workflowName: 'Untitled',
  workflowEmoji: '',
  isStarred: false,
  trigger: { type: 'manual', config: getTriggerDefaultConfig('manual') },
  steps: [],
  selectedStepId: null,
  isAssistantOpen: false,
  isDirty: false,
  workflowStatus: 'draft',
  activeTab: 'editor',
  pendingRunId: null,
  undoStack: [],
  redoStack: [],
}

const MAX_UNDO_STACK = 50

function captureState(state: WorkflowEditorState): WorkflowEditorState {
  return {
    workflowId: state.workflowId,
    workflowName: state.workflowName,
    workflowEmoji: state.workflowEmoji,
    isStarred: state.isStarred,
    trigger: state.trigger,
    steps: state.steps,
    selectedStepId: state.selectedStepId,
    isAssistantOpen: state.isAssistantOpen,
    isDirty: state.isDirty,
    workflowStatus: state.workflowStatus,
    activeTab: state.activeTab,
    pendingRunId: state.pendingRunId,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
  }
}

export const useWorkflowEditorStore = create<WorkflowEditorStore>((set) => ({
  ...initialState,

  setWorkflowName: (name) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return { workflowName: name, isDirty: true, undoStack: newUndoStack, redoStack: [] }
    }),

  setWorkflowEmoji: (emoji) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return { workflowEmoji: emoji, isDirty: true, undoStack: newUndoStack, redoStack: [] }
    }),

  toggleStar: () =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return {
        isStarred: !state.isStarred,
        isDirty: true,
        undoStack: newUndoStack,
        redoStack: [],
      }
    }),

  setTrigger: (trigger) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return { trigger, isDirty: true, undoStack: newUndoStack, redoStack: [] }
    }),

  addStep: (step) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return {
        steps: [...state.steps, { ...step, position: state.steps.length }],
        isDirty: true,
        undoStack: newUndoStack,
        redoStack: [],
      }
    }),

  updateStep: (id, updates) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return {
        steps: state.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        isDirty: true,
        undoStack: newUndoStack,
        redoStack: [],
      }
    }),

  deleteStep: (id) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      return {
        steps: state.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i })),
        selectedStepId: state.selectedStepId === id ? null : state.selectedStepId,
        isDirty: true,
        undoStack: newUndoStack,
        redoStack: [],
      }
    }),

  reorderSteps: (fromIndex, toIndex) =>
    set((state) => {
      const newUndoStack = [...state.undoStack, captureState(state)].slice(-MAX_UNDO_STACK)
      const steps = [...state.steps]
      const [moved] = steps.splice(fromIndex, 1)
      steps.splice(toIndex, 0, moved)
      return {
        steps: steps.map((s, i) => ({ ...s, position: i })),
        isDirty: true,
        undoStack: newUndoStack,
        redoStack: [],
      }
    }),

  selectStep: (id) => set({ selectedStepId: id }),

  toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),

  initializeWorkflow: (data) =>
    set({ ...initialState, ...data, isDirty: false, undoStack: [], redoStack: [] }),

  resetStore: () => set(initialState),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state
      const previous = state.undoStack[state.undoStack.length - 1]
      const newUndoStack = state.undoStack.slice(0, -1)
      const newRedoStack = [...state.redoStack, captureState(state)]
      return {
        ...previous,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      const newRedoStack = state.redoStack.slice(0, -1)
      const newUndoStack = [...state.undoStack, captureState(state)]
      return {
        ...next,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      }
    }),

  setWorkflowStatus: (status) => set({ workflowStatus: status }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPendingRunId: (runId) => set({ pendingRunId: runId }),

  clearDirty: () => set({ isDirty: false }),
}))
