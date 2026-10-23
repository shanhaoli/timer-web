import { useMemo, useState } from 'react'
import type { Block, Session } from '../timer/types'
import { dateKey, formatClock, formatDateLabel, formatDuration, netDuration } from '../../lib/time'
import { segmentText } from '../log/tags'
import { tagTotals, UNTAGGED } from './tagSummary'
import './review-page.css'

interface ReviewPageProps {
  sessions: Session[]
  onUpdateBlock: (sessionId: string, blockId: string, note: string, progress: string) => void
  onDeleteBlock: (sessionId: string, blockId: string) => void
}

function dayOffsetTimestamp(offsetDays: number): number {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return d.getTime()
}

export function ReviewPage({ sessions, onUpdateBlock, onDeleteBlock }: ReviewPageProps) {
  const [offset, setOffset] = useState(0)
  const dayStart = dayOffsetTimestamp(offset)
  const selectedKey = dateKey(dayStart)

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKey(s.startedAt) === selectedKey)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, selectedKey]
  )

  const totals = useMemo(() => tagTotals(daySessions), [daySessions])

  return (
    <div className="review-page">
      <header className="review-header">
        <button
          type="button"
          className="timer-text-button"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="前一天"
        >
          ← 前一天
        </button>
        <h2 className="review-date">{formatDateLabel(dayStart)}</h2>
        <button
          type="button"
          className="timer-text-button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset >= 0}
          aria-label="后一天"
        >
          后一天 →
        </button>
      </header>

      {daySessions.length === 0 ? (
        <p className="review-empty">这一天没有工作记录</p>
      ) : (
        <>
          {daySessions.map((session) => (
            <SessionTimeline
              key={session.id}
              session={session}
              onUpdateBlock={onUpdateBlock}
              onDeleteBlock={onDeleteBlock}
            />
          ))}
          <section className="review-tags" aria-label="标签统计">
            <h3 className="review-section-title">标签时长</h3>
            <ul className="review-tag-list">
              {totals.map(({ tag, durationMs }) => (
                <li key={tag} className="review-tag-item">
                  <span className={tag === UNTAGGED ? 'review-tag review-tag-plain' : 'review-tag'}>
                    {tag === UNTAGGED ? tag : `#${tag}`}
                  </span>
                  <span className="review-tag-duration">{formatDuration(durationMs)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function SessionTimeline({
  session,
  onUpdateBlock,
  onDeleteBlock,
}: {
  session: Session
  onUpdateBlock: ReviewPageProps['onUpdateBlock']
  onDeleteBlock: ReviewPageProps['onDeleteBlock']
}) {
  const pauseIntervals = session.pauses
    .filter((p): p is { startedAt: number; endedAt: number } => p.endedAt !== null)
    .map((p) => ({ start: p.startedAt, end: p.endedAt }))

  return (
    <section className="review-session" aria-label="工作时段">
      <h3 className="review-session-title">
        {formatClock(session.startedAt)} – {formatClock(session.endedAt ?? session.startedAt)}
      </h3>
      <ol className="review-blocks">
        {session.blocks.map((block) => (
          <BlockRow
            key={block.id}
            block={block}
            pauseIntervals={pauseIntervals}
            onUpdateBlock={(note, progress) => onUpdateBlock(session.id, block.id, note, progress)}
            onDelete={() => onDeleteBlock(session.id, block.id)}
          />
        ))}
      </ol>
    </section>
  )
}

function BlockRow({
  block,
  pauseIntervals,
  onUpdateBlock,
  onDelete,
}: {
  block: Block
  pauseIntervals: { start: number; end: number }[]
  onUpdateBlock: (note: string, progress: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(block.note)
  const [progress, setProgress] = useState(block.progress)
  const range = `${formatClock(block.startedAt)}–${formatClock(block.endedAt ?? block.startedAt)}`
  const net =
    block.endedAt === null ? 0 : netDuration(block.startedAt, block.endedAt, pauseIntervals)

  const startEdit = () => {
    setNote(block.note)
    setProgress(block.progress)
    setEditing(true)
  }

  const commit = () => {
    onUpdateBlock(note.trim(), progress.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="review-block review-block-editing">
        <label className="review-edit-field">
          <span className="review-edit-label">在做什么</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        <label className="review-edit-field">
          <span className="review-edit-label">进展</span>
          <textarea value={progress} onChange={(e) => setProgress(e.target.value)} rows={2} />
        </label>
        <div className="review-edit-actions">
          <button type="button" className="review-small-button review-small-primary" onClick={commit}>
            保存
          </button>
          <button type="button" className="review-small-button" onClick={() => setEditing(false)}>
            取消
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className="review-block">
      <span className="review-block-time">{range}</span>
      <span className="review-block-content">
        {block.skipped ? (
          <span className="review-block-skipped">（跳过）</span>
        ) : (
          <>
            <span className="review-block-note">
              {segmentText(block.note || '（未填写）').map((seg, i) =>
                seg.tag ? (
                  <mark key={i} className="review-tag">{seg.text}</mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </span>
            {block.progress && (
              <span className="review-block-progress">{block.progress}</span>
            )}
          </>
        )}
      </span>
      <span className="review-block-meta">
        <span className="review-block-duration">{formatDuration(net)}</span>
        {!block.skipped && (
          <>
            <button type="button" className="review-small-button" onClick={startEdit}>
              编辑
            </button>
            <button
              type="button"
              className="review-small-button review-small-danger"
              onClick={onDelete}
            >
              删除
            </button>
          </>
        )}
      </span>
    </li>
  )
}
