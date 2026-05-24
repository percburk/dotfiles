import path from 'node:path'
import type {
  ExtensionAPI,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent'
import { getSetting } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/storage.ts'
import type { SettingDefinition } from '../npm/node_modules/@juanibiapina/pi-extension-settings/src/settings/types.ts'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

type Rgb = [number, number, number]
type GradientName = 'pink-purple' | 'yellow-orange' | 'blue'
type GradientSetting = GradientName | 'random'
type ArtName = 'Rebel' | 'Larry 3D' | 'Isometric1' | 'Impossible' | 'Terrace'
type ArtSetting = ArtName | 'random'

const HOT_PINK: Rgb = [255, 74, 188]
const ROSE: Rgb = [255, 118, 205]
const MAGENTA: Rgb = [218, 70, 239]
const VIOLET: Rgb = [168, 85, 247]
const PURPLE: Rgb = [210, 166, 255]

const GRADIENT_NAMES: GradientName[] = ['pink-purple', 'yellow-orange', 'blue']

const GRADIENTS: Record<GradientName, Rgb[]> = {
  'pink-purple': [
    HOT_PINK,
    ROSE,
    MAGENTA,
    VIOLET,
    PURPLE,
    VIOLET,
    MAGENTA,
    ROSE,
  ],
  'yellow-orange': [
    [170, 217, 76],
    [230, 180, 80],
    [255, 180, 84],
    [255, 143, 64],
    [242, 150, 104],
    [255, 180, 84],
    [230, 180, 80],
  ],
  blue: [
    [147, 213, 255],
    [89, 194, 255],
    [57, 186, 230],
    [95, 135, 255],
    [43, 86, 191],
    [57, 186, 230],
    [89, 194, 255],
  ],
}

const ART_NAMES: ArtName[] = [
  'Rebel',
  'Larry 3D',
  'Isometric1',
  'Impossible',
  'Terrace',
]

const ASCII_ART: Record<ArtName, string[]> = {
  Rebel: [
    '            ███ ',
    '           ▒▒▒  ',
    ' ████████  ████ ',
    '▒▒███▒▒███▒▒███ ',
    ' ▒███ ▒███ ▒███ ',
    ' ▒███ ▒███ ▒███ ',
    ' ▒███████  █████',
    ' ▒███▒▒▒  ▒▒▒▒▒ ',
    ' ▒███           ',
    ' █████          ',
    '▒▒▒▒▒           ',
  ],
  'Larry 3D': [
    '              ',
    '        __    ',
    ' _____ /\\_\\   ',
    "/\\ '__`\\/\\ \\  ",
    '\\ \\ \\L\\ \\ \\ \\ ',
    ' \\ \\ ,__/\\ \\_\\',
    '  \\ \\ \\/  \\/_/',
    '   \\ \\_\\      ',
    '    \\/_/      ',
  ],
  Isometric1: [
    '      ___                 ',
    '     /\\  \\          ___   ',
    '    /::\\  \\        /\\  \\  ',
    '   /:/\\:\\  \\       \\:\\  \\ ',
    '  /::\\~\\:\\  \\      /::\\__\\',
    ' /:/\\:\\ \\:\\__\\  __/:/\\/__/',
    ' \\/__\\:\\/:/  / /\\/:/  /   ',
    '      \\::/  /  \\::/__/    ',
    '       \\/__/    \\:\\__\\    ',
    '                 \\/__/    ',
    '                          ',
  ],
  Impossible: [
    '         _        _     ',
    '        /\\ \\     /\\ \\   ',
    '       /  \\ \\    \\ \\ \\  ',
    '      / /\\ \\ \\   /\\ \\_\\ ',
    '     / / /\\ \\_\\ / /\\/_/ ',
    '    / / /_/ / // / /    ',
    '   / / /__\\/ // / /     ',
    '  / / /_____// / /      ',
    ' / / /   ___/ / /__     ',
    '/ / /   /\\__\\/_/___\\    ',
    '\\/_/    \\/_________/    ',
    '                        ',
  ],
  Terrace: [
    '           ░██',
    '              ',
    '░████████  ░██',
    '░██    ░██ ░██',
    '░██    ░██ ░██',
    '░███   ░██ ░██',
    '░██░█████  ░██',
    '░██           ',
    '░██           ',
  ],
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function sampleGradient(position: number, palette: Rgb[]) {
  const wrapped = ((position % 1) + 1) % 1
  const scaled = wrapped * palette.length
  const index = Math.floor(scaled)
  const nextIndex = (index + 1) % palette.length
  const t = scaled - index
  const a = palette[index]!
  const b = palette[nextIndex]!
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)] as Rgb
}

function fg([r, g, b]: Rgb, text: string) {
  return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`
}

function gradientText(text: string, phase: number, palette: Rgb[]) {
  const chars = [...text]
  const span = Math.max(chars.length - 1, 1)
  return chars
    .map((char, index) => {
      if (char === ' ') return char
      return fg(sampleGradient(index / span + phase, palette), char)
    })
    .join('')
}

function center(text: string, width: number) {
  const length = [...text].length
  if (length >= width) return text
  return `${' '.repeat(Math.floor((width - length) / 2))}${text}`
}

function projectName() {
  return path.basename(process.cwd()) || 'session'
}

function isEnabled() {
  return getSetting('welcome', 'enabled', 'on') === 'on'
}

function getGradientSetting() {
  return getSetting('welcome', 'gradient', 'pink-purple') ?? 'pink-purple'
}

function randomGradientName() {
  return GRADIENT_NAMES[Math.floor(Math.random() * GRADIENT_NAMES.length)]!
}

function randomArtName() {
  return ART_NAMES[Math.floor(Math.random() * ART_NAMES.length)]!
}

let sessionRandomGradientName = randomGradientName()
let sessionRandomArtName = randomArtName()

function getPalette() {
  const gradientSetting = getGradientSetting()
  if (gradientSetting === 'random') {
    return GRADIENTS[sessionRandomGradientName]
  }
  if (gradientSetting in GRADIENTS) {
    return GRADIENTS[gradientSetting as GradientName]
  }
  return GRADIENTS['pink-purple']
}

function getArtSetting() {
  return getSetting('welcome', 'art', 'Rebel') ?? 'Rebel'
}

function getAsciiArt() {
  const artSetting = getArtSetting()
  if (artSetting === 'random') {
    return ASCII_ART[sessionRandomArtName]
  }
  if (artSetting in ASCII_ART) {
    return ASCII_ART[artSetting as ArtName]
  }
  return ASCII_ART.Rebel
}

function renderHeader(width: number, phase: number, subtitleText: string) {
  const palette = getPalette()
  const asciiArt = getAsciiArt()
  const lines = asciiArt.map((line, row) =>
    gradientText(center(line, width), phase + row * 0.045, palette)
  )
  const subtitle = center(subtitleText, width)

  return [
    '',
    ...lines,
    `${BOLD}${gradientText(subtitle, phase + 0.18, palette)}${RESET}`,
    '',
  ]
}

export default function (pi: ExtensionAPI) {
  let requestRender: (() => void) | undefined
  let currentModelId = 'no model selected'

  function registerSettings() {
    pi.events.emit('pi-extension-settings:register', {
      name: 'welcome',
      settings: [
        {
          id: 'enabled',
          label: 'ASCII Header',
          description: "Show ASCII header instead of pi's default header",
          defaultValue: 'on',
          values: ['on', 'off'],
        },
        {
          id: 'gradient',
          label: 'Color Gradient',
          description: 'Choose the color gradient for the ASCII header',
          defaultValue: 'pink-purple',
          values: [
            'pink-purple',
            'yellow-orange',
            'blue',
            'random',
          ] satisfies GradientSetting[],
        },
        {
          id: 'art',
          label: 'ASCII Art',
          description: 'Choose the ASCII art for the header',
          defaultValue: 'Rebel',
          values: [
            'Rebel',
            'Larry 3D',
            'Isometric1',
            'Impossible',
            'Terrace',
            'random',
          ] satisfies ArtSetting[],
        },
      ] satisfies SettingDefinition[],
    })
  }

  registerSettings()

  function installHeader(ctx: ExtensionContext) {
    ctx.ui.setHeader((tui) => {
      requestRender = () => tui.requestRender()
      return {
        render(width: number) {
          return renderHeader(width, 0, `${currentModelId} · ${projectName()}`)
        },
        invalidate() {
          tui.requestRender()
        },
      }
    })
  }

  function applyHeaderSetting(ctx: ExtensionContext) {
    if (!ctx.hasUI) return

    if (isEnabled()) {
      installHeader(ctx)
      requestRender?.()
    } else {
      ctx.ui.setHeader(undefined)
      requestRender = undefined
    }
  }

  pi.on('session_start', (_event, ctx) => {
    registerSettings()
    sessionRandomGradientName = randomGradientName()
    sessionRandomArtName = randomArtName()
    currentModelId = ctx.model?.id ?? 'no model selected'
    if (!ctx.hasUI) return

    applyHeaderSetting(ctx)
  })

  pi.on('model_select', (event) => {
    currentModelId = event.model.id
    if (isEnabled()) requestRender?.()
  })

  pi.on('session_shutdown', (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.setHeader(undefined)
    requestRender = undefined
  })
}
