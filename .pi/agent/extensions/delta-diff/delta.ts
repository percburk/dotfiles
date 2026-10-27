import { spawn } from 'node:child_process'
import { type Layout } from './layout.ts'

const DELTA_TIMEOUT_MS = 5_000
const LEADING_BLANK_LINES_REGEX = /^(?:\r?\n)+/

const BASE_DELTA_ARGS = [
  '--dark',
  '--paging=never',
  '--line-numbers',
  '--file-style=omit',
]

export type DeltaOptions = {
  width: number
  layout: Layout
  signal?: AbortSignal
}

export function isDeltaUnavailableError(error: unknown) {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'
}

export function deltaErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function buildDeltaArgs({ width, layout }: DeltaOptions) {
  const args = [...BASE_DELTA_ARGS, `--width=${width}`]
  return layout === 'side-by-side' ? [...args, '--side-by-side'] : args
}

// delta rejects `--side-by-side=false`, so unified is forced through Git's
// config-parameter channel. Appending keeps the user's own entries and wins
// over a feature or gitconfig that turns side-by-side on.
export function buildDeltaEnv(
  { width, layout }: DeltaOptions,
  baseEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    CLICOLOR_FORCE: '1',
    COLORTERM: baseEnv.COLORTERM ?? 'truecolor',
    COLUMNS: String(width),
  }
  if (layout === 'unified') {
    const existing = baseEnv.GIT_CONFIG_PARAMETERS?.trim()
    const override = "'delta.side-by-side=false'"
    env.GIT_CONFIG_PARAMETERS = existing ? `${existing} ${override}` : override
  }
  return env
}

function normalizeDeltaOutput(output: string) {
  return output.replace(LEADING_BLANK_LINES_REGEX, '').trimEnd()
}

export function runDelta(patch: string, options: DeltaOptions): Promise<string> {
  const { signal } = options
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('delta rendering aborted'))
      return
    }

    const child = spawn('delta', buildDeltaArgs(options), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: buildDeltaEnv(options),
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const cleanup = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
    }

    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }

    const onAbort = () => {
      child.kill('SIGTERM')
      settle(() => reject(new Error('delta rendering aborted')))
    }

    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      settle(() => reject(new Error(`delta timed out after ${DELTA_TIMEOUT_MS}ms`)))
    }, DELTA_TIMEOUT_MS)

    signal?.addEventListener('abort', onAbort, { once: true })

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      settle(() => reject(error))
    })

    child.on('close', (code) => {
      if (settled) return
      if (code === 0) {
        settle(() => resolve(normalizeDeltaOutput(stdout)))
      } else {
        settle(() =>
          reject(new Error(stderr.trim() || `delta exited with code ${code}`))
        )
      }
    })

    child.stdin.on('error', (error) => {
      settle(() => reject(error))
    })

    child.stdin.end(patch)
  })
}
