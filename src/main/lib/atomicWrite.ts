import { writeFile, rename, mkdir } from 'fs/promises'
import { dirname } from 'path'

/**
 * Writes content to a temp file in the same directory, then renames it into
 * place. A crash mid-write leaves the original file untouched instead of a
 * truncated/corrupt one — required for files Claude Monitor doesn't own,
 * like Claude Code's own config under ~/.claude.
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmpPath, content, 'utf-8')
  await rename(tmpPath, filePath)
}
