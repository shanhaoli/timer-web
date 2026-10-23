import { useEffect, useState } from 'react'
import { useTimer } from './useTimer'
import { formatCountdown, formatDuration, netDuration } from '../../lib/time'
import { LogForm } from '../log/LogForm'
import { SettingsSheet, loadSettings } from '../settings/SettingsSheet'
import type { Session } from './types'
import './timer-page.css'

interface TimerPageProps {
  onSessionEnd: (session: Session) => void
}

const DEFAULT_PLANNED_MINUTES = 300

export function TimerPage({ onSessionEnd }: TimerPageProps) {
  const timer = useTimer(onSessionEnd)
  const { state } = timer
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const [now, setNow] = useState(Date.now())

  // 每秒 tick：驱动标题与倒计时显示
  useEffect(() => {
    const tickTimer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickTimer)
  }, [])

  const currentBlockIndex = state.session ? state.session.blocks.length : 0

  // 标签页标题联动剩余时间，切走 tab 也能瞄到
  useEffect(() => {
    if (state.phase === 'running' && state.dueAt !== null) {
      const remaining = Math.max(0, state.dueAt - now)
      document.title = `${formatCountdown(remaining)} · 第 ${currentBlockIndex} 段`
    } else {
      document.title = '工时块'
    }
  }, [state.phase, state.dueAt, now, currentBlockIndex])

  return (
    <div className="timer-page">
      <header className="timer-header">
        <span className="timer-brand">工时块</span>
        <div className="timer-header-actions">
          <button
            type="button"
            className="timer-text-button"
            onClick={() => setSettingsOpen(true)}
          >
            设置
          </button>
        </div>
      </header>

      <main className="timer-main">
        {state.phase === 'idle' && <IdleView onStart={timer.start} settings={settings} />}
        {state.phase === 'running' && (
          <RunningView
            remaining={
              state.dueAt === null ? 0 : Math.max(0, state.dueAt - now)
            }
            blockIndex={currentBlockIndex}
            onPause={timer.pause}
            onEnd={timer.end}
          />
        )}
        {state.phase === 'awaiting' && (
          <AwaitingView
            blockIndex={currentBlockIndex}
            onSubmit={timer.submit}
            onSkip={timer.skip}
            onPause={timer.pause}
            onEnd={timer.end}
          />
        )}
        {(state.phase === 'paused-running' || state.phase === 'paused-awaiting') && (
          <PausedView
            wasAwaiting={state.phase === 'paused-awaiting'}
            onResume={timer.resume}
            onEnd={timer.end}
          />
        )}
      </main>

      {timer.justEnded && (
        <SessionSummary
          session={timer.justEnded}
          onClose={timer.clearJustEnded}
        />
      )}

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

function IdleView({
  onStart,
  settings,
}: {
  onStart: (plannedMinutes: number, intervalMinutes: number) => void
  settings: ReturnType<typeof loadSettings>
}) {
  const [plannedHours, setPlannedHours] = useState(Math.round(DEFAULT_PLANNED_MINUTES / 60))
  const [intervalMinutes, setIntervalMinutes] = useState(settings.intervalMinutes)

  const begin = () => {
    onStart(plannedHours * 60, intervalMinutes)
  }

  return (
    <section className="idle-view" aria-label="开始工作时段">
      <h1 className="idle-title">开始一段工作</h1>
      <div className="idle-config">
        <label className="idle-config-item">
          <span className="idle-config-label">计划时长</span>
          <div className="idle-stepper">
            <button type="button" onClick={() => setPlannedHours((h) => Math.max(1, h - 1))} aria-label="减少计划时长">−</button>
            <span className="idle-config-value">{plannedHours} 小时</span>
            <button type="button" onClick={() => setPlannedHours((h) => Math.min(12, h + 1))} aria-label="增加计划时长">＋</button>
          </div>
        </label>
        <label className="idle-config-item">
          <span className="idle-config-label">提醒间隔</span>
          <div className="idle-stepper">
            <button type="button" onClick={() => setIntervalMinutes((v) => Math.max(10, v - 5))} aria-label="减少提醒间隔">−</button>
            <span className="idle-config-value">{intervalMinutes} 分钟</span>
            <button type="button" onClick={() => setIntervalMinutes((v) => Math.min(90, v + 5))} aria-label="增加提醒间隔">＋</button>
          </div>
        </label>
      </div>
      <button type="button" className="idle-start" onClick={begin}>
        开始
      </button>
    </section>
  )
}

function RunningView({
  remaining,
  blockIndex,
  onPause,
  onEnd,
}: {
  remaining: number
  blockIndex: number
  onPause: () => void
  onEnd: () => void
}) {
  return (
    <section className="running-view" aria-label="工作中">
      <p className="running-label">第 {blockIndex} 段 · 剩余</p>
      <p className="running-countdown" role="timer">{formatCountdown(remaining)}</p>
      <div className="running-actions">
        <button type="button" className="timer-text-button" onClick={onPause}>
          暂停
        </button>
        <button type="button" className="timer-text-button timer-danger" onClick={onEnd}>
          结束时段
        </button>
      </div>
    </section>
  )
}

function AwaitingView({
  blockIndex,
  onSubmit,
  onSkip,
  onPause,
  onEnd,
}: {
  blockIndex: number
  onSubmit: (note: string, progress: string) => void
  onSkip: () => void
  onPause: () => void
  onEnd: () => void
}) {
  return (
    <section className="awaiting-view" aria-label="待记录">
      <LogForm blockIndex={blockIndex} onSubmit={onSubmit} onSkip={onSkip} />
      <div className="running-actions">
        <button type="button" className="timer-text-button" onClick={onPause}>
          暂停
        </button>
        <button type="button" className="timer-text-button timer-danger" onClick={onEnd}>
          结束时段
        </button>
      </div>
    </section>
  )
}

function PausedView({
  wasAwaiting,
  onResume,
  onEnd,
}: {
  wasAwaiting: boolean
  onResume: () => void
  onEnd: () => void
}) {
  const [pausedSince] = useState(Date.now())
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const pausedFor = now - pausedSince

  return (
    <section className="paused-view" aria-label="已暂停">
      <p className="paused-label">{wasAwaiting ? '暂停中（上一段待记录）' : '暂停中'}</p>
      <p className="paused-duration" role="timer">{formatCountdown(pausedFor)}</p>
      <div className="running-actions">
        <button type="button" className="timer-text-button" onClick={onResume}>
          继续
        </button>
        <button type="button" className="timer-text-button timer-danger" onClick={onEnd}>
          结束时段
        </button>
      </div>
    </section>
  )
}

function SessionSummary({ session, onClose }: { session: Session; onClose: () => void }) {
  const blocks = session.blocks
  const recorded = blocks.filter((b) => !b.skipped)
  const totalMs = session.pauses.length > 0 || blocks.length > 0
    ? netSessionDuration(session)
    : 0

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div
        className="summary-card"
        role="dialog"
        aria-label="本次时段小结"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="summary-title">本次时段</h2>
        <p className="summary-total">{formatDuration(totalMs)} · {blocks.length} 段</p>
        <ol className="summary-list">
          {blocks.map((block, index) => (
            <li key={block.id} className="summary-item">
              <span className="summary-item-index">{index + 1}</span>
              <span className="summary-item-body">
                {block.skipped ? (
                  <span className="summary-item-skipped">（跳过）</span>
                ) : (
                  <>
                    <span className="summary-item-note">{block.note || '（未填写）'}</span>
                    {block.progress && (
                      <span className="summary-item-progress">{block.progress}</span>
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
        {recorded.length === 0 && (
          <p className="summary-empty">这一时段没有留下记录</p>
        )}
        <button type="button" className="log-form-primary" onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  )
}

// Session 净时长：所有 Block 净时之和（扣除暂停）
function netSessionDuration(session: Session): number {
  const pauseIntervals = session.pauses
    .filter((p): p is { startedAt: number; endedAt: number } => p.endedAt !== null)
    .map((p) => ({ start: p.startedAt, end: p.endedAt }))
  return session.blocks.reduce((sum, b) => {
    if (b.endedAt === null) return sum
    return sum + netDuration(b.startedAt, b.endedAt, pauseIntervals)
  }, 0)
}
