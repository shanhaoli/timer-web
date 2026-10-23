import { describe, expect, it } from 'vitest'
import { initialState, makeId, reduce } from '../src/features/timer/machine'
import type { TimerState } from '../src/features/timer/types'

const T0 = 1_760_000_000_000
const MIN = 60_000

function startedState(intervalMinutes = 45): TimerState {
  return reduce(initialState(), {
    type: 'START',
    now: T0,
    plannedMinutes: 360,
    intervalMinutes,
  })
}

function awaitingState(intervalMinutes = 45): TimerState {
  return reduce(startedState(intervalMinutes), { type: 'TICK', now: T0 + intervalMinutes * MIN })
}

describe('makeId', () => {
  it('生成唯一 id', () => {
    expect(makeId()).not.toBe(makeId())
  })
})

describe('START', () => {
  it('创建首个 Block 并进入 running', () => {
    const s = startedState()
    expect(s.phase).toBe('running')
    expect(s.session?.blocks).toHaveLength(1)
    expect(s.dueAt).toBe(T0 + 45 * MIN)
    expect(s.session?.endedAt).toBeNull()
  })
})

describe('TICK', () => {
  it('未到点保持 running', () => {
    const t = reduce(startedState(), { type: 'TICK', now: T0 + 44 * MIN })
    expect(t.phase).toBe('running')
    expect(t.dueAt).not.toBeNull()
  })

  it('到点进入 awaiting', () => {
    const t = reduce(startedState(), { type: 'TICK', now: T0 + 45 * MIN })
    expect(t.phase).toBe('awaiting')
    expect(t.dueAt).toBeNull()
  })

  it('休眠后迟到 tick 也能触发', () => {
    const t = reduce(startedState(), { type: 'TICK', now: T0 + 105 * MIN })
    expect(t.phase).toBe('awaiting')
  })

  it('awaiting 状态下 tick 不再改变状态', () => {
    const t = reduce(awaitingState(), { type: 'TICK', now: T0 + 90 * MIN })
    expect(t.phase).toBe('awaiting')
  })
})

describe('SUBMIT / SKIP', () => {
  it('提交后上一段收尾、新段从提交时刻开始', () => {
    const t = reduce(awaitingState(), {
      type: 'SUBMIT',
      now: T0 + 50 * MIN,
      note: '写论文 #论文',
      progress: '完成两段初稿',
    })
    expect(t.phase).toBe('running')
    expect(t.session?.blocks).toHaveLength(2)
    expect(t.session?.blocks[0]?.endedAt).toBe(T0 + 50 * MIN)
    expect(t.session?.blocks[0]?.note).toBe('写论文 #论文')
    expect(t.session?.blocks[1]?.startedAt).toBe(T0 + 50 * MIN)
    expect(t.dueAt).toBe(T0 + 50 * MIN + 45 * MIN)
  })

  it('跳过时清空文本并标记 skipped', () => {
    const t = reduce(awaitingState(), { type: 'SKIP', now: T0 + 46 * MIN })
    expect(t.session?.blocks[0]?.skipped).toBe(true)
    expect(t.session?.blocks[0]?.note).toBe('')
    expect(t.phase).toBe('running')
  })
})

describe('PAUSE / RESUME', () => {
  it('running 暂停后 dueAt 冻结，继续时按暂停时长顺延', () => {
    const p = reduce(startedState(), { type: 'PAUSE', now: T0 + 20 * MIN })
    expect(p.phase).toBe('paused-running')
    expect(p.dueAt).toBeNull()
    const r = reduce(p, { type: 'RESUME', now: T0 + 30 * MIN })
    expect(r.phase).toBe('running')
    // 暂停不顺延到点：仍在原定时刻 T0+45min，恢复后一次 tick 即触发
    expect(r.dueAt).toBe(T0 + 45 * MIN)
  })

  it('暂停跨越原到点，恢复后一次 tick 即触发提醒', () => {
    const p = reduce(startedState(), { type: 'PAUSE', now: T0 + 20 * MIN })
    const r = reduce(p, { type: 'RESUME', now: T0 + 60 * MIN })
    expect(r.phase).toBe('running')
    const t = reduce(r, { type: 'TICK', now: T0 + 60 * MIN + 1 })
    expect(t.phase).toBe('awaiting')
  })

  it('awaiting 状态暂停再继续，仍在 awaiting', () => {
    const p = reduce(awaitingState(), { type: 'PAUSE', now: T0 + 50 * MIN })
    expect(p.phase).toBe('paused-awaiting')
    const r = reduce(p, { type: 'RESUME', now: T0 + 55 * MIN })
    expect(r.phase).toBe('awaiting')
  })
})

describe('END', () => {
  it('未收尾的当前 Block 以 END 时刻收尾', () => {
    const e = reduce(startedState(), { type: 'END', now: T0 + 100 * MIN })
    expect(e.phase).toBe('idle')
    expect(e.session?.endedAt).toBe(T0 + 100 * MIN)
    expect(e.session?.blocks[0]?.endedAt).toBe(T0 + 100 * MIN)
  })
})
