import { spawn } from 'node:child_process'
import {
  createEditToolDefinition,
  type EditToolDetails,
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import {
  Text,
  truncateToWidth,
  visibleWidth,
  type Component,
} from '@earendil-works/pi-tui'
import { getSetting } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/storage.ts'
import { type SettingDefinition } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/types.ts'

const EXTENSION_NAME = 'delta-diff'
const DELTA_TIMEOUT_MS = 5_000
const MIN_DELTA_WIDTH = 40

const LEFT_TOOL_SUCCESS_GUTTER_WIDTH = 1
const LEFT_TERMINAL_GAP_WIDTH = 1
const RIGHT_TERMINAL_GAP_WIDTH = 1
const DELTA_RENDER_GUTTER_WIDTH =
  LEFT_TOOL_SUCCESS_GUTTER_WIDTH +
  LEFT_TERMINAL_GAP_WIDTH +
  RIGHT_TERMINAL_GAP_WIDTH
const DELTA_PROCESS_WIDTH_OFFSET = 4

const TRAILING_CLEAR_TO_EOL_RE = /(\x1b\[(?:0)?K(?:\x1b\[[0-9;]*m)*)$/
const LEADING_BLANK_LINES_RE = /^(?:\r?\n)+/

const BASE_DELTA_ARGS = [
  '--dark',
  '--paging=never',
  '--line-numbers',
  '--hyperlinks',
  '--file-style=omit',
]

type DeltaEditDetails = EditToolDetails & {
  patch?: string
  delta?: string
  deltaError?: string
}

type ToolBgName = 'toolPendingBg' | 'toolSuccessBg' | 'toolErrorBg'
type ToolTheme = {
  bg(color: ToolBgName, text: string): string
  fg(color: 'toolTitle' | 'accent', text: string): string
  bold(text: string): string
}
type ToolStatus = { isPartial: boolean; isError: boolean }

function isEnabled() {
  return getSetting(EXTENSION_NAME, 'enabled', 'on') === 'on'
}

function isSideBySideEnabled() {
  return getSetting(EXTENSION_NAME, 'sideBySide', 'off') === 'on'
}

function getDeltaWidth() {
  const columns = process.stdout.columns ?? Number(process.env.COLUMNS)
  if (!Number.isFinite(columns) || columns <= 0) return undefined
  return Math.max(MIN_DELTA_WIDTH, Math.floor(columns) - DELTA_PROCESS_WIDTH_OFFSET)
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
        description:
          "Render edit diffs with delta instead of pi's built-in diff renderer",
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

function padDeltaLine(line: string, width: number) {
  const padding = ' '.repeat(Math.max(0, width - visibleWidth(line)))
  if (!padding) return line

  // Delta paints full added/removed lines by setting a diff background and then
  // emitting ESC[K to clear to end-of-line while that background is active. pi's
  // Box component cannot measure ESC[K, so if we leave the line short it will add
  // padding after delta's final reset, turning the rest of the row back into the
  // toolSuccessBg color. Insert the padding immediately before delta's trailing
  // clear-to-EOL sequence instead, so the spaces inherit delta's green/red diff
  // background and the parent Box sees the line as already full width.
  const clearToEnd = TRAILING_CLEAR_TO_EOL_RE.exec(line)
  if (clearToEnd?.index === undefined) return line + padding

  return `${line.slice(0, clearToEnd.index)}${padding}${clearToEnd[0]}`
}

function getDeltaContentWidth(width: number) {
  return Math.max(1, width - DELTA_RENDER_GUTTER_WIDTH)
}

function renderDeltaContentLine(rawLine: string, width: number) {
  const line = truncateToWidth(rawLine, width, '')
  return padDeltaLine(line, width)
}

function renderDeltaGutters(edgeBg: (text: string) => string) {
  return {
    left:
      edgeBg(' '.repeat(LEFT_TOOL_SUCCESS_GUTTER_WIDTH)) +
      ' '.repeat(LEFT_TERMINAL_GAP_WIDTH),
    right: ' '.repeat(RIGHT_TERMINAL_GAP_WIDTH),
  }
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
    const deltaWidth = getDeltaContentWidth(width)
    const { left, right } = renderDeltaGutters(this.edgeBg)

    return this.text.split('\n').map((rawLine) => (
      `${left}${renderDeltaContentLine(rawLine, deltaWidth)}${right}`
    ))
  }
}

function bg(theme: ToolTheme, color: ToolBgName) {
  return (text: string) => theme.bg(color, text)
}

function getToolBg(theme: ToolTheme, status: ToolStatus) {
  if (status.isPartial) return bg(theme, 'toolPendingBg')
  if (status.isError) return bg(theme, 'toolErrorBg')
  return bg(theme, 'toolSuccessBg')
}

function shortPath(input: unknown) {
  if (typeof input !== 'string') return undefined
  const home = process.env.HOME
  if (home && input.startsWith(home)) return `~${input.slice(home.length)}`
  return input
}

function getEditPathDisplay(args: unknown) {
  const editArgs = args as { path?: unknown; file_path?: unknown } | undefined
  return shortPath(editArgs?.path) ?? shortPath(editArgs?.file_path) ?? '...'
}

function deltaErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function normalizeDeltaOutput(output: string) {
  return output.replace(LEADING_BLANK_LINES_RE, '').trimEnd()
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
          return (
            base.renderCall?.(args, theme, context) ??
            new Text(theme.fg('toolTitle', theme.bold('edit')), 0, 0)
          )
        }

        const path = getEditPathDisplay(args)
        const title = theme.fg('toolTitle', theme.bold('edit'))
        const pathText = theme.fg('accent', path)
        return new Text(`${title} ${pathText}`, 1, 1, getToolBg(theme, context))
      },
      renderResult(result, options, theme, context) {
        const details = result.details as DeltaEditDetails | undefined

        if (isEnabled() && details?.delta) {
          return new DeltaDiffText(details.delta, bg(theme, 'toolSuccessBg'))
        }

        if (isEnabled() && details?.deltaError) {
          return new Text(details.deltaError, 1, 1, bg(theme, 'toolErrorBg'))
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
