import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadRemoteSyncPayload,
  parseRemoteTarget,
  uploadRemoteSyncPayload
} from './remote-sync'

describe('remote sync helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('converts a Gist page URL to the GitHub API URL', () => {
    expect(parseRemoteTarget('https://gist.github.com/inspoaibox/f8035780cb83a9237b0344')).toMatchObject({
      source: 'github-gist',
      requestUrl: 'https://api.github.com/gists/f8035780cb83a9237b0344'
    })
  })

  it('loads private GitHub Gist content with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          files: {
            'mshell-sync.json': {
              content: '{"version":"1.0.0","data":"{}"}'
            }
          }
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadRemoteSyncPayload(
      'https://gist.github.com/inspoaibox/f8035780cb83a9237b0344',
      'ghp_token'
    )

    expect(result).toMatchObject({
      source: 'github-gist',
      requestUrl: 'https://api.github.com/gists/f8035780cb83a9237b0344'
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/gists/f8035780cb83a9237b0344',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token ghp_token'
        })
      })
    )
  })

  it('uses inline Gist content when it is not truncated', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          files: {
            'mshell-sync.json': {
              raw_url: 'https://gist.githubusercontent.com/user/gist/raw/hash/mshell-sync.json',
              truncated: false,
              content: '{"version":"1.0.0","data":"complete"}'
            }
          }
        })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadRemoteSyncPayload('https://gist.github.com/user/gist', 'ghp_token')

    expect(result).toMatchObject({
      source: 'github-gist',
      requestUrl: 'https://api.github.com/gists/gist',
      text: '{"version":"1.0.0","data":"complete"}'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('loads raw Gist content without GitHub authorization headers when API content is truncated', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            files: {
              'mshell-sync.json': {
                raw_url:
                  'https://gist.githubusercontent.com/user/gist/raw/hash/mshell-sync.json',
                truncated: true,
                content: '{"version":"1.0.0","data":"truncated"}'
              }
            }
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '{"version":"1.0.0","data":"complete"}'
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadRemoteSyncPayload('https://gist.github.com/user/gist', 'ghp_token')

    expect(result).toMatchObject({
      source: 'github-gist',
      requestUrl: 'https://gist.githubusercontent.com/user/gist/raw/hash/mshell-sync.json',
      text: '{"version":"1.0.0","data":"complete"}'
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://gist.githubusercontent.com/user/gist/raw/hash/mshell-sync.json',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String)
        })
      })
    )
  })

  it('explains private Gist 404 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found'
      })
    )

    await expect(loadRemoteSyncPayload('https://gist.github.com/u/private')).rejects.toThrow(
      '如果是私有 Gist，请填写 GitHub Token'
    )
  })

  it('rejects HTML pages because they are not sync data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<html><body>gist page</body></html>'
      })
    )

    await expect(loadRemoteSyncPayload('https://example.com/page')).rejects.toThrow(
      '读取到的是网页内容'
    )
  })

  it('creates a new GitHub Gist when no remote URL is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'new-gist-id',
        html_url: 'https://gist.github.com/new-gist-id'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await uploadRemoteSyncPayload('', 'ghp_token', '{"x":1}', 'github')

    expect(result).toMatchObject({
      source: 'github-gist',
      remoteUrl: 'https://gist.github.com/new-gist-id',
      created: true
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/gists',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('updates an existing GitLab Snippet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 123,
        web_url: 'https://gitlab.com/snippets/123'
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await uploadRemoteSyncPayload(
      'https://gitlab.com/snippets/123',
      'glpat_token',
      '{"x":1}',
      'gitlab'
    )

    expect(result).toMatchObject({
      source: 'gitlab-snippet',
      remoteUrl: 'https://gitlab.com/snippets/123',
      created: false
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gitlab.com/api/v4/snippets/123',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'PRIVATE-TOKEN': 'glpat_token'
        })
      })
    )
  })
})
