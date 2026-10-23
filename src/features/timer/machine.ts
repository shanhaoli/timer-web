import type { Block, Pause, Session, TimerState } from './types'

export type TimerAction =
  | { type: 'START'; now: number; plannedMinutes: number; intervalMinutes: number }
  | { type: 'TICK'; now: number }
  | { type: 'SUBMIT'; now: number; note: string; progress: string }
  | { type: 'SKIP'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'END'; now: number }

let idCounter = 0
export function makeId(): string {
  idCounter += 1
  return `b${Date.now().toString(36)}-${idCounter}`
}

// 预定到点时刻 = 段开始时刻 + 间隔。暂停冻结倒计时但不顺延到点时刻：
// 暂停跨越原到点时刻时，恢复后一次 tick 即触发提醒（起身节奏跟随墙钟）。
function nextDueAt(session: Session, blockStartedAt: number): number {
  return blockStartedAt + session.intervalMinutes * 60_000
}

export function initialState(): TimerState {
  return { phase: 'idle', session: null, dueAt: null }
}

export function reduce(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START': {
      const session: Session = {
        id: makeId(),
        startedAt: action.now,
        endedAt: null,
        plannedMinutes: action.plannedMinutes,
        intervalMinutes: action.intervalMinutes,
        blocks: [
          {
            id: makeId(),
            startedAt: action.now,
            endedAt: null,
            note: '',
            progress: '',
            skipped: false,
          },
        ],
        pauses: [],
      }
      return {
        phase: 'running',
        session,
        dueAt: action.now + action.intervalMinutes * 60_000,
      }
    }

    case 'TICK': {
      // 每秒 tick：running 且已到点则进入 awaiting。
      // 即使休眠后恢复（tick 迟到），Date.now() 比较仍能正确触发。
      if (state.phase !== 'running' || state.dueAt === null) return state
      if (action.now < state.dueAt) return state
      return { ...state, phase: 'awaiting', dueAt: null }
    }

    case 'SUBMIT': {
      if (state.phase !== 'awaiting' || !state.session) return state
      return advanceBlock(state, action.now, (block) => ({
        ...block,
        endedAt: action.now,
        note: action.note,
        progress: action.progress,
        skipped: false,
      }))
    }

    case 'SKIP': {
      if (state.phase !== 'awaiting' || !state.session) return state
      return advanceBlock(state, action.now, (block) => ({
        ...block,
        endedAt: action.now,
        note: '',
        progress: '',
        skipped: true,
      }))
    }

    case 'PAUSE': {
      if (state.phase !== 'running' && state.phase !== 'awaiting') return state
      if (!state.session) return state
      return {
        ...state,
        phase: state.phase === 'running' ? 'paused-running' : 'paused-awaiting',
        session: {
          ...state.session,
          pauses: [...state.session.pauses, { startedAt: action.now, endedAt: null }],
        },
        dueAt: null,
      }
    }

    case 'RESUME': {
      if (state.phase !== 'paused-running' && state.phase !== 'paused-awaiting') return state
      if (!state.session) return state
      const pauses = state.session.pauses
      const last = pauses[pauses.length - 1]
      if (!last || last.endedAt !== null) return state
      const closedPauses: Pause[] = [
        ...pauses.slice(0, -1),
        { startedAt: last.startedAt, endedAt: action.now },
      ]
      const session = { ...state.session, pauses: closedPauses }
      if (state.phase === 'paused-running') {
        const currentBlock = session.blocks[session.blocks.length - 1]
        return {
          phase: 'running',
          session,
          dueAt: nextDueAt(session, currentBlock.startedAt),
        }
      }
      return { phase: 'awaiting', session, dueAt: null }
    }

    case 'END': {
      if (!state.session) return state
      const session: Session = {
        ...state.session,
        endedAt: action.now,
      }
      // 进行中的当前 Block 以结束时刻收尾
      const blocks = [...session.blocks]
      const current = blocks[blocks.length - 1]
      if (current && current.endedAt === null) {
        blocks[blocks.length - 1] = { ...current, endedAt: action.now }
      }
      return { phase: 'idle', session: { ...session, blocks }, dueAt: null }
    }
  }
}

function advanceBlock(
  state: TimerState,
  now: number,
  update: (block: Block) => Block
): TimerState {
  if (!state.session) return state
  const session = state.session
  const blocks = [...session.blocks]
  const current = blocks[blocks.length - 1]
  blocks[blocks.length - 1] = update(current)
  const newBlock: Block = {
    id: makeId(),
    startedAt: now,
    endedAt: null,
    note: '',
    progress: '',
    skipped: false,
  }
  return {
    phase: 'running',
    session: { ...session, blocks: [...blocks, newBlock] },
    dueAt: now + session.intervalMinutes * 60_000,
  }
}
