import type { AgentModuleRow, ModuleStatus, ModuleWithStatus, ConnectionStatus } from './types'

/**
 * Resolves the computed status of a module based on its enabled state
 * and whether all required connections are present.
 */
export function resolveModuleStatus(
  module: AgentModuleRow,
  activeConnections: string[]
): ModuleStatus {
  if (module.enabled === false) {
    return 'paused'
  }

  const missingConnection = module.required_connections.some(
    (conn) => !activeConnections.includes(conn)
  )
  if (missingConnection) {
    return 'requires_connection'
  }

  return 'active'
}

/**
 * Returns the module row augmented with computed status and per-connection status array.
 */
export function resolveModuleWithStatus(
  module: AgentModuleRow,
  activeConnections: string[]
): ModuleWithStatus {
  const status = resolveModuleStatus(module, activeConnections)

  const connectionStatuses: ConnectionStatus[] = module.required_connections.map((appKey) => ({
    appKey,
    connected: activeConnections.includes(appKey),
    lastSyncAt: null,
  }))

  return {
    ...module,
    status,
    connectionStatuses,
  }
}
