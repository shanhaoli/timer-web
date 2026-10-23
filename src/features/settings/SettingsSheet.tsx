import { useEffect, useState } from 'react'
import './settings-sheet.css'

export interface Settings {
  intervalMinutes: number
}

const SETTINGS_KEY = 'timer-web/settings'
const DEFAULT_INTERVAL = 45

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw === null) return { intervalMinutes: DEFAULT_INTERVAL }
    const parsed = JSON.parse(raw) as Partial<Settings>
    if (
      typeof parsed.intervalMinutes === 'number' &&
      Number.isFinite(parsed.intervalMinutes) &&
      parsed.intervalMinutes >= 5 &&
      parsed.intervalMinutes <= 120
    ) {
      return { intervalMinutes: Math.round(parsed.intervalMinutes) }
    }
    return { intervalMinutes: DEFAULT_INTERVAL }
  } catch {
    return { intervalMinutes: DEFAULT_INTERVAL }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

const PRESET_INTERVALS = [15, 20, 30, 45, 60]

interface SettingsSheetProps {
  open: boolean
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
}

export function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  const [customInterval, setCustomInterval] = useState(String(settings.intervalMinutes))

  useEffect(() => {
    setCustomInterval(String(settings.intervalMinutes))
  }, [settings.intervalMinutes])

  useEffect(() => {
    if (open) saveSettings(settings)
  }, [open, settings])

  if (!open) return null

  const isPreset = PRESET_INTERVALS.includes(settings.intervalMinutes)

  const applyCustom = () => {
    const value = Number.parseInt(customInterval, 10)
    if (Number.isFinite(value) && value >= 5 && value <= 120) {
      onChange({ ...settings, intervalMinutes: value })
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-sheet"
        role="dialog"
        aria-label="设置"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="settings-title">设置</h2>
        <fieldset className="settings-group">
          <legend className="settings-label">默认提醒间隔</legend>
          <div className="settings-presets">
            {PRESET_INTERVALS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={
                  settings.intervalMinutes === minutes
                    ? 'settings-preset settings-preset-active'
                    : 'settings-preset'
                }
                onClick={() => onChange({ ...settings, intervalMinutes: minutes })}
              >
                {minutes}
              </button>
            ))}
            {!isPreset && (
              <button type="button" className="settings-preset settings-preset-active">
                {settings.intervalMinutes}
              </button>
            )}
          </div>
          <div className="settings-custom">
            <input
              type="number"
              min={5}
              max={120}
              value={customInterval}
              onChange={(event) => setCustomInterval(event.target.value)}
              onBlur={applyCustom}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyCustom()
              }}
              aria-label="自定义间隔（分钟）"
            />
            <span className="settings-unit">分钟（5–120）</span>
          </div>
        </fieldset>
        <button type="button" className="log-form-primary" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  )
}
