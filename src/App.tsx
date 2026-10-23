import { useCallback, useState } from 'react'
import type { Block, Session } from './features/timer/types'
import { TimerPage } from './features/timer/TimerPage'
import { ReviewPage } from './features/review/ReviewPage'
import { exportMarkdown } from './features/export/markdown'
import { loadRaw, saveRaw } from './lib/storage'
import { dateKey } from './lib/time'
import './app.css'

type Route = 'timer' | 'review'

interface AppData {
  sessions: Session[]
}

function loadAppData(): AppData {
  const raw = loadRaw()
  if (raw === null) return { sessions: [] }
  return { sessions: (raw.sessions as Session[]) ?? [] }
}

export default function App() {
  const [data, setData] = useState<AppData>(loadAppData)
  const [route, setRoute] = useState<Route>('timer')

  const persist = useCallback((next: AppData) => {
    saveRaw({
      schemaVersion: 1,
      sessions: next.sessions,
      settings: {},
    })
  }, [])

  const handleSessionEnd = useCallback(
    (session: Session) => {
      setData((prev) => {
        // 同一 Session 已存在则替换（例如二次 END）
        const others = prev.sessions.filter((s) => s.id !== session.id)
        const next = { sessions: [...others, session] }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const handleUpdateBlock = useCallback(
    (sessionId: string, blockId: string, note: string, progress: string) => {
      setData((prev) => {
        const sessions = prev.sessions.map((session): Session => {
          if (session.id !== sessionId) return session
          const blocks = session.blocks.map((block): Block =>
            block.id === blockId ? { ...block, note, progress } : block
          )
          return { ...session, blocks }
        })
        const next = { sessions }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const handleDeleteBlock = useCallback(
    (sessionId: string, blockId: string) => {
      setData((prev) => {
        const sessions = prev.sessions
          .map((session): Session => {
            if (session.id !== sessionId) return session
            return { ...session, blocks: session.blocks.filter((b) => b.id !== blockId) }
          })
          .filter((session) => session.blocks.length > 0)
        const next = { sessions }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const handleExport = useCallback(() => {
    const markdown = exportMarkdown(data.sessions)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `工作记录-${dateKey(Date.now())}.md`
    link.click()
    URL.revokeObjectURL(url)
  }, [data.sessions])

  return (
    <div className="app">
      <nav className="app-nav" aria-label="主导航">
        <button
          type="button"
          className={route === 'timer' ? 'app-nav-item app-nav-active' : 'app-nav-item'}
          onClick={() => setRoute('timer')}
        >
          计时
        </button>
        <button
          type="button"
          className={route === 'review' ? 'app-nav-item app-nav-active' : 'app-nav-item'}
          onClick={() => setRoute('review')}
        >
          回顾
        </button>
        <button
          type="button"
          className="app-nav-item"
          onClick={handleExport}
          disabled={data.sessions.length === 0}
        >
          导出
        </button>
      </nav>

      <div className="app-content">
        {route === 'timer' ? (
          <TimerPage onSessionEnd={handleSessionEnd} />
        ) : (
          <ReviewPage
            sessions={data.sessions}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
          />
        )}
      </div>
    </div>
  )
}
