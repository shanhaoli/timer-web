export interface Pause {
  startedAt: number
  endedAt: number | null // null 表示暂停中
}

export interface Block {
  id: string
  startedAt: number
  endedAt: number | null // 提交记录或跳过的时刻
  note: string
  progress: string
  skipped: boolean
}

export interface Session {
  id: string
  startedAt: number
  endedAt: number | null
  plannedMinutes: number
  intervalMinutes: number
  blocks: Block[]
  pauses: Pause[]
}

export type TimerPhase = 'idle' | 'running' | 'awaiting' | 'paused-running' | 'paused-awaiting'

export interface TimerState {
  phase: TimerPhase
  session: Session | null
  // running 时为当前 Block 的预定到点时刻（已含暂停补偿）；
  // awaiting / paused 时为 null
  dueAt: number | null
}
