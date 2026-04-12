export const ALLOWED_MODELS = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] as const

export type AllowedModel = (typeof ALLOWED_MODELS)[number]

export const DEFAULT_MODEL: AllowedModel = 'claude-sonnet-4-6'

/**
 * Return the requested model if it is in the allow list, else DEFAULT_MODEL.
 */
export function resolveModel(requested: string | undefined): AllowedModel {
  if (requested && (ALLOWED_MODELS as readonly string[]).includes(requested)) {
    return requested as AllowedModel
  }
  return DEFAULT_MODEL
}
