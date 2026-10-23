// Web Audio 合成三音上行铃声，无音频资源文件

let ctx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (ctx === null) {
    ctx = new AudioContext()
  }
  // 用户手势后可能被浏览器 suspend，唤醒它
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

// 在用户点击「开始」时调用，满足自动播放限制并预热 AudioContext
export function primeAudio(): void {
  getAudioContext()
}

function playTone(at: AudioContext, startOffset: number, frequency: number): void {
  const osc = at.createOscillator()
  const gain = at.createGain()
  const start = at.currentTime + startOffset
  osc.type = 'sine'
  osc.frequency.value = frequency
  // 快速起音、短促衰减，得到清脆的铃声感
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9)
  osc.connect(gain).connect(at.destination)
  osc.start(start)
  osc.stop(start + 1)
}

// 一轮铃声：E5 → G5 → C6 上行三音
function playRound(): void {
  const at = getAudioContext()
  playTone(at, 0, 659.25)
  playTone(at, 0.18, 783.99)
  playTone(at, 0.36, 1046.5)
}

export interface ChimeHandle {
  stop: () => void
}

// 响铃：立即 1 轮，之后每 8 秒重复，最多 3 轮
export function startChime(): ChimeHandle {
  playRound()
  let round = 1
  const timer = setInterval(() => {
    if (round >= 3) {
      clearInterval(timer)
      return
    }
    round += 1
    playRound()
  }, 8000)
  return {
    stop: () => {
      clearInterval(timer)
    },
  }
}
