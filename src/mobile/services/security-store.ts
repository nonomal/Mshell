export interface SecuritySettings {
  enabled: boolean
  pinEnabled: boolean
  biometricEnabled: boolean
  preferBiometric: boolean
  lockOnStart: boolean
  lockOnResume: boolean
  pinSalt?: string
  pinHash?: string
  updatedAt?: string
}

const STORAGE_KEY = 'mshell-mobile-security-v1'
const PBKDF2_ITERATIONS = 180000
const PIN_MIN_LENGTH = 4

const defaultSettings = (): SecuritySettings => ({
  enabled: false,
  pinEnabled: false,
  biometricEnabled: false,
  preferBiometric: true,
  lockOnStart: true,
  lockOnResume: true
})

export class SecurityStore {
  private settings: SecuritySettings = defaultSettings()
  private listeners = new Set<(settings: SecuritySettings) => void>()

  load(): SecuritySettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return this.getSettings()
      }

      this.settings = {
        ...defaultSettings(),
        ...JSON.parse(raw)
      }
      this.normalizeEnabledState()
      return this.getSettings()
    } catch (error) {
      console.error('[SecurityStore] Failed to load settings', error)
      this.settings = defaultSettings()
      return this.getSettings()
    }
  }

  subscribe(listener: (settings: SecuritySettings) => void): () => void {
    this.listeners.add(listener)
    listener(this.getSettings())
    return () => this.listeners.delete(listener)
  }

  getSettings(): SecuritySettings {
    return { ...this.settings }
  }

  isLockRequired(): boolean {
    return this.settings.enabled && (this.settings.pinEnabled || this.settings.biometricEnabled)
  }

  async setPin(pin: string): Promise<SecuritySettings> {
    const normalizedPin = pin.trim()
    if (!/^\d+$/.test(normalizedPin) || normalizedPin.length < PIN_MIN_LENGTH) {
      throw new Error('PIN 至少需要 4 位数字')
    }

    const salt = randomBytes(16)
    const hash = await hashPin(normalizedPin, salt)
    this.settings = {
      ...this.settings,
      enabled: true,
      pinEnabled: true,
      pinSalt: bytesToBase64(salt),
      pinHash: bytesToBase64(hash),
      lockOnStart: true,
      updatedAt: new Date().toISOString()
    }
    this.save()
    return this.getSettings()
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (!this.settings.pinEnabled || !this.settings.pinSalt || !this.settings.pinHash) {
      return false
    }

    const actual = await hashPin(pin.trim(), base64ToBytes(this.settings.pinSalt))
    return constantTimeEqual(actual, base64ToBytes(this.settings.pinHash))
  }

  update(updates: Partial<SecuritySettings>): SecuritySettings {
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.normalizeEnabledState()
    this.save()
    return this.getSettings()
  }

  disableAll(): SecuritySettings {
    this.settings = defaultSettings()
    this.save()
    return this.getSettings()
  }

  private normalizeEnabledState(): void {
    if (!this.settings.pinEnabled) {
      this.settings.pinSalt = undefined
      this.settings.pinHash = undefined
    }
    this.settings.enabled = Boolean(
      this.settings.enabled && (this.settings.pinEnabled || this.settings.biometricEnabled)
    )
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    this.emit()
  }

  private emit(): void {
    const settings = this.getSettings()
    this.listeners.forEach((listener) => listener(settings))
  }
}

const hashPin = async (pin: string, salt: Uint8Array): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    256
  )
  return new Uint8Array(bits)
}

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

const constantTimeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const base64ToBytes = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

export const securityStore = new SecurityStore()
