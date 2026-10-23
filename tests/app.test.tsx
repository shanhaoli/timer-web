import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'

// jsdom 无 AudioContext，stub 之
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

// 可构造的 Notification stub
class FakeNotification {
  static permission: NotificationPermission = 'granted'
  onclick: (() => void) | null = null
  constructor(
    public title: string,
    public options?: NotificationOptions
  ) {}
  close() {}
}

vi.stubGlobal('AudioContext', FakeAudioContext)
vi.stubGlobal('Notification', FakeNotification)

// 固定 Date.now：T0 取真实当天 14:00（回顾页「今天」用未 mock 的 new Date() 计算，
// 两者必须落在同一天），用 advanceDateNow 推进
const T0 = (() => {
  const d = new Date()
  d.setHours(14, 0, 0, 0)
  return d.getTime()
})()
let currentNow = T0
const advanceDateNow = (ms: number) => {
  currentNow += ms
}

beforeEach(() => {
  localStorage.clear()
  currentNow = T0
  vi.spyOn(Date, 'now').mockImplementation(() => currentNow)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// 通过 visibilitychange 驱动一次 tick（应用处理休眠唤醒的真实路径）
function fireVisible() {
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('完整流程', () => {
  it('开始 → 到点提醒 → 记录 → 提交 → 结束 → 回顾可见', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('开始一段工作')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '开始' }))

    // running：显示倒计时
    expect(screen.getByText('第 1 段 · 剩余')).toBeInTheDocument()

    // 推进 45 分钟到点，触发 tick
    advanceDateNow(45 * 60_000)
    fireVisible()
    expect(await screen.findByText('第 1 段结束 · 记录一下')).toBeInTheDocument()

    // 填写记录并提交（宽限 5 分钟后回来）
    advanceDateNow(5 * 60_000)
    await user.type(screen.getByPlaceholderText(/写论文引言/), '写论文引言 #论文')
    await user.type(screen.getByPlaceholderText(/完成两段初稿/), '完成两段初稿')
    await user.click(screen.getByRole('button', { name: '开始下一段' }))

    // 回到 running，第 2 段
    expect(screen.getByText('第 2 段 · 剩余')).toBeInTheDocument()

    // 直接结束时段
    advanceDateNow(10 * 60_000)
    fireVisible()
    await user.click(await screen.findByRole('button', { name: '结束时段' }))

    // 结束小结弹出
    expect(await screen.findByText('本次时段')).toBeInTheDocument()
    expect(screen.getByText('写论文引言 #论文')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '知道了' }))

    // 回顾页可见记录
    await user.click(screen.getByRole('button', { name: '回顾' }))
    expect(screen.queryByText('这一天没有工作记录')).not.toBeInTheDocument()
    expect(screen.getAllByText(/写论文引言/).length).toBeGreaterThan(0)
    // 时间线与标签统计中都有 #论文
    expect(screen.getAllByText('#论文').length).toBeGreaterThan(0)
  })

  it('跳过此段后回顾页显示（跳过）', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始' }))

    advanceDateNow(45 * 60_000)
    fireVisible()
    await user.click(await screen.findByRole('button', { name: '跳过此段' }))

    advanceDateNow(60_000)
    fireVisible()
    await user.click(await screen.findByRole('button', { name: '结束时段' }))
    await user.click(await screen.findByRole('button', { name: '知道了' }))

    await user.click(screen.getByRole('button', { name: '回顾' }))
    expect(screen.getByText('（跳过）')).toBeInTheDocument()
  })

  it('暂停后继续，到点提醒不被跳过', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '开始' }))

    // 工作 20 分钟后暂停 30 分钟（跨越原定 45 分钟到点）
    advanceDateNow(20 * 60_000)
    await user.click(screen.getByRole('button', { name: '暂停' }))
    expect(screen.getByText('暂停中')).toBeInTheDocument()

    advanceDateNow(30 * 60_000)
    await user.click(screen.getByRole('button', { name: '继续' }))

    // 恢复后一次 tick 即触发提醒
    fireVisible()
    expect(await screen.findByText('第 1 段结束 · 记录一下')).toBeInTheDocument()
  })
})
