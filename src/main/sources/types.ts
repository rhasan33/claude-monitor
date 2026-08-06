import type { UsageSourceEvent } from '../../shared/types'

export interface SourceTarget {
  /** Opaque identifier for the underlying unit being read (e.g. a file path). */
  id: string
  sessionId: string
  projectPath: string
}

/**
 * A pluggable usage data source. Today there's one implementation
 * (claude-code-local). Everything above this layer — the aggregator, IPC
 * handlers, and UI — depends only on UsageSourceEvent, so adding a second
 * source later (Anthropic Admin API, self-instrumented API calls) means
 * adding one new folder here, not reworking the rest of the app.
 */
export interface UsageSource {
  id: string
  displayName: string
  /** Enumerate everything this source currently has to offer. */
  discover(): Promise<SourceTarget[]>
  /** Read all events for one target, in full (v1 has no incremental/offset reads). */
  read(target: SourceTarget): Promise<UsageSourceEvent[]>
}
