import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

const ASK_USER_TOOL_NAME = 'ask_user'
const MAX_LABEL_LENGTH = 60
const FALLBACK_LABEL = 'Waiting for user input'

function labelFromInput(input: unknown) {
  const question =
    typeof input === 'object' &&
    input !== null &&
    'question' in input &&
    typeof input.question === 'string'
      ? input.question.replace(/\s+/g, ' ').trim()
      : ''
  const label = question || FALLBACK_LABEL
  const characters = Array.from(label)

  if (characters.length <= MAX_LABEL_LENGTH) {
    return label
  }

  return `${characters.slice(0, MAX_LABEL_LENGTH - 1).join('')}…`
}

export default function (pi: ExtensionAPI) {
  if (process.env.HERDR_ENV !== '1') {
    return
  }

  const activeToolCallIds = new Set<string>()

  function clearBlocked(toolCallId: string) {
    if (!activeToolCallIds.delete(toolCallId)) {
      return
    }

    pi.events.emit('herdr:blocked', { active: false })
  }

  pi.on('tool_call', (event) => {
    if (
      event.toolName !== ASK_USER_TOOL_NAME ||
      activeToolCallIds.has(event.toolCallId)
    ) {
      return
    }

    activeToolCallIds.add(event.toolCallId)
    pi.events.emit('herdr:blocked', {
      active: true,
      label: labelFromInput(event.input),
    })
  })

  pi.on('tool_result', (event) => {
    clearBlocked(event.toolCallId)
  })

  pi.on('session_shutdown', () => {
    for (const toolCallId of [...activeToolCallIds]) {
      clearBlocked(toolCallId)
    }
  })
}
