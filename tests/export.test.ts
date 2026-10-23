import { describe, expect, it } from 'vitest'
import { exportMarkdown } from '../src/features/export/markdown'
import type { Session } from '../src/features/timer/types'

const T0 = new Date('2026-10-22T14:00:00').getTime()
const MIN = 60_000

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    startedAt: T0,
    endedAt: T0 + 90 * MIN,
    plannedMinutes: 360,
    intervalMinutes: 45,
    blocks: [
      {
        id: 'b1',
        startedAt: T0,
        endedAt: T0 + 45 * MIN,
        note: '写论文引言 #论文',
        progress: '完成两段初稿',
        skipped: false,
      },
      {
        id: 'b2',
        startedAt: T0 + 45 * MIN,
        endedAt: T0 + 90 * MIN,
        note: '',
        progress: '',
        skipped: true,
      },
    ],
    pauses: [],
    ...overrides,
  }
}

describe('exportMarkdown', () => {
  it('按天分组并包含时间、内容、进展', () => {
    const md = exportMarkdown([makeSession()])
    expect(md).toContain('# 工作记录')
    expect(md).toContain('## 2026-10-22')
    expect(md).toContain('14:00 – 15:30')
    expect(md).toContain('写论文引言 #论文')
    expect(md).toContain('进展：完成两段初稿')
    expect(md).toContain('（跳过）')
  })

  it('跳过段不输出内容', () => {
    const md = exportMarkdown([makeSession()])
    const skipLine = md.split('\n').find((line) => line.includes('15:45') || line.includes('（跳过）'))
    expect(skipLine).toBeDefined()
  })

  it('不同日期的 Session 分到不同小节', () => {
    const day2 = makeSession({
      id: 's2',
      startedAt: T0 + 24 * 60 * MIN,
      endedAt: T0 + 24 * 60 * MIN + 45 * MIN,
      blocks: [
        {
          id: 'b3',
          startedAt: T0 + 24 * 60 * MIN,
          endedAt: T0 + 24 * 60 * MIN + 45 * MIN,
          note: '改稿 #论文',
          progress: '',
          skipped: false,
        },
      ],
    })
    const md = exportMarkdown([makeSession(), day2])
    expect(md).toContain('## 2026-10-22')
    expect(md).toContain('## 2026-10-23')
    expect(md.indexOf('2026-10-22')).toBeLessThan(md.indexOf('2026-10-23'))
  })

  it('空 Session 列表只输出标题', () => {
    expect(exportMarkdown([])).toBe('# 工作记录')
  })
})
