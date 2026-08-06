import { watch } from 'fs'
import { paths } from './paths'
import { debounce } from './debounce'

/**
 * Watches Claude Code's local projects directory and calls `onChange`
 * (debounced) whenever a session file is written. `recursive: true` is
 * macOS/Windows-only in Node's fs.watch, which is fine here — this app
 * only ships a macOS build. Returns a stop function; safe to call even if
 * the directory doesn't exist yet (fresh machine, no Claude Code usage) —
 * `fs.watch` throws synchronously in that case, so this just no-ops rather
 * than crashing the main process.
 */
export function watchProjectsDir(onChange: () => void, debounceMs = 1500): () => void {
  const debounced = debounce(onChange, debounceMs)

  try {
    const watcher = watch(paths.projectsDir, { recursive: true }, () => debounced())
    return () => watcher.close()
  } catch {
    return () => {}
  }
}
