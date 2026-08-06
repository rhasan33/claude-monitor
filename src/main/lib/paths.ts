import { homedir } from 'os'
import { join } from 'path'

const claudeDir = join(homedir(), '.claude')
// This app's own config — deliberately separate from ~/.claude, which
// belongs to Claude Code itself and is only ever read here, never written.
const configDir = join(homedir(), '.claude-monitor')

export const paths = {
  claudeDir,
  projectsDir: join(claudeDir, 'projects'),
  claudeJson: join(homedir(), '.claude.json'),
  historyJsonl: join(claudeDir, 'history.jsonl'),
  configDir,
  budgetJson: join(configDir, 'budget.json')
}
