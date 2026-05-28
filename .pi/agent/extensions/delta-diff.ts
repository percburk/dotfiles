import { spawn } from 'node:child_process'
import {
  createEditToolDefinition,
  type EditToolDetails,
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import { Text, truncateToWidth, visibleWidth, type Component } from '@earendil-works/pi-tui'
import { getSetting } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/storage.ts'
import { type SettingDefinition } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/types.ts'

const EXTENSION_NAME = 'delta-diff'
const DELTA_TIMEOUT_MS = 5_000

const BASE_DELTA_ARGS = [
  '--dark',
  '--paging=never',
  '--line-numbers',
  '--hyperlinks',
]


type DeltaEditDetails = EditToolDetails & {
  delta?: string
  deltaError?: string
}

function isEnabled() {
  return getSetting(EXTENSION_NAME, 'enabled', 'on') === 'on'
}

function isSideBySideEnabled() {
  return getSetting(EXTENSION_NAME, 'sideBySide', 'off') === 'on'
}

function getDeltaWidth() {
  const columns = process.stdout.columns ?? Number(process.env.COLUMNS)
  if (!Number.isFinite(columns) || columns <= 0) return undefined
  return Math.max(40, Math.floor(columns) - 4)
}

function getDeltaArgs(width?: number) {
  const args = width ? [...BASE_DELTA_ARGS, `--width=${width}`] : [...BASE_DELTA_ARGS]
  return isSideBySideEnabled() ? [...args, '--side-by-side'] : args
}

function registerSettings(pi: ExtensionAPI) {
  pi.events.emit('pi-extension-settings:register', {
    name: EXTENSION_NAME,
    settings: [
      {
        id: 'enabled',
        label: 'Enabled',
        description: 'Render edit diffs with delta instead of pi\'s built-in diff renderer',
        defaultValue: 'on',
        values: ['on', 'off'],
      },
      {
        id: 'sideBySide',
        label: 'Side-by-side',
        description: 'Render delta diffs in side-by-side layout',
        defaultValue: 'off',
        values: ['on', 'off'],
      },
    ] satisfies SettingDefinition[],
  })
}

class DeltaDiffText implements Component {
  private readonly text: string
  private readonly edgeBg: (text: string) => string

  constructor(text: string, edgeBg: (text: string) => string) {
    this.text = text
    this.edgeBg = edgeBg
  }

  invalidate() {}

  render(width: number) {
    const innerWidth = Math.max(1, width - 2)
    return this.text.split('\n').map((rawLine) => {
      const line = truncateToWidth(rawLine, innerWidth, '', true)
      const paddedLine = line + ' '.repeat(Math.max(0, innerWidth - visibleWidth(line)))
      return `${this.edgeBg(' ')} ${paddedLine}`
    })
  }
}

function shortPath(input: unknown) {
  if (typeof input !== 'string') return undefined
  const home = process.env.HOME
  if (home && input.startsWith(home)) return `~${input.slice(home.length)}`
  return input
}

function deltaErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function runDelta(patch: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = getDeltaWidth()
    const child = spawn('delta', getDeltaArgs(width), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLICOLOR_FORCE: '1',
        COLORTERM: process.env.COLORTERM ?? 'truecolor',
        ...(width ? { COLUMNS: String(width) } : {}),
      },
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
        settle(() => resolve(stdout.trimEnd()))
      } else {
        settle(() => reject(new Error(stderr.trim() || `delta exited with code ${code}`)))
      }
    })

    child.stdin.on('error', (error) => {
      settle(() => reject(error))
    })

    child.stdin.end(patch)
  })
}

export default function (pi: ExtensionAPI) {
  function registerDeltaEditTool(ctx: ExtensionContext) {
    const base = createEditToolDefinition(ctx.cwd)

    pi.registerTool({
      ...base,
      async execute(toolCallId, input, signal, onUpdate, toolCtx) {
        const result = await base.execute(toolCallId, input, signal, onUpdate, toolCtx)
        const details = result.details as DeltaEditDetails | undefined

        if (!isEnabled() || !details?.patch) {
          return result
        }

        try {
          const delta = await runDelta(details.patch, signal)
          return {
            ...result,
            details: {
              ...details,
              delta,
              deltaError: undefined,
            } satisfies DeltaEditDetails,
          }
        } catch (error) {
          return {
            ...result,
            details: {
              ...details,
              deltaError: deltaErrorMessage(error),
            } satisfies DeltaEditDetails,
          }
        }
      },

      renderCall(args, theme, context) {
        if (!isEnabled()) {
          return base.renderCall?.(args, theme, context) ?? new Text(theme.fg('toolTitle', theme.bold('edit')), 0, 0)
        }

        const path = shortPath((args as { path?: unknown; file_path?: unknown } | undefined)?.path)
          ?? shortPath((args as { path?: unknown; file_path?: unknown } | undefined)?.file_path)
          ?? '...'

        const title = theme.fg('toolTitle', theme.bold('edit'))
        const pathText = theme.fg('accent', path)
        const bg = context.isPartial
          ? (text: string) => theme.bg('toolPendingBg', text)
          : context.isError
            ? (text: string) => theme.bg('toolErrorBg', text)
            : (text: string) => theme.bg('toolSuccessBg', text)
        return new Text(`${title} ${pathText}`, 1, 1, bg)
      },

      renderResult(result, options, theme, context) {
        const details = result.details as DeltaEditDetails | undefined

        if (isEnabled() && details?.delta) {
          return new DeltaDiffText(details.delta, (text) => theme.bg('toolSuccessBg', text))
        }

        return base.renderResult?.(result, options, theme, context) ?? new Text('')
      },
    })
  }

  registerSettings(pi)

  pi.on('session_start', (_event, ctx) => {
    registerSettings(pi)
    registerDeltaEditTool(ctx)
  })
}
