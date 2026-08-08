import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { ConfigScope, McpServerConfig, SkillInput, SkillSummary } from '../../../shared/types'

interface ClaudeConfigState {
  scope: ConfigScope
  skills: SkillSummary[]
  mcpServers: McpServerConfig[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_SCOPE'; scope: ConfigScope }
  | { type: 'SKILLS_LOAD_START' }
  | { type: 'SKILLS_LOADED'; skills: SkillSummary[] }
  | { type: 'SKILLS_LOAD_ERROR'; message: string }
  | { type: 'MCP_LOAD_START' }
  | { type: 'MCP_LOADED'; mcpServers: McpServerConfig[] }
  | { type: 'MCP_LOAD_ERROR'; message: string }

const initialState: ClaudeConfigState = {
  scope: 'global',
  skills: [],
  mcpServers: [],
  loading: false,
  error: null
}

function reducer(state: ClaudeConfigState, action: Action): ClaudeConfigState {
  switch (action.type) {
    case 'SET_SCOPE':
      return { ...state, scope: action.scope, skills: [], mcpServers: [] }
    case 'SKILLS_LOAD_START':
      return { ...state, loading: true, error: null }
    case 'SKILLS_LOADED':
      return { ...state, loading: false, skills: action.skills }
    case 'SKILLS_LOAD_ERROR':
      return { ...state, loading: false, error: action.message }
    case 'MCP_LOAD_START':
      return { ...state, loading: true, error: null }
    case 'MCP_LOADED':
      return { ...state, loading: false, mcpServers: action.mcpServers }
    case 'MCP_LOAD_ERROR':
      return { ...state, loading: false, error: action.message }
    default:
      return state
  }
}

interface ClaudeConfigContextValue {
  state: ClaudeConfigState
  setScope: (scope: ConfigScope) => void
  refreshSkills: () => Promise<void>
  saveSkill: (input: SkillInput) => Promise<void>
  deleteSkill: (id: string) => Promise<void>
  refreshMcpServers: () => Promise<void>
  saveMcpServers: (servers: McpServerConfig[]) => Promise<void>
}

const ClaudeConfigContext = createContext<ClaudeConfigContextValue | null>(null)

export function ClaudeConfigProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setScope = useCallback((scope: ConfigScope) => {
    dispatch({ type: 'SET_SCOPE', scope })
  }, [])

  const refreshSkills = useCallback(async () => {
    dispatch({ type: 'SKILLS_LOAD_START' })
    try {
      const skills = await window.api.listSkills(state.scope)
      dispatch({ type: 'SKILLS_LOADED', skills })
    } catch (error) {
      dispatch({ type: 'SKILLS_LOAD_ERROR', message: error instanceof Error ? error.message : String(error) })
    }
  }, [state.scope])

  const saveSkill = useCallback(
    async (input: SkillInput) => {
      await window.api.saveSkill(state.scope, input)
      await refreshSkills()
    },
    [state.scope, refreshSkills]
  )

  const deleteSkill = useCallback(
    async (id: string) => {
      await window.api.deleteSkill(state.scope, id)
      await refreshSkills()
    },
    [state.scope, refreshSkills]
  )

  const refreshMcpServers = useCallback(async () => {
    dispatch({ type: 'MCP_LOAD_START' })
    try {
      const mcpServers = await window.api.getMcpServers(state.scope)
      dispatch({ type: 'MCP_LOADED', mcpServers })
    } catch (error) {
      dispatch({ type: 'MCP_LOAD_ERROR', message: error instanceof Error ? error.message : String(error) })
    }
  }, [state.scope])

  const saveMcpServers = useCallback(
    async (servers: McpServerConfig[]) => {
      await window.api.saveMcpServers(state.scope, servers)
      await refreshMcpServers()
    },
    [state.scope, refreshMcpServers]
  )

  useEffect(() => {
    void refreshSkills()
    void refreshMcpServers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scope])

  const value = useMemo(
    () => ({ state, setScope, refreshSkills, saveSkill, deleteSkill, refreshMcpServers, saveMcpServers }),
    [state, setScope, refreshSkills, saveSkill, deleteSkill, refreshMcpServers, saveMcpServers]
  )

  return <ClaudeConfigContext.Provider value={value}>{children}</ClaudeConfigContext.Provider>
}

export function useClaudeConfig(): ClaudeConfigContextValue {
  const ctx = useContext(ClaudeConfigContext)
  if (!ctx) throw new Error('useClaudeConfig must be used within a ClaudeConfigProvider')
  return ctx
}
