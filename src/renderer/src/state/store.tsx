import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode
} from 'react'
import type {
  ActivityItem,
  AggregatedOverview,
  BudgetSettings,
  OverviewParams,
  Profile,
  ProjectSummary,
  RefreshResult
} from '../../../shared/types'

interface AppState {
  overview: AggregatedOverview | null
  projects: ProjectSummary[]
  activity: ActivityItem[]
  profile: Profile | null
  budget: BudgetSettings
  filters: OverviewParams
  loading: boolean
  filtering: boolean
  error: string | null
  lastRefresh: RefreshResult | null
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_ERROR'; message: string }
  | {
      type: 'DATA_LOADED'
      overview: AggregatedOverview
      projects: ProjectSummary[]
      activity: ActivityItem[]
      profile: Profile
      budget: BudgetSettings
    }
  | { type: 'REFRESH_RESULT'; result: RefreshResult }
  | { type: 'FILTER_START' }
  | { type: 'FILTERED_OVERVIEW_LOADED'; overview: AggregatedOverview; filters: OverviewParams }
  | { type: 'BUDGET_UPDATED'; budget: BudgetSettings }

const initialState: AppState = {
  overview: null,
  projects: [],
  activity: [],
  profile: null,
  budget: { monthlyLimitUsd: null },
  filters: {},
  loading: true,
  filtering: false,
  error: null,
  lastRefresh: null
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null }
    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.message }
    case 'DATA_LOADED':
      return {
        ...state,
        loading: false,
        error: null,
        overview: action.overview,
        projects: action.projects,
        activity: action.activity,
        profile: action.profile,
        budget: action.budget
      }
    case 'REFRESH_RESULT':
      return { ...state, lastRefresh: action.result }
    case 'FILTER_START':
      return { ...state, filtering: true }
    case 'FILTERED_OVERVIEW_LOADED':
      return { ...state, filtering: false, overview: action.overview, filters: action.filters }
    case 'BUDGET_UPDATED':
      return { ...state, budget: action.budget }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  refresh: () => Promise<void>
  setFilters: (filters: OverviewParams) => Promise<void>
  setBudget: (budget: BudgetSettings) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Re-fetches the already-scanned data for the given filters, without
  // triggering another disk re-scan. Used both after an explicit refresh
  // and after the main process pushes `dataChanged` (it has already
  // re-scanned by that point — re-scanning again here would be redundant).
  const loadViews = useCallback(async (filters: OverviewParams) => {
    dispatch({ type: 'LOAD_START' })
    try {
      const [overview, projects, activity, profile, budget] = await Promise.all([
        window.api.getOverview(filters),
        window.api.getProjects(),
        window.api.getRecentActivity(50),
        window.api.getProfile(),
        window.api.getBudget()
      ])
      dispatch({ type: 'DATA_LOADED', overview, projects, activity, profile, budget })
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', message: error instanceof Error ? error.message : String(error) })
    }
  }, [])

  const loadAll = useCallback(
    async (filters: OverviewParams) => {
      dispatch({ type: 'LOAD_START' })
      try {
        const result = await window.api.refresh()
        dispatch({ type: 'REFRESH_RESULT', result })
        await loadViews(filters)
      } catch (error) {
        dispatch({ type: 'LOAD_ERROR', message: error instanceof Error ? error.message : String(error) })
      }
    },
    [loadViews]
  )

  const refresh = useCallback(() => loadAll(state.filters), [loadAll, state.filters])

  const setFilters = useCallback(async (filters: OverviewParams) => {
    dispatch({ type: 'FILTER_START' })
    try {
      const overview = await window.api.getOverview(filters)
      dispatch({ type: 'FILTERED_OVERVIEW_LOADED', overview, filters })
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', message: error instanceof Error ? error.message : String(error) })
    }
  }, [])

  const setBudget = useCallback(async (budget: BudgetSettings) => {
    await window.api.setBudget(budget)
    dispatch({ type: 'BUDGET_UPDATED', budget })
  }, [])

  useEffect(() => {
    loadAll({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return window.api.onDataChanged(() => {
      void loadViews(state.filters)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters])

  const value = useMemo(
    () => ({ state, refresh, setFilters, setBudget }),
    [state, refresh, setFilters, setBudget]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within an AppProvider')
  return ctx
}
