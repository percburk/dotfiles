import { type LayoutSetting } from './layout.ts'

const MAX_CONCURRENT = 4
const DEBOUNCE_MS = 120
// Every frame renders every tool row, so a row that has not rendered for this
// long while others have is no longer in the transcript.
const LIVE_WINDOW_MS = 1_000

export type DeltaDiffSettings = {
  enabled: boolean
  layout: LayoutSetting
  breakpoint: number
}

export interface ResponsiveTarget {
  renderSeq: number
  renderedAt: number
  /** Enqueue whatever output the last rendered width still needs. */
  requestMissing(): void
}

export type GenerationJob = {
  owner: object
  key: string
  /** Checked when the job reaches the front of the queue. */
  isStale(): boolean
  run(signal: AbortSignal): Promise<void>
}

export class DeltaDiffController {
  readonly settings: DeltaDiffSettings
  disposed = false
  unavailable = false

  private verified = false
  private readonly abort = new AbortController()
  private debounceTimer?: ReturnType<typeof setTimeout>
  private pumpScheduled = false
  private running = 0
  private readonly stack: GenerationJob[] = []
  private readonly pending = new Map<object, Set<string>>()
  private readonly targets = new Set<WeakRef<ResponsiveTarget>>()
  private renderSeq = 0
  private lastRenderAt = 0

  constructor(settings: DeltaDiffSettings) {
    this.settings = settings
  }

  attach(target: ResponsiveTarget) {
    if (!this.disposed) this.targets.add(new WeakRef(target))
  }

  noteRender(target: ResponsiveTarget) {
    target.renderSeq = ++this.renderSeq
    target.renderedAt = this.lastRenderAt = performance.now()
  }

  isPending(owner: object, key: string) {
    return this.pending.get(owner)?.has(key) ?? false
  }

  /** Restart the shared debounce; used when a rendered width changes. */
  restartDebounce() {
    if (this.disposed) return
    clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS)
  }

  /** Start the shared debounce unless it is already counting down. */
  ensureDebounce() {
    if (this.disposed || this.debounceTimer) return
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS)
  }

  enqueue(job: GenerationJob) {
    if (this.disposed || this.isPending(job.owner, job.key)) return false
    let keys = this.pending.get(job.owner)
    if (!keys) {
      keys = new Set()
      this.pending.set(job.owner, keys)
    }
    keys.add(job.key)
    this.stack.push(job)
    this.schedulePump()
    return true
  }

  markVerified() {
    this.verified = true
  }

  markUnavailable() {
    this.unavailable = true
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    clearTimeout(this.debounceTimer)
    this.debounceTimer = undefined
    this.stack.length = 0
    this.pending.clear()
    this.targets.clear()
    this.abort.abort()
  }

  private flush() {
    this.debounceTimer = undefined
    if (this.disposed) return

    const live: ResponsiveTarget[] = []
    for (const ref of this.targets) {
      const target = ref.deref()
      if (!target) {
        this.targets.delete(ref)
      } else if (target.renderedAt >= this.lastRenderAt - LIVE_WINDOW_MS) {
        live.push(target)
      }
    }

    // Requests are pushed top to bottom; the LIFO stack then starts with the
    // bottom-most row, which is the one visible when scrolled to the end.
    live.sort((a, b) => a.renderSeq - b.renderSeq)
    for (const target of live) target.requestMissing()
    this.pump()
  }

  // Rows render top to bottom within a frame. Deferring the pump until the
  // frame finishes lets the whole frame's requests stack up first.
  private schedulePump() {
    if (this.pumpScheduled) return
    this.pumpScheduled = true
    queueMicrotask(() => {
      this.pumpScheduled = false
      this.pump()
    })
  }

  private concurrencyLimit() {
    // Probe with a single process until delta is known to exist, so a missing
    // binary costs one failed spawn.
    return this.verified || this.unavailable ? MAX_CONCURRENT : 1
  }

  private release(job: GenerationJob) {
    const keys = this.pending.get(job.owner)
    keys?.delete(job.key)
    if (keys?.size === 0) this.pending.delete(job.owner)
  }

  private pump() {
    while (!this.disposed && this.running < this.concurrencyLimit()) {
      const job = this.stack.pop()
      if (!job) return
      if (job.isStale()) {
        this.release(job)
        continue
      }

      this.running++
      void job
        .run(this.abort.signal)
        .catch(() => {})
        .finally(() => {
          this.running--
          this.release(job)
          this.pump()
        })
    }
  }
}
