import {
  createEditToolDefinition,
  type EditToolDetails,
  type ExtensionAPI,
  type ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import { Text } from '@earendil-works/pi-tui'
import { getSetting } from '../../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/storage.ts'
import { type SettingDefinition } from '../../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/types.ts'
import { ResponsiveDeltaDiff } from './component.ts'
import {
  DEFAULT_BREAKPOINT,
  MIN_BREAKPOINT,
  parseBreakpoint,
  parseLayoutSetting,
} from './layout.ts'
import { DeltaDiffController, type DeltaDiffSettings } from './scheduler.ts'

const EXTENSION_NAME = 'delta-diff'
const RELOAD_NOTE = 'Applies after /reload or a new session.'

type ToolBgName = 'toolPendingBg' | 'toolSuccessBg' | 'toolErrorBg'
type ToolTheme = {
  bg(color: ToolBgName, text: string): string
}
type ToolStatus = { isPartial: boolean; isError: boolean }

type RenderState = {
  deltaDiff?: { toolCallId: string; component: ResponsiveDeltaDiff }
}

function readSettings(): DeltaDiffSettings {
  return {
    enabled: getSetting(EXTENSION_NAME, 'enabled', 'on') === 'on',
    layout: parseLayoutSetting(getSetting(EXTENSION_NAME, 'layout', 'auto')),
    breakpoint: parseBreakpoint(
      getSetting(EXTENSION_NAME, 'breakpoint', String(DEFAULT_BREAKPOINT))
    ),
  }
}

function registerSettings(pi: ExtensionAPI) {
  pi.events.emit('pi-extension-settings:register', {
    name: EXTENSION_NAME,
    settings: [
      {
        id: 'enabled',
        label: 'Enabled',
        description: `Render edit diffs with delta instead of pi's built-in diff renderer. ${RELOAD_NOTE}`,
        defaultValue: 'on',
        values: ['on', 'off'],
      },
      {
        id: 'layout',
        label: 'Layout',
        description: `auto switches between unified and side-by-side at the breakpoint width. ${RELOAD_NOTE}`,
        defaultValue: 'auto',
        values: ['auto', 'unified', 'side-by-side'],
      },
      {
        id: 'breakpoint',
        label: 'Side-by-side breakpoint',
        description: `Minimum diff width in columns for side-by-side in auto layout (at least ${MIN_BREAKPOINT}; invalid values use ${DEFAULT_BREAKPOINT}). ${RELOAD_NOTE}`,
        defaultValue: String(DEFAULT_BREAKPOINT),
      },
    ] satisfies SettingDefinition[],
  })
}

function getToolBg(theme: ToolTheme, status: ToolStatus) {
  const color: ToolBgName = status.isPartial
    ? 'toolPendingBg'
    : status.isError
      ? 'toolErrorBg'
      : 'toolSuccessBg'
  return (text: string) => theme.bg(color, text)
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

function registerDeltaEditTool(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  controller: DeltaDiffController
) {
  const base = createEditToolDefinition(ctx.cwd)

  pi.registerTool({
    ...base,
    renderCall(args, theme, context) {
      if (!controller.settings.enabled) {
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
      const details = result.details as Partial<EditToolDetails> | undefined
      const patch = details?.patch || undefined
      const diff = details?.diff || undefined

      if (!controller.settings.enabled || context.isError || (!patch && !diff)) {
        // pi's built-in edit result renderer reuses lastComponent as a
        // Container, so never hand it our component.
        const lastComponent =
          context.lastComponent instanceof ResponsiveDeltaDiff
            ? undefined
            : context.lastComponent
        return (
          base.renderResult?.(result, options, theme, {
            ...context,
            lastComponent,
          }) ?? new Text('')
        )
      }

      const state = context.state as RenderState
      const stored = state.deltaDiff
      let component =
        stored?.toolCallId === context.toolCallId &&
        stored.component.matches(controller, patch, diff)
          ? stored.component
          : undefined

      if (!component) {
        component = new ResponsiveDeltaDiff({
          controller,
          patch,
          diff,
          theme,
          expanded: options.expanded,
          invalidate: context.invalidate,
        })
        state.deltaDiff = { toolCallId: context.toolCallId, component }
      }

      component.update(options.expanded, context.invalidate)
      return component
    },
  })
}

export default function (pi: ExtensionAPI) {
  let controller: DeltaDiffController | undefined

  registerSettings(pi)

  pi.on('session_start', (_event, ctx) => {
    controller?.dispose()
    controller = new DeltaDiffController(readSettings())
    registerSettings(pi)
    registerDeltaEditTool(pi, ctx, controller)
  })

  pi.on('session_shutdown', () => {
    controller?.dispose()
    controller = undefined
  })
}
