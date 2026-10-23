// 时刻区间工具：所有区间为 [start, end)，毫秒时间戳

export interface Interval {
  start: number
  end: number
}

// 两个区间交集，无交集返回 null
export function intersect(a: Interval, b: Interval): Interval | null {
  const start = Math.max(a.start, b.start)
  const end = Math.min(a.end, b.end)
  return start < end ? { start, end } : null
}

// 区间列表总时长
export function totalDuration(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + (i.end - i.start), 0)
}

// Block 的净工作时长：Block 区间与所有暂停区间的交集之和
export function netDuration(
  blockStart: number,
  blockEnd: number,
  pauses: Interval[]
): number {
  const block: Interval = { start: blockStart, end: blockEnd }
  return totalDuration(pauses.map((p) => intersect(block, p)).filter((i): i is Interval => i !== null))
}

// 毫秒 → "45:00" / "4:05:00"
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

// 毫秒 → "4 小时 33 分" / "38 分"
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} 分`
  if (minutes === 0) return `${hours} 小时`
  return `${hours} 小时 ${minutes} 分`
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function dateKey(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}
