// Notification 封装：授权、发送、点击聚焦

export function notificationSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showNotification(title: string, body: string): void {
  if (!notificationSupported() || Notification.permission !== 'granted') return
  const notification = new Notification(title, {
    body,
    // tag 去重：同 tag 新通知替换旧通知，避免堆叠
    tag: 'timer-web',
  })
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}
