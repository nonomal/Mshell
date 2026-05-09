import { describe, expect, it } from 'vitest'
import { parseBackupOrSyncPayload } from './sync-import'
import {
  calculateBackupChecksum,
  createEncryptedBackupPayload,
  createSyncPayload
} from './sync-export'
import type { MobileBackupData } from '../types'

const backup: MobileBackupData = {
  version: '0.2.0',
  timestamp: '2026-05-09T00:00:00.000Z',
  sessions: [
    {
      id: 'session-1',
      name: 'Alpha VPS',
      host: 'example.com',
      port: 22,
      username: 'root',
      authType: 'password',
      password: 'secret',
      createdAt: new Date('2026-05-09T00:00:00.000Z'),
      updatedAt: new Date('2026-05-09T00:00:00.000Z')
    }
  ],
  sessionGroups: [],
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
}

describe('mobile sync export', () => {
  it('creates encrypted sync data that the desktop-compatible importer can read', async () => {
    const payload = await createSyncPayload(backup, 'sync-password')

    await expect(parseBackupOrSyncPayload(payload, 'sync-password')).resolves.toMatchObject({
      sessions: [{ id: 'session-1' }],
      snippets: [{ id: 'snippet-1' }],
      quickCommands: [{ id: 'quick-1' }],
      sshKeys: [{ id: 'key-1' }]
    })
  })

  it('creates encrypted backup data that the importer can read', async () => {
    const payload = await createEncryptedBackupPayload(backup, 'backup-password')

    await expect(parseBackupOrSyncPayload(payload, 'backup-password')).resolves.toMatchObject({
      sessions: [{ id: 'session-1' }],
      sshKeys: [{ privateKeyContent: 'PRIVATE KEY' }]
    })
  })

  it('keeps sync checksum stable when only timestamp changes', async () => {
    const nextBackup = {
      ...backup,
      timestamp: '2026-05-09T01:00:00.000Z'
    }

    await expect(calculateBackupChecksum(nextBackup)).resolves.toBe(
      await calculateBackupChecksum(backup)
    )
  })
})
