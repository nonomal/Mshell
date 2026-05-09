export type TerminalInputMode = 'command-box' | 'direct-terminal'

export interface MobileAppSettings {
  terminalInputMode: TerminalInputMode
}

const STORAGE_KEY = 'mshell-mobile-app-settings-v1'

const defaultSettings = (): MobileAppSettings => ({
  terminalInputMode: 'command-box'
})

const normalizeSettings = (value: Partial<MobileAppSettings> | undefined): MobileAppSettings => ({
  terminalInputMode:
    value?.terminalInputMode === 'direct-terminal' ? 'direct-terminal' : 'command-box'
})

export class AppSettingsStore {
  private settings: MobileAppSettings = defaultSettings()
  private listeners = new Set<(settings: MobileAppSettings) => void>()

  load(): MobileAppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      this.settings = raw ? normalizeSettings(JSON.parse(raw)) : defaultSettings()
    } catch (error) {
      console.error('[AppSettingsStore] Failed to load settings', error)
      this.settings = defaultSettings()
    }
    return this.getSettings()
  }

  subscribe(listener: (settings: MobileAppSettings) => void): () => void {
    this.listeners.add(listener)
    listener(this.getSettings())
    return () => this.listeners.delete(listener)
  }

  getSettings(): MobileAppSettings {
    return { ...this.settings }
  }

  update(updates: Partial<MobileAppSettings>): MobileAppSettings {
    this.settings = normalizeSettings({ ...this.settings, ...updates })
    this.save()
    return this.getSettings()
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    const settings = this.getSettings()
    this.listeners.forEach((listener) => listener(settings))
  }
}

export const appSettingsStore = new AppSettingsStore()
