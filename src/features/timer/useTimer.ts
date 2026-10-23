import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { initialState, reduce } from './machine'
import type { TimerAction } from './machine'
import type { Session, TimerState } from './types'
import { primeAudio, startChime } from '../alert/chime'
import type { ChimeHandle } from '../alert/chime'
import { requestPermission, showNotification } from '../alert/notify'

const TICK_MS = 1000

export function useTimer(onSessionEnd: (session: Session) => void) {
  const [state, dispatch] = useReducer(
    (s: TimerState, a: TimerAction) => reduce(s, a),
    undefined,
    initialState
  )
  const [justEnded, setJustEnded] = useState<Session | null>(null)
  const chimeRef = useRef<ChimeHandle | null>(null)
  const awaitingRef = useRef(false)

  const stopChime = useCallback(() => {
    chimeRef.current?.stop()
    chimeRef.current = null
  }, [])

  // 每秒 tick：驱动倒计时与到点判定
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() })
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [])

  // visibilitychange：后台标签页或休眠唤醒后立即重算
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        dispatch({ type: 'TICK', now: Date.now() })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // 进入 awaiting：响铃 + 通知
  useEffect(() => {
    if (state.phase === 'awaiting' && !awaitingRef.current) {
      awaitingRef.current = true
      chimeRef.current = startChime()
      showNotification('该起身活动了', '活动几分钟，回来记录一下这段的工作')
    } else if (state.phase !== 'awaiting' && awaitingRef.current) {
      awaitingRef.current = false
      stopChime()
    }
  }, [state.phase, stopChime])

  // 卸载时停止铃声
  useEffect(() => stopChime, [stopChime])

  const start = useCallback(
    (plannedMinutes: number, intervalMinutes: number) => {
      void requestPermission()
      primeAudio()
      dispatch({ type: 'START', now: Date.now(), plannedMinutes, intervalMinutes })
    },
    []
  )

  const submit = useCallback((note: string, progress: string) => {
    dispatch({ type: 'SUBMIT', now: Date.now(), note, progress })
  }, [])

  const skip = useCallback(() => {
    dispatch({ type: 'SKIP', now: Date.now() })
  }, [])

  const pause = useCallback(() => {
    dispatch({ type: 'PAUSE', now: Date.now() })
  }, [])

  const resume = useCallback(() => {
    dispatch({ type: 'RESUME', now: Date.now() })
  }, [])

  const end = useCallback(() => {
    dispatch({ type: 'END', now: Date.now() })
  }, [])

  // 时段结束时上报 App 层持久化，并发系统通知
  const endedSessionRef = useRef<Session | null>(null)
  useEffect(() => {
    if (
      state.phase === 'idle' &&
      state.session !== null &&
      state.session.id !== endedSessionRef.current?.id
    ) {
      endedSessionRef.current = state.session
      onSessionEnd(state.session)
      setJustEnded(state.session)
      showNotification('时段已结束', `本次共 ${state.session.blocks.length} 段，点击回来看小结`)
    }
  }, [state.phase, state.session, onSessionEnd])

  return {
    state,
    justEnded,
    clearJustEnded: () => setJustEnded(null),
    start,
    submit,
    skip,
    pause,
    resume,
    end,
  }
}
