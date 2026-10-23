import { afterEach, describe, expect, it, vi } from 'vitest'

// 用假定时器与 stub 的 AudioContext 验证响铃节奏逻辑

class FakeAudioContext {
  currentTime = 0
  destination = {}
  state: AudioContextState = 'running'

  createOscillator() {
    const node = {
      type: '',
      frequency: { value: 0 },
      connect: () => node,
      start: () => {},
      stop: () => {},
    }
    return node
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => ({}),
    }
  }

  resume() {
    return Promise.resolve()
  }
}

vi.stubGlobal('AudioContext', FakeAudioContext)

afterEach(() => {
  vi.useRealTimers()
})

describe('startChime', () => {
  it('立即响一轮，之后 8 秒一次最多 3 轮', async () => {
    const { startChime } = await import('../src/features/alert/chime')
    vi.useFakeTimers()
    const spy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator')
    const handle = startChime()
    expect(spy).toHaveBeenCalledTimes(3) // 第一轮三音

    vi.advanceTimersByTime(8000)
    expect(spy).toHaveBeenCalledTimes(6)
    vi.advanceTimersByTime(8000)
    expect(spy).toHaveBeenCalledTimes(9)
    // 第三轮后不再响
    vi.advanceTimersByTime(8000)
    expect(spy).toHaveBeenCalledTimes(9)
    handle.stop()
  })

  it('stop 后不再继续响', async () => {
    const { startChime } = await import('../src/features/alert/chime')
    vi.useFakeTimers()
    const spy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator')
    const handle = startChime()
    handle.stop()
    vi.advanceTimersByTime(20_000)
    expect(spy).toHaveBeenCalledTimes(3)
  })
})
