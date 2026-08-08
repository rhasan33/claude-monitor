import { homedir } from 'os'
import { join } from 'path'

const claudeDir = join(homedir(), '.claude')
// This app's own config — deliberately separate from ~/.claude, which belongs
// to Claude Code itself. Most of ~/.claude is only ever read, never written.
// The exception is src/main/lib/claudeConfig/, which reads AND writes
// Claude Code's skills/MCP-server/settings config on the user's behalf —
// those writers use atomicWrite.ts and must be handled with extra care since
// they touch Claude Code's real functional config, not just display data.
const configDir = join(homedir(), '.claude-monitor')

export const paths = {
  claudeDir,
  projectsDir: join(claudeDir, 'projects'),
  claudeJson: join(homedir(), '.claude.json'),
  historyJsonl: join(claudeDir, 'history.jsonl'),
  skillsDir: join(claudeDir, 'skills'),
  globalSettingsJson: join(claudeDir, 'settings.json'),
  configDir,
  budgetJson: join(configDir, 'budget.json'),
  pricingOverridesJson: join(configDir, 'pricing-overrides.json')
}

/** Resolves the .claude/skills, .mcp.json, .claude/settings.json paths for a project directory. */
export function projectClaudePaths(projectPath: string): {
  skillsDir: string
  mcpJson: string
  settingsJson: string
} {
  return {
    skillsDir: join(projectPath, '.claude', 'skills'),
    mcpJson: join(projectPath, '.mcp.json'),
    settingsJson: join(projectPath, '.claude', 'settings.json')
  }
}
