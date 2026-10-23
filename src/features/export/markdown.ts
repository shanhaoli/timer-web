import type { Block, Session } from '../timer/types'
import { netDuration, formatClock, dateKey, formatDuration } from '../../lib/time'

function blockLine(block: Block, pauseIntervals: { start: number; end: number }[]): string {
  const range = `${formatClock(block.startedAt)}–${formatClock(block.endedAt ?? block.startedAt)}`
  if (block.skipped) {
    return `- **${range}**（跳过）`
  }
  const net = block.endedAt === null ? 0 : netDuration(block.startedAt, block.endedAt, pauseIntervals)
  const head =
    net > 0
      ? `- **${range}**（${formatDuration(net)}）${block.note || '（未填写）'}`
      : `- **${range}** ${block.note || '（未填写）'}`
  if (block.progress) {
    return `${head}\n  进展：${block.progress}`
  }
  return head
}

function sessionSection(session: Session): string {
  const pauseIntervals = session.pauses
    .filter((p): p is { startedAt: number; endedAt: number } => p.endedAt !== null)
    .map((p) => ({ start: p.startedAt, end: p.endedAt }))
  const lines = [
    `## ${formatClock(session.startedAt)} – ${formatClock(session.endedAt ?? session.startedAt)}`,
    '',
    ...session.blocks.map((block) => blockLine(block, pauseIntervals)),
  ]
  return lines.join('\n')
}

export function exportMarkdown(sessions: Session[]): string {
  const byDay = new Map<string, Session[]>()
  for (const session of sessions) {
    const key = dateKey(session.startedAt)
    const list = byDay.get(key) ?? []
    byDay.set(key, [...list, session])
  }
  const sections: string[] = ['# 工作记录']
  for (const [key, daySessions] of byDay) {
    sections.push('')
    sections.push(`## ${key}`)
    sections.push('')
    for (const session of daySessions) {
      sections.push(sessionSection(session))
      sections.push('')
    }
  }
  return sections.join('\n')
}
