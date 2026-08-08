import { readFile } from 'fs/promises'
import type { ConfigScope, McpServerConfig, McpTransport } from '../../../shared/types'
import { paths, projectClaudePaths } from '../paths'
import { atomicWriteFile } from '../atomicWrite'

interface RawStdioServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

interface RawHttpServer {
  type: 'http' | 'sse'
  url: string
}

type RawServer = RawStdioServer | RawHttpServer

function rawToMcpServers(raw: Record<string, unknown>): McpServerConfig[] {
  const servers: McpServerConfig[] = []
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    if (typeof entry.url === 'string') {
      const transport: McpTransport = entry.type === 'sse' ? 'sse' : 'http'
      servers.push({ name, transport, url: entry.url })
    } else if (typeof entry.command === 'string') {
      servers.push({
        name,
        transport: 'stdio',
        command: entry.command,
        args: Array.isArray(entry.args) ? entry.args.filter((a): a is string => typeof a === 'string') : undefined,
        env:
          typeof entry.env === 'object' && entry.env !== null
            ? (entry.env as Record<string, string>)
            : undefined
      })
    }
  }
  return servers
}

function mcpServersToRaw(servers: McpServerConfig[]): Record<string, RawServer> {
  const raw: Record<string, RawServer> = {}
  for (const server of servers) {
    if (server.transport === 'stdio') {
      raw[server.name] = { command: server.command ?? '', args: server.args, env: server.env }
    } else {
      raw[server.name] = { type: server.transport, url: server.url ?? '' }
    }
  }
  return raw
}

function resolveProjectMcpJsonPath(scope: ConfigScope, mcpJsonOverride?: string): string {
  if (mcpJsonOverride) return mcpJsonOverride
  if (scope === 'global') throw new Error('resolveProjectMcpJsonPath requires a project scope')
  return projectClaudePaths(scope.project).mcpJson
}

/** Reads the mcpServers key of ~/.claude.json. Missing/malformed file -> empty list, not an error. */
export async function readGlobalMcpServers(filePath: string = paths.claudeJson): Promise<McpServerConfig[]> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return []
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const mcpServers = parsed.mcpServers
  if (typeof mcpServers !== 'object' || mcpServers === null) return []
  return rawToMcpServers(mcpServers as Record<string, unknown>)
}

/**
 * Writes the given servers into ~/.claude.json's mcpServers key, preserving
 * every other key in the file (it holds unrelated state like oauthAccount).
 * Aborts without writing if the existing file can't be parsed, since a
 * partial merge onto malformed JSON would risk destroying that other state.
 */
export async function writeGlobalMcpServers(
  servers: McpServerConfig[],
  filePath: string = paths.claudeJson
): Promise<void> {
  let raw: string | null = null
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    raw = null
  }

  let parsed: Record<string, unknown> = {}
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(`Refusing to write mcpServers: ${filePath} contains malformed JSON`)
    }
  }

  const updated = { ...parsed, mcpServers: mcpServersToRaw(servers) }
  await atomicWriteFile(filePath, JSON.stringify(updated, null, 2))
}

/** Reads a project's .mcp.json. Missing/malformed file -> empty list, not an error. */
export async function readProjectMcpServers(scope: ConfigScope, mcpJsonOverride?: string): Promise<McpServerConfig[]> {
  const filePath = resolveProjectMcpJsonPath(scope, mcpJsonOverride)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch {
    return []
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  const mcpServers = parsed.mcpServers
  if (typeof mcpServers !== 'object' || mcpServers === null) return []
  return rawToMcpServers(mcpServers as Record<string, unknown>)
}

/** Overwrites a project's .mcp.json in full — the file's sole purpose is mcpServers. */
export async function writeProjectMcpServers(
  scope: ConfigScope,
  servers: McpServerConfig[],
  mcpJsonOverride?: string
): Promise<void> {
  const filePath = resolveProjectMcpJsonPath(scope, mcpJsonOverride)
  await atomicWriteFile(filePath, JSON.stringify({ mcpServers: mcpServersToRaw(servers) }, null, 2))
}
