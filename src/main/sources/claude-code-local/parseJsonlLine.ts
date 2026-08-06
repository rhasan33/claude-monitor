import type { UsageSourceEvent } from '../../../shared/types'

interface RawContentBlock {
  type?: string
  name?: string
}

interface RawUsage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation?: {
    ephemeral_1h_input_tokens?: number
    ephemeral_5m_input_tokens?: number
  }
  server_tool_use?: {
    web_search_requests?: number
    web_fetch_requests?: number
  }
}

interface RawMessage {
  model?: string
  usage?: RawUsage
  content?: RawContentBlock[]
}

interface RawLine {
  uuid?: string
  sessionId?: string
  cwd?: string
  timestamp?: string
  type?: string
  message?: RawMessage
}

const SOURCE_ID = 'claude_code_local'

/**
 * Parses one line of a Claude Code session transcript (~/.claude/projects/.../*.jsonl)
 * into a source-agnostic UsageSourceEvent. Returns null for lines that don't carry
 * a usable event (missing uuid/session/timestamp, or malformed JSON) rather than
 * throwing — a single bad line (e.g. a partially-flushed final line) must not
 * abort the whole file.
 */
export function parseJsonlLine(line: string): UsageSourceEvent | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let raw: RawLine
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return null
  }

  // Everything past this point assumes a shape that, in practice, drifts
  // across Claude Code versions and line types (e.g. `content` is sometimes
  // a plain string instead of a block array). Any single line's oddities
  // must not abort the rest of the file, so the whole extraction is guarded.
  try {
    if (!raw.uuid || !raw.sessionId || !raw.timestamp || !raw.cwd) return null

    const timestampMs = Date.parse(raw.timestamp)
    if (Number.isNaN(timestampMs)) return null

    const role = raw.type === 'user' || raw.type === 'assistant' ? raw.type : 'other'

    const rawUsage = raw.message?.usage
    const usage = rawUsage
      ? {
          inputTokens: rawUsage.input_tokens ?? 0,
          outputTokens: rawUsage.output_tokens ?? 0,
          cacheCreationInputTokens: rawUsage.cache_creation_input_tokens ?? 0,
          cacheReadInputTokens: rawUsage.cache_read_input_tokens ?? 0,
          cacheCreationEphemeral1hTokens: rawUsage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
          cacheCreationEphemeral5mTokens: rawUsage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
          webSearchRequests: rawUsage.server_tool_use?.web_search_requests ?? 0,
          webFetchRequests: rawUsage.server_tool_use?.web_fetch_requests ?? 0
        }
      : undefined

    const content = raw.message?.content
    const toolUseNames = (Array.isArray(content) ? content : [])
      .filter((block) => block.type === 'tool_use' && block.name)
      .map((block) => block.name as string)

    return {
      sourceId: SOURCE_ID,
      eventUuid: raw.uuid,
      sessionId: raw.sessionId,
      projectPath: raw.cwd,
      timestampMs,
      role,
      model: raw.message?.model,
      usage,
      toolUseNames
    }
  } catch {
    return null
  }
}
