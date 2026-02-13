import type { AppModule, AppModuleRegistry } from './types'
import { githubModule } from './github'
import { slackModule } from './slack'

const modules: AppModuleRegistry = {
  github: githubModule,
  slack: slackModule,
}

/** Get the module definition for an app. Returns undefined if no module is defined. */
export function getAppModule(appId: string): AppModule | undefined {
  return modules[appId.toLowerCase()]
}

/** Check if an app has a module definition */
export function hasAppModule(appId: string): boolean {
  return appId.toLowerCase() in modules
}

/** Get all registered module app IDs */
export function getRegisteredAppIds(): string[] {
  return Object.keys(modules)
}
