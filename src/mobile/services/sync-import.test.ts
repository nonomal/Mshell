import { createCipheriv, randomBytes, scrypt as nodeScrypt } from 'crypto'
import { Buffer } from 'buffer'
import { promisify } from 'util'
import { describe, expect, it } from 'vitest'
import { parseBackupOrSyncPayload } from './sync-import'

const scrypt = promisify(nodeScrypt)

const encryptLikeDesktop = async (
  value: string,
  password: string,
  salt: string
): Promise<string> => {
  const key = (await scrypt(password, salt, 32)) as Buffer
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

describe('parseBackupOrSyncPayload', () => {
  const backup = {
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
        createdAt: '2026-05-09T00:00:00.000Z',
        updatedAt: '2026-05-09T00:00:00.000Z'
      }
    ],
    sessionGroups: [],
    snippets: [{ id: 'snippet-1', name: 'uptime', command: 'uptime' }],
    sshKeys: [{ id: 'key-1', name: 'main', privateKeyContent: 'PRIVATE KEY' }]
  }

  it('decrypts desktop cloud sync data', async () => {
    const encrypted = await encryptLikeDesktop(
      JSON.stringify(backup),
      'sync-password',
      'mshell-sync-salt'
    )
    const payload = JSON.stringify({
      version: '1.0.0',
      checksum: 'abc123',
      encrypted: true,
      data: encrypted
    })

    await expect(parseBackupOrSyncPayload(payload, 'sync-password')).resolves.toMatchObject({
      sessions: [{ id: 'session-1' }],
      snippets: [{ id: 'snippet-1' }],
      sshKeys: [{ id: 'key-1' }]
    })
  })

  it('decrypts desktop .mshell backup data', async () => {
    const payload = await encryptLikeDesktop(
      JSON.stringify(backup),
      'backup-password',
      'mshell-backup-encryption-key-v1'
    )

    await expect(parseBackupOrSyncPayload(payload, 'backup-password')).resolves.toMatchObject({
      sessions: [{ id: 'session-1' }]
    })
  })

  it('unwraps GitHub Gist API responses before parsing sync content', async () => {
    const payload = JSON.stringify({
      files: {
        'mshell-sync.json': {
          content: JSON.stringify({
            version: '1.0.0',
            checksum: 'plain-checksum',
            encrypted: false,
            data: JSON.stringify(backup)
          })
        }
      }
    })

    await expect(parseBackupOrSyncPayload(payload)).resolves.toMatchObject({
      sessions: [{ id: 'session-1' }],
      snippets: [{ id: 'snippet-1' }]
    })
  })

  it('reports truncated GitHub Gist content instead of treating it as encrypted backup data', async () => {
    const payload = JSON.stringify({
      files: {
        'mshell-sync.json': {
          truncated: true,
          content: '{"version":"1.0.0","checksum":"abc","encrypted":true,"data":"abc'
        }
      }
    })

    await expect(parseBackupOrSyncPayload(payload, 'sync-password')).rejects.toThrow(
      '内容被截断'
    )
  })

  it('reports incomplete sync JSON clearly', async () => {
    await expect(
      parseBackupOrSyncPayload('{"version":"1.0.0","checksum":"abc","encrypted":true,', 'pw')
    ).rejects.toThrow('JSON 不完整')
  })
})
