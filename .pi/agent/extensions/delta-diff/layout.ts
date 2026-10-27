export type LayoutSetting = 'auto' | 'unified' | 'side-by-side'
export type Layout = 'unified' | 'side-by-side'

export const DEFAULT_BREAKPOINT = 180
export const MIN_BREAKPOINT = 80
export const MIN_DELTA_WIDTH = 40

// One column of tool-success background on the left, one blank column on each
// side of the delta content.
export const GUTTER_WIDTH = 3

const LAYOUT_SETTINGS: readonly LayoutSetting[] = ['auto', 'unified', 'side-by-side']

export function parseLayoutSetting(value: string | undefined): LayoutSetting {
  return LAYOUT_SETTINGS.find((setting) => setting === value?.trim()) ?? 'auto'
}

export function parseBreakpoint(value: string | undefined): number {
  const trimmed = value?.trim() ?? ''
  if (!/^\d+$/.test(trimmed)) return DEFAULT_BREAKPOINT
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return DEFAULT_BREAKPOINT
  return Math.max(MIN_BREAKPOINT, parsed)
}

export function resolveLayout(
  setting: LayoutSetting,
  breakpoint: number,
  componentWidth: number
): Layout {
  if (setting !== 'auto') return setting
  return componentWidth >= breakpoint ? 'side-by-side' : 'unified'
}

export function deltaWidthFor(componentWidth: number) {
  return Math.max(MIN_DELTA_WIDTH, Math.floor(componentWidth) - GUTTER_WIDTH)
}
