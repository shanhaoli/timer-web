// localStorage 持久化：单 key JSON，带 schema 版本号

const STORAGE_KEY = 'timer-web/v1'
const SCHEMA_VERSION = 1

export interface StoredData {
  schemaVersion: number
  sessions: unknown[]
  settings: unknown
}

export function loadRaw(): StoredData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as StoredData
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function saveRaw(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
