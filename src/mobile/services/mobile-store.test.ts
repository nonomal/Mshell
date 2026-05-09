import { beforeEach, describe, expect, it } from 'vitest'
import { MobileStore } from './mobile-store'

const session = {
  id: 'session-1',
  name: 'Alpha VPS',
  type: 'ssh' as const,
  host: 'example.com',
  port: 22,
  username: 'root',
  authType: 'privateKey' as const,
  privateKeyId: 'key-1',
  createdAt: new Date('2026-05-09T00:00:00.000Z'),
  updatedAt: new Date('2026-05-09T00:00:00.000Z')
}

describe('MobileStore importBackup', () => {
  let store: MobileStore

  beforeEach(() => {
    localStorage.clear()
    store = new MobileStore()
  })

  it('keeps existing private key content when an old backup only contains key metadata', () => {
    store.importBackup({
      version: '0.2.0',
      timestamp: '2026-05-09T00:00:00.000Z',
      sessions: [session],
      sshKeys: [
        {
          id: 'key-1',
          name: 'main',
          type: 'rsa',
          publicKey: 'public-v1',
          fingerprint: 'fp',
          createdAt: '2026-05-09T00:00:00.000Z',
          usageCount: 0,
          protected: false,
          privateKeyContent: 'PRIVATE KEY'
        }
      ]
    })

    const state = store.importBackup({
      version: '0.2.0',
      timestamp: '2026-05-09T00:00:00.000Z',
      sshKeys: [
        {
          id: 'key-1',
          name: 'main renamed',
          type: 'rsa',
          publicKey: 'public-v2',
          fingerprint: 'fp2',
          createdAt: '2026-05-09T00:00:00.000Z',
          usageCount: 1,
          protected: false
        }
      ]
    })

    expect(state.sshKeys).toHaveLength(1)
    expect(state.sshKeys[0]).toMatchObject({
      id: 'key-1',
      name: 'main renamed',
      privateKeyContent: 'PRIVATE KEY'
    })
  })

  it('imports quick commands as command snippets and ignores non-SSH sessions', () => {
    const state = store.importBackup({
      version: '0.2.0',
      timestamp: '2026-05-09T00:00:00.000Z',
      sessions: [
        session,
        {
          ...session,
          id: 'rdp-1',
          type: 'rdp' as const
        }
      ],
      quickCommands: [
        {
          id: 'quick-1',
          name: 'disk',
          command: 'df -h',
          category: 'system',
          tags: ['linux'],
          usageCount: 2,
          createdAt: '2026-05-09T00:00:00.000Z',
          updatedAt: '2026-05-09T00:00:00.000Z'
        }
      ]
    })

    expect(state.sessions.map((item) => item.id)).toEqual(['session-1'])
    expect(state.snippets).toMatchObject([
      {
        id: 'quick:quick-1',
        name: 'disk',
        command: 'df -h',
        usageCount: 2
      }
    ])
  })

  it('supports local CRUD and clears missing key references', () => {
    store.upsertKey({
      id: 'key-1',
      name: 'main',
      type: 'ed25519',
      publicKey: 'public',
      fingerprint: 'fp',
      createdAt: '2026-05-09T00:00:00.000Z',
      usageCount: 0,
      protected: false,
      privateKeyContent: 'PRIVATE KEY'
    })
    store.upsertSession(session)
    store.upsertSnippet({
      id: 'snippet-1',
      name: 'uptime',
      command: 'uptime',
      description: '',
      category: 'system',
      tags: ['linux'],
      variables: [],
      usageCount: 0,
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z'
    })

    let state = store.deleteKey('key-1')
    expect(state.sshKeys).toHaveLength(0)
    expect(state.sessions[0]).toMatchObject({
      id: 'session-1',
      authType: 'password',
      privateKeyId: undefined
    })

    state = store.deleteSnippet('snippet-1')
    expect(state.snippets).toHaveLength(0)

    state = store.deleteSession('session-1')
    expect(state.sessions).toHaveLength(0)
  })

  it('exports desktop-compatible backup data without re-encrypting existing state', () => {
    store.importBackup({
      version: '0.2.0',
      timestamp: '2026-05-09T00:00:00.000Z',
      sessions: [session],
      snippets: [
        {
          id: 'snippet-1',
          name: 'uptime',
          command: 'uptime',
          description: '',
          category: 'system',
          tags: [],
          variables: [],
          usageCount: 0,
          createdAt: '2026-05-09T00:00:00.000Z',
          updatedAt: '2026-05-09T00:00:00.000Z'
        }
      ],
      quickCommands: [
        {
          id: 'quick-1',
          name: 'disk',
          command: 'df -h',
          createdAt: '2026-05-09T00:00:00.000Z',
          updatedAt: '2026-05-09T00:00:00.000Z'
        }
      ],
      sshKeys: [
        {
          id: 'key-1',
          name: 'main',
          type: 'rsa',
          publicKey: 'public',
          fingerprint: 'fp',
          createdAt: '2026-05-09T00:00:00.000Z',
          usageCount: 0,
          protected: false,
          privateKeyContent: 'PRIVATE KEY'
        }
      ]
    })

    const backup = store.exportBackup()

    expect(backup).toMatchObject({
      version: '0.2.0',
      sessions: [{ id: 'session-1' }],
      snippets: [{ id: 'snippet-1', command: 'uptime' }],
      quickCommands: [{ id: 'quick-1', command: 'df -h' }],
      sshKeys: [{ id: 'key-1', privateKeyContent: 'PRIVATE KEY' }],
      settings: {}
    })
    expect(JSON.stringify(backup)).not.toContain('mshell-backup-encryption-key-v1')
  })

  it('creates and removes session groups without deleting sessions', () => {
    store.upsertSessionGroup({
      id: 'group-1',
      name: '生产服务器',
      sessions: []
    })
    store.upsertSession({
      ...session,
      group: 'group-1'
    })

    let state = store.getState()
    expect(state.sessionGroups).toMatchObject([{ id: 'group-1', name: '生产服务器' }])
    expect(state.sessions[0].group).toBe('group-1')

    state = store.deleteSessionGroup('group-1')
    expect(state.sessionGroups).toHaveLength(0)
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].group).toBeUndefined()
  })

  it('keeps saved remote sync config when importing downloaded data', () => {
    store.updateSyncConfig({
      enabled: true,
      provider: 'github',
      remoteUrl: 'https://gist.github.com/user/sync-id',
      token: 'ghp_token',
      password: 'sync-password',
      lastSyncChecksum: 'old'
    })

    const state = store.importBackup({
      version: '0.2.0',
      timestamp: '2026-05-09T00:00:00.000Z',
      sessions: [session]
    })

    expect(state.syncConfig).toMatchObject({
      provider: 'github',
      remoteUrl: 'https://gist.github.com/user/sync-id',
      token: 'ghp_token',
      password: 'sync-password'
    })
    expect(state.sessions).toHaveLength(1)
  })
})
