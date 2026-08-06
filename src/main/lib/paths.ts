import { homedir } from 'os'
import { join } from 'path'

const claudeDir = join(homedir(), '.claude')

export const paths = {
  claudeDir,
  projectsDir: join(claudeDir, 'projects'),
  claudeJson: join(homedir(), '.claude.json'),
  historyJsonl: join(claudeDir, 'history.jsonl')
}
