import type { ClaudeMonitorApi } from '../../preload'

declare global {
  interface Window {
    api: ClaudeMonitorApi
  }
}
