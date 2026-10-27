import { keyHint, renderDiff } from '@earendil-works/pi-coding-agent'
import {
  truncateToWidth,
  visibleWidth,
  type Component,
} from '@earendil-works/pi-tui'
import {
  deltaErrorMessage,
  isDeltaUnavailableError,
  runDelta,
} from './delta.ts'
import { deltaWidthFor, resolveLayout, type Layout } from './layout.ts'
import { type DeltaDiffController, type ResponsiveTarget } from './scheduler.ts'

const DELTA_PREVIEW_ROWS = 20

const LEFT_TOOL_SUCCESS_GUTTER_WIDTH = 1
const LEFT_TERMINAL_GAP_WIDTH = 1
const RIGHT_TERMINAL_GAP_WIDTH = 1

const TRAILING_CLEAR_TO_EOL_REGEX = /(\x1b\[(?:0)?K(?:\x1b\[[0-9;]*m)*)$/

export type DiffTheme = {
  bg(color: 'toolSuccessBg', text: string): string
  fg(color: 'muted', text: string): string
}

type Target = { layout: Layout; deltaWidth: number; key: string }
type Output = { gen: number; lines?: string[]; error?: string }
type SideBySideOutput = Output & { deltaWidth: number }
type RowCache = {
  width: number
  source: string[]
  compact?: string[]
  expanded?: string[]
}

export type ResponsiveDeltaDiffOptions = {
  controller: DeltaDiffController
  patch?: string
  diff?: string
  theme: DiffTheme
  expanded: boolean
  invalidate: () => void
}

function renderDeltaContentLine(rawLine: string, width: number) {
  const line = truncateToWidth(rawLine, width, '')
  const padding = ' '.repeat(Math.max(0, width - visibleWidth(line)))
  if (!padding) return line

  // Delta paints full added/removed lines by setting a diff background and then
  // emitting ESC[K to clear to end-of-line while that background is active. pi's
  // Box component cannot measure ESC[K, so if we leave the line short it will add
  // padding after delta's final reset, turning the rest of the row back into the
  // toolSuccessBg color. Insert the padding immediately before delta's trailing
  // clear-to-EOL sequence instead, so the spaces inherit delta's green/red diff
  // background and the parent Box sees the line as already full width.
  const clearToEnd = TRAILING_CLEAR_TO_EOL_REGEX.exec(line)
  if (clearToEnd?.index === undefined) return line + padding

  return `${line.slice(0, clearToEnd.index)}${padding}${clearToEnd[0]}`
}

function renderDeltaGutters(edgeBg: (text: string) => string, width: number) {
  // Preserve the normal three-column gutter, but always leave at least one
  // column for content when a component is rendered at an unusually narrow
  // width.
  let remaining = Math.max(0, width - 1)
  const successWidth = Math.min(LEFT_TOOL_SUCCESS_GUTTER_WIDTH, remaining)
  remaining -= successWidth
  const leftGapWidth = Math.min(LEFT_TERMINAL_GAP_WIDTH, remaining)
  remaining -= leftGapWidth
  const rightGapWidth = Math.min(RIGHT_TERMINAL_GAP_WIDTH, remaining)

  return {
    left: edgeBg(' '.repeat(successWidth)) + ' '.repeat(leftGapWidth),
    right: ' '.repeat(rightGapWidth),
    width: successWidth + leftGapWidth + rightGapWidth,
  }
}

export class ResponsiveDeltaDiff implements Component, ResponsiveTarget {
  renderSeq = 0
  renderedAt = 0

  readonly controller: DeltaDiffController
  private readonly patch?: string
  private readonly diff?: string
  private readonly theme: DiffTheme
  private expanded: boolean
  private notify: () => void

  private unified?: Output
  private sideBySide?: SideBySideOutput
  private nextGen = 0
  private requested = false
  private lastWidth?: number
  private lastError?: string

  private rows?: RowCache
  private fallbackLines?: string[]

  constructor(options: ResponsiveDeltaDiffOptions) {
    this.controller = options.controller
    this.patch = options.patch
    this.diff = options.diff
    this.theme = options.theme
    this.expanded = options.expanded
    this.notify = options.invalidate
    this.controller.attach(this)
  }

  matches(controller: DeltaDiffController, patch?: string, diff?: string) {
    return (
      this.controller === controller && this.patch === patch && this.diff === diff
    )
  }

  update(expanded: boolean, invalidate: () => void) {
    this.expanded = expanded
    this.notify = invalidate
  }

  invalidate() {
    this.rows = undefined
    this.fallbackLines = undefined
  }

  render(width: number) {
    const safeWidth = Math.max(1, Math.floor(width))
    const widthChanged =
      this.lastWidth !== undefined && this.lastWidth !== safeWidth
    this.lastWidth = safeWidth
    this.controller.noteRender(this)
    return this.renderSource(this.selectSource(safeWidth, widthChanged), safeWidth)
  }

  requestMissing() {
    if (this.lastWidth === undefined || !this.canGenerate()) return
    const target = this.targetFor(this.lastWidth)
    if (!this.lookup(target)) this.enqueue(target)
  }

  private canGenerate() {
    return (
      this.patch !== undefined &&
      !this.controller.disposed &&
      !this.controller.unavailable
    )
  }

  private targetFor(width: number): Target {
    const { layout: setting, breakpoint } = this.controller.settings
    const layout = resolveLayout(setting, breakpoint, width)
    const deltaWidth = deltaWidthFor(width)
    const key = layout === 'unified' ? 'unified' : `side-by-side:${deltaWidth}`
    return { layout, deltaWidth, key }
  }

  private lookup(target: Target): Output | undefined {
    if (target.layout === 'unified') return this.unified
    return this.sideBySide?.deltaWidth === target.deltaWidth
      ? this.sideBySide
      : undefined
  }

  private selectSource(width: number, widthChanged: boolean): string[] {
    if (this.patch === undefined || this.controller.unavailable) {
      return this.fallback()
    }

    const target = this.targetFor(width)
    const hit = this.lookup(target)
    if (hit) return hit.lines ?? this.fallback()

    const other =
      target.layout === 'unified' ? this.sideBySide?.lines : this.unified?.lines
    const previous =
      target.layout === 'side-by-side' && this.sideBySide
        ? (this.sideBySide.lines ?? this.fallback())
        : undefined

    if (!this.controller.disposed) this.request(target, widthChanged)
    return other ?? previous ?? this.fallback()
  }

  private request(target: Target, widthChanged: boolean) {
    if (this.controller.isPending(this, target.key)) return
    if (!this.requested) {
      this.enqueue(target)
    } else if (widthChanged) {
      this.controller.restartDebounce()
    } else {
      this.controller.ensureDebounce()
    }
  }

  private enqueue(target: Target) {
    this.requested = true
    const gen = ++this.nextGen
    this.controller.enqueue({
      owner: this,
      key: target.key,
      isStale: () => {
        if (this.lastWidth === undefined) return true
        const current = this.targetFor(this.lastWidth)
        return current.key !== target.key || this.lookup(current) !== undefined
      },
      run: (signal) => this.generate(target, gen, signal),
    })
  }

  private async generate(target: Target, gen: number, signal: AbortSignal) {
    const { controller } = this
    let output: Output

    if (controller.unavailable || this.patch === undefined) {
      output = { gen, error: 'delta is not available' }
    } else {
      try {
        const text = await runDelta(this.patch, {
          width: target.deltaWidth,
          layout: target.layout,
          signal,
        })
        controller.markVerified()
        output = { gen, lines: text.split('\n') }
      } catch (error) {
        if (isDeltaUnavailableError(error)) {
          controller.markUnavailable()
        } else {
          controller.markVerified()
        }
        output = { gen, error: deltaErrorMessage(error) }
      }
    }

    if (controller.disposed) return
    if (output.error) this.lastError = output.error
    this.install(target, output)
    this.rows = undefined
    this.notify()
  }

  private install(target: Target, output: Output) {
    if (target.layout === 'unified') {
      if (!this.unified || output.gen > this.unified.gen) this.unified = output
    } else if (!this.sideBySide || output.gen > this.sideBySide.gen) {
      this.sideBySide = { ...output, deltaWidth: target.deltaWidth }
    }
  }

  private fallback() {
    this.fallbackLines ??= this.diff
      ? renderDiff(this.diff).split('\n')
      : [this.theme.fg('muted', this.lastError ?? 'no diff available')]
    return this.fallbackLines
  }

  private renderRows(rawLines: string[], width: number) {
    const edgeBg = (text: string) => this.theme.bg('toolSuccessBg', text)
    const { left, right, width: gutterWidth } = renderDeltaGutters(edgeBg, width)
    const contentWidth = Math.max(1, width - gutterWidth)
    return rawLines.map(
      (rawLine) => `${left}${renderDeltaContentLine(rawLine, contentWidth)}${right}`
    )
  }

  private renderHint(hiddenRows: number, width: number) {
    // Start from a clean SGR state so delta's final line styling cannot bleed
    // into the preview hint in terminals that do not reset between rows.
    const hint =
      '\x1b[0m' +
      this.theme.fg('muted', `… ${hiddenRows} more rows — `) +
      keyHint('app.tools.expand', 'to expand')
    return this.renderRows([hint], width)[0] ?? ''
  }

  private renderSource(source: string[], width: number) {
    if (this.rows?.width !== width || this.rows.source !== source) {
      this.rows = { width, source }
    }
    return this.expanded
      ? this.renderExpanded(this.rows)
      : this.renderCompact(this.rows)
  }

  private renderCompact(cache: RowCache) {
    if (cache.compact) return cache.compact
    const { source, width } = cache

    if (source.length <= DELTA_PREVIEW_ROWS) {
      const lines = cache.expanded ?? this.renderRows(source, width)
      cache.compact = lines
      cache.expanded = lines
      return lines
    }

    const content = cache.expanded
      ? cache.expanded.slice(0, DELTA_PREVIEW_ROWS)
      : this.renderRows(source.slice(0, DELTA_PREVIEW_ROWS), width)
    cache.compact = [
      ...content,
      this.renderHint(source.length - DELTA_PREVIEW_ROWS, width),
    ]
    return cache.compact
  }

  private renderExpanded(cache: RowCache) {
    if (cache.expanded) return cache.expanded
    const { source, width } = cache

    if (cache.compact && source.length > DELTA_PREVIEW_ROWS) {
      const remaining = this.renderRows(source.slice(DELTA_PREVIEW_ROWS), width)
      cache.expanded = [
        ...cache.compact.slice(0, DELTA_PREVIEW_ROWS),
        ...remaining,
      ]
    } else {
      cache.expanded = this.renderRows(source, width)
    }

    if (source.length <= DELTA_PREVIEW_ROWS) cache.compact = cache.expanded
    return cache.expanded
  }
}
