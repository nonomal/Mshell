import type { SessionConfig, SessionGroup } from '@/types/session'
import type {
  MobileBackupData,
  MobileQuickCommand,
  MobileSyncConfig,
  MobileSnippet,
  MobileSSHKey,
  MobileStoreState
} from '../types'

const STORAGE_KEY = 'mshell-mobile-state-v1'
const MOBILE_BACKUP_VERSION = '0.2.0'
const QUICK_SNIPPET_PREFIX = 'quick:'

const emptyState = (): MobileStoreState => ({
  sessions: [],
  sessionGroups: [],
  snippets: [],
  sshKeys: [],
  syncConfig: undefined
})

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const hasId = <T extends { id?: unknown }>(value: T): value is T & { id: string } =>
  typeof value.id === 'string' && value.id.trim().length > 0

const normalizeDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }
  return new Date()
}

const normalizeDateString = (value: unknown): string => normalizeDate(value).toISOString()

const normalizeSession = (session: SessionConfig): SessionConfig => {
  const sessionWithFallbacks = session as Partial<SessionConfig>
  return {
    ...session,
    type: 'ssh',
    port: Number.isFinite(Number(session.port)) ? Number(session.port) : 22,
    authType: session.authType || 'password',
    createdAt: normalizeDate(sessionWithFallbacks.createdAt),
    updatedAt: normalizeDate(sessionWithFallbacks.updatedAt),
    expiryDate: session.expiryDate ? normalizeDate(session.expiryDate) : undefined,
    lastConnected: session.lastConnected ? normalizeDate(session.lastConnected) : undefined
  }
}

const isSshSession = (session: SessionConfig): boolean =>
  session.type === undefined || session.type === 'ssh'

const normalizeSnippet = (snippet: MobileSnippet): MobileSnippet => ({
  ...snippet,
  name: snippet.name || '未命名片段',
  command: snippet.command || '',
  description: snippet.description || '',
  category: snippet.category || '',
  tags: asArray<string>(snippet.tags),
  variables: asArray<string>(snippet.variables),
  usageCount: Number.isFinite(Number(snippet.usageCount)) ? Number(snippet.usageCount) : 0,
  createdAt: normalizeDateString(snippet.createdAt),
  updatedAt: normalizeDateString(snippet.updatedAt)
})

const quickCommandToSnippet = (command: MobileQuickCommand): MobileSnippet => ({
  id: command.id.startsWith(QUICK_SNIPPET_PREFIX)
    ? command.id
    : `${QUICK_SNIPPET_PREFIX}${command.id}`,
  name: command.name,
  command: command.command,
  description: command.description || '',
  category: command.category || '快捷命令',
  tags: asArray<string>(command.tags),
  variables: [],
  usageCount: Number.isFinite(Number(command.usageCount)) ? Number(command.usageCount) : 0,
  createdAt: normalizeDateString(command.createdAt),
  updatedAt: normalizeDateString(command.updatedAt)
})

const normalizeKey = (key: MobileSSHKey): MobileSSHKey => ({
  ...key,
  name: key.name || '未命名密钥',
  type: key.type || 'rsa',
  publicKey: key.publicKey || key.publicKeyContent || '',
  fingerprint: key.fingerprint || '',
  createdAt: normalizeDateString(key.createdAt),
  usageCount: Number.isFinite(Number(key.usageCount)) ? Number(key.usageCount) : 0,
  protected: Boolean(key.protected),
  privateKeyContent: key.privateKeyContent,
  publicKeyContent: key.publicKeyContent || key.publicKey || ''
})

const snippetToQuickCommand = (snippet: MobileSnippet): MobileQuickCommand => ({
  id: snippet.id.replace(QUICK_SNIPPET_PREFIX, ''),
  name: snippet.name,
  command: snippet.command,
  description: snippet.description,
  category: snippet.category,
  tags: snippet.tags,
  usageCount: snippet.usageCount,
  createdAt: snippet.createdAt,
  updatedAt: snippet.updatedAt
})

const cloneForJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const normalizeSyncConfig = (config?: Partial<MobileSyncConfig>): MobileSyncConfig | undefined => {
  if (!config) return undefined
  return {
    enabled: Boolean(config.enabled),
    provider: config.provider === 'gitlab' ? 'gitlab' : 'github',
    remoteUrl: config.remoteUrl || '',
    token: config.token || '',
    password: config.password || '',
    lastSyncAt: config.lastSyncAt,
    lastUploadAt: config.lastUploadAt,
    lastDownloadAt: config.lastDownloadAt,
    lastSyncChecksum: config.lastSyncChecksum
  }
}

export const createMobileId = (prefix: string): string => {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random}`
}

export class MobileStore {
  private state: MobileStoreState = emptyState()
  private listeners = new Set<(state: MobileStoreState) => void>()

  load(): MobileStoreState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return this.getState()
      }

      const parsed = JSON.parse(raw) as Partial<MobileStoreState>
      this.state = {
        ...emptyState(),
        ...parsed,
        sessions: asArray<SessionConfig>(parsed.sessions)
          .filter(isSshSession)
          .map(normalizeSession),
        sessionGroups: asArray<SessionGroup>(parsed.sessionGroups).filter(hasId).map(normalizeSessionGroup),
        snippets: asArray<MobileSnippet>(parsed.snippets).filter(hasId).map(normalizeSnippet),
        sshKeys: asArray<MobileSSHKey>(parsed.sshKeys).filter(hasId).map(normalizeKey),
        syncConfig: normalizeSyncConfig(parsed.syncConfig)
      }
      return this.getState()
    } catch (error) {
      console.error('[MobileStore] Failed to load state', error)
      this.state = emptyState()
      return this.getState()
    }
  }

  subscribe(listener: (state: MobileStoreState) => void): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  getState(): MobileStoreState {
    return {
      ...this.state,
      sessions: [...this.state.sessions],
      sessionGroups: [...this.state.sessionGroups],
      snippets: [...this.state.snippets],
      sshKeys: [...this.state.sshKeys],
      syncConfig: this.state.syncConfig ? { ...this.state.syncConfig } : undefined
    }
  }

  importBackup(data: MobileBackupData): MobileStoreState {
    const sessions = asArray<SessionConfig>(data.sessions)
      .filter(isSshSession)
      .map(normalizeSession)
    const snippets = [
      ...asArray<MobileSnippet>(data.snippets).filter(hasId).map(normalizeSnippet),
      ...asArray<MobileQuickCommand>(data.quickCommands).filter(hasId).map(quickCommandToSnippet)
    ]

    this.state = {
      sessions: mergeById(this.state.sessions, sessions),
      sessionGroups: mergeById(
        this.state.sessionGroups,
        asArray<SessionGroup>(data.sessionGroups).filter(hasId).map(normalizeSessionGroup)
      ),
      snippets: mergeById(this.state.snippets, snippets),
      sshKeys: mergeKeysById(
        this.state.sshKeys,
        asArray<MobileSSHKey>(data.sshKeys).filter(hasId).map(normalizeKey)
      ),
      syncConfig: this.state.syncConfig,
      lastImportedAt: new Date().toISOString()
    }
    this.save()
    return this.getState()
  }

  upsertSession(session: SessionConfig): MobileStoreState {
    const existing = this.state.sessions.find((item) => item.id === session.id)
    const now = new Date()
    this.state.sessions = mergeById(this.state.sessions, [
      normalizeSession({
        ...(existing || session),
        ...session,
        type: 'ssh',
        createdAt: existing?.createdAt || normalizeDate(session.createdAt || now),
        updatedAt: now,
        expiryDate: session.expiryDate ? normalizeDate(session.expiryDate) : undefined,
        lastConnected: session.lastConnected ? normalizeDate(session.lastConnected) : undefined
      })
    ])
    this.save()
    return this.getState()
  }

  upsertSnippet(snippet: MobileSnippet): MobileStoreState {
    const existing = this.state.snippets.find((item) => item.id === snippet.id)
    const now = new Date().toISOString()
    this.state.snippets = mergeById(this.state.snippets, [
      normalizeSnippet({
        ...(existing || snippet),
        ...snippet,
        createdAt: existing?.createdAt || snippet.createdAt || now,
        updatedAt: now
      })
    ])
    this.save()
    return this.getState()
  }

  upsertKey(key: MobileSSHKey): MobileStoreState {
    const existing = this.state.sshKeys.find((item) => item.id === key.id)
    const now = new Date().toISOString()
    this.state.sshKeys = mergeKeysById(this.state.sshKeys, [
      normalizeKey({
        ...(existing || key),
        ...key,
        createdAt: existing?.createdAt || key.createdAt || now
      })
    ])
    this.save()
    return this.getState()
  }

  deleteSession(id: string): MobileStoreState {
    this.state.sessions = this.state.sessions.filter((session) => session.id !== id)
    this.state.sessionGroups = this.state.sessionGroups.map((group) => ({
      ...group,
      sessions: asArray<string>(group.sessions).filter((sessionId) => sessionId !== id)
    }))
    this.save()
    return this.getState()
  }

  deleteSnippet(id: string): MobileStoreState {
    this.state.snippets = this.state.snippets.filter((snippet) => snippet.id !== id)
    this.save()
    return this.getState()
  }

  deleteKey(id: string): MobileStoreState {
    this.state.sshKeys = this.state.sshKeys.filter((key) => key.id !== id)
    this.state.sessions = this.state.sessions.map((session) =>
      session.privateKeyId === id
        ? {
            ...session,
            authType: 'password',
            privateKeyId: undefined,
            privateKey: undefined,
            passphrase: undefined,
            updatedAt: new Date()
          }
        : session
    )
    this.save()
    return this.getState()
  }

  upsertSessionGroup(group: SessionGroup): MobileStoreState {
    const normalized = normalizeSessionGroup(group)
    this.state.sessionGroups = mergeById(this.state.sessionGroups, [normalized])
    this.save()
    return this.getState()
  }

  deleteSessionGroup(id: string): MobileStoreState {
    this.state.sessionGroups = this.state.sessionGroups.filter((group) => group.id !== id)
    this.state.sessions = this.state.sessions.map((session) =>
      session.group === id
        ? {
            ...session,
            group: undefined,
            updatedAt: new Date()
          }
        : session
    )
    this.save()
    return this.getState()
  }

  updateSyncConfig(updates: Partial<MobileSyncConfig>): MobileStoreState {
    this.state.syncConfig = normalizeSyncConfig({
      ...(this.state.syncConfig || {
        enabled: true,
        provider: 'github' as const,
        remoteUrl: '',
        token: '',
        password: ''
      }),
      ...updates
    })
    this.save()
    return this.getState()
  }

  clearSyncConfig(): MobileStoreState {
    this.state.syncConfig = undefined
    this.save()
    return this.getState()
  }

  exportBackup(): MobileBackupData {
    const snippets = this.state.snippets
      .filter((snippet) => !snippet.id.startsWith(QUICK_SNIPPET_PREFIX))
      .map(cloneForJson)
    const quickCommands = this.state.snippets
      .filter((snippet) => snippet.id.startsWith(QUICK_SNIPPET_PREFIX))
      .map(snippetToQuickCommand)
      .map(cloneForJson)

    return {
      version: MOBILE_BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      sessions: this.state.sessions.map(cloneForJson),
      sessionGroups: this.buildSessionGroupsForExport(),
      snippets,
      quickCommands,
      sshKeys: this.state.sshKeys.map(cloneForJson),
      commandHistory: [],
      portForwards: [],
      portForwardTemplates: [],
      sessionTemplates: [],
      scheduledTasks: [],
      workflows: [],
      settings: {}
    }
  }

  clear(): MobileStoreState {
    this.state = emptyState()
    localStorage.removeItem(STORAGE_KEY)
    this.emit()
    return this.getState()
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    this.emit()
  }

  private emit(): void {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state))
  }

  private buildSessionGroupsForExport(): SessionGroup[] {
    return this.state.sessionGroups.map((group) => ({
      ...cloneForJson(group),
      sessions:
        asArray<string>(group.sessions).length > 0
          ? asArray<string>(group.sessions)
          : this.state.sessions
              .filter((session) => session.group === group.id)
              .map((session) => session.id)
    }))
  }
}

const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
  const map = new Map<string, T>()
  existing.forEach((item) => map.set(item.id, item))
  incoming.forEach((item) => map.set(item.id, { ...(map.get(item.id) || item), ...item }))
  return Array.from(map.values())
}

const normalizeSessionGroup = (group: SessionGroup): SessionGroup => ({
  id: group.id,
  name: group.name || '未命名分组',
  sessions: asArray<string>(group.sessions)
})

const mergeKeysById = (existing: MobileSSHKey[], incoming: MobileSSHKey[]): MobileSSHKey[] => {
  const map = new Map<string, MobileSSHKey>()
  existing.forEach((item) => map.set(item.id, item))
  incoming.forEach((item) => {
    const current = map.get(item.id)
    const merged = { ...(current || item), ...item }
    if (!item.privateKeyContent && current?.privateKeyContent) {
      merged.privateKeyContent = current.privateKeyContent
    }
    if (!item.publicKeyContent && current?.publicKeyContent) {
      merged.publicKeyContent = current.publicKeyContent
    }
    map.set(item.id, merged)
  })
  return Array.from(map.values())
}

export const mobileStore = new MobileStore()
