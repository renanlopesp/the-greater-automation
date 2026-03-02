/**
 * In-memory store for tracking step outputs during a single workflow run.
 * Provides step outputs in the format expected by variable resolution.
 */

export class StepOutputStore {
  private outputs: Map<number, unknown> = new Map()
  private triggerOutput: unknown = null

  /**
   * Set the trigger output for this run.
   */
  setTriggerOutput(output: unknown): void {
    this.triggerOutput = output
  }

  /**
   * Store the output of a step.
   * @param stepPosition - The position of the step (0-based)
   * @param output - The output value from the step
   */
  setOutput(stepPosition: number, output: unknown): void {
    this.outputs.set(stepPosition, output)
  }

  /**
   * Get the output of a specific step.
   * @param stepPosition - The position of the step (0-based)
   */
  getOutput(stepPosition: number): unknown {
    return this.outputs.get(stepPosition)
  }

  /**
   * Get the full context for variable resolution.
   * Returns an object with trigger and step_N properties.
   */
  getContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {}

    // Add trigger output
    if (this.triggerOutput !== null) {
      context.trigger = { output: this.triggerOutput }
    }

    // Add step outputs (step_2, step_3, etc.) — trigger is step_1
    this.outputs.forEach((output, position) => {
      // position 0 -> step_2, position 1 -> step_3, etc. (trigger = step_1)
      context[`step_${position + 2}`] = { output }
    })

    return context
  }

  /**
   * Clear all stored outputs (useful for cleanup).
   */
  clear(): void {
    this.outputs.clear()
    this.triggerOutput = null
  }
}
