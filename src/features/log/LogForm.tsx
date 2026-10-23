import { useEffect, useRef, useState } from 'react'
import './log-form.css'

interface LogFormProps {
  onSubmit: (note: string, progress: string) => void
  onSkip: () => void
  blockIndex: number
}

// awaiting 状态的记录框：在做什么 / 进展，可跳过
export function LogForm({ onSubmit, onSkip, blockIndex }: LogFormProps) {
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    noteRef.current?.focus()
  }, [])

  const submit = () => {
    onSubmit(note.trim(), progress.trim())
  }

  // Enter 提交，Shift+Enter 换行
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form
      className="log-form"
      aria-label="记录本段工作"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <p className="log-form-heading">第 {blockIndex} 段结束 · 记录一下</p>
      <label className="log-form-field">
        <span className="log-form-label">这段在做什么</span>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="例如：写论文引言 #论文"
          autoFocus
        />
      </label>
      <label className="log-form-field">
        <span className="log-form-label">进展如何</span>
        <textarea
          value={progress}
          onChange={(event) => setProgress(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="例如：完成两段初稿"
        />
      </label>
      <div className="log-form-actions">
        <button type="submit" className="log-form-primary">
          开始下一段
        </button>
        <button type="button" className="log-form-skip" onClick={onSkip}>
          跳过此段
        </button>
      </div>
    </form>
  )
}
