import type { Block, Session } from '../timer/types'
import { netDuration } from '../../lib/time'
import { extractTags } from '../log/tags'

export interface TagTotal {
  tag: string
  durationMs: number
}

// 所选日期内各标签的累计净时长；无标签的段计入「未分类」
const UNTAGGED = '未分类'

export function tagTotals(sessions: Session[]): TagTotal[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    const pauseIntervals = session.pauses
      .filter((p): p is { startedAt: number; endedAt: number } => p.endedAt !== null)
      .map((p) => ({ start: p.startedAt, end: p.endedAt }))
    for (const block of session.blocks) {
      if (block.endedAt === null || block.skipped) continue
      const duration = netDuration(block.startedAt, block.endedAt, pauseIntervals)
      const tags = [
        ...extractTags(block.note),
        ...extractTags(block.progress),
      ]
      if (tags.length === 0) {
        totals.set(UNTAGGED, (totals.get(UNTAGGED) ?? 0) + duration)
      } else {
        for (const tag of tags) {
          totals.set(tag, (totals.get(tag) ?? 0) + duration)
        }
      }
    }
  }
  return [...totals.entries()]
    .map(([tag, durationMs]) => ({ tag, durationMs }))
    .sort((a, b) => b.durationMs - a.durationMs)
}

export { UNTAGGED }

export type { Block }
