export interface RemoteSyncPayload {
  text: string
  source: 'github-gist' | 'gitlab-snippet' | 'raw-url'
  requestUrl: string
  remoteUrl?: string
}

interface RemoteTarget {
  source: RemoteSyncPayload['source']
  requestUrl: string
  provider?: 'github' | 'gitlab'
  id?: string
  publicUrl?: string
  instanceUrl?: string
}

export interface RemoteUploadResult {
  remoteUrl: string
  requestUrl: string
  source: 'github-gist' | 'gitlab-snippet'
  created: boolean
}

export const loadRemoteSyncPayload = async (
  remoteUrl: string,
  token?: string
): Promise<RemoteSyncPayload> => {
  const target = parseRemoteTarget(remoteUrl)
  const initialText = await fetchRemoteText(target.requestUrl, target, token)
  const remote = await normalizeRemotePayloadText(initialText, target)

  return {
    text: remote.text,
    source: target.source,
    requestUrl: remote.requestUrl || target.requestUrl,
    remoteUrl: target.publicUrl
  }
}

export const parseRemoteTarget = (remoteUrl: string): RemoteTarget => {
  const input = remoteUrl.trim()
  if (!input) {
    throw new Error('请输入同步数据 URL')
  }

  if (/^[a-f0-9]{20,}$/i.test(input)) {
    return {
      source: 'github-gist',
      provider: 'github',
      id: input,
      publicUrl: `https://gist.github.com/${input}`,
      requestUrl: `https://api.github.com/gists/${input}`
    }
  }

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('同步数据 URL 格式不正确')
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'gist.github.com') {
    if (url.pathname.split('/').filter(Boolean).includes('raw')) {
      return {
        source: 'raw-url',
        provider: 'github',
        requestUrl: url.toString()
      }
    }

    const gistId = extractLastPathPart(url)
    return {
      source: 'github-gist',
      provider: 'github',
      id: gistId,
      publicUrl: `https://gist.github.com/${gistId}`,
      requestUrl: `https://api.github.com/gists/${gistId}`
    }
  }

  if (hostname === 'api.github.com' && /^\/gists\/[^/]+/.test(url.pathname)) {
    const gistId = extractLastPathPart(url)
    return {
      source: 'github-gist',
      provider: 'github',
      id: gistId,
      publicUrl: `https://gist.github.com/${gistId}`,
      requestUrl: url.toString()
    }
  }

  if (hostname === 'gist.githubusercontent.com') {
    return {
      source: 'raw-url',
      provider: 'github',
      requestUrl: url.toString()
    }
  }

  const gitlabSnippetId = extractGitLabSnippetId(url)
  if (gitlabSnippetId) {
    return {
      source: 'gitlab-snippet',
      provider: 'gitlab',
      id: gitlabSnippetId,
      publicUrl: `${url.origin}/-/snippets/${gitlabSnippetId}`,
      instanceUrl: url.origin,
      requestUrl: `${url.origin}/api/v4/snippets/${gitlabSnippetId}/raw`
    }
  }

  return {
    source: 'raw-url',
    requestUrl: url.toString()
  }
}

export const uploadRemoteSyncPayload = async (
  remoteUrl: string,
  token: string,
  content: string,
  provider: 'github' | 'gitlab' = 'github'
): Promise<RemoteUploadResult> => {
  const cleanToken = token.trim()
  if (!cleanToken) {
    throw new Error(provider === 'gitlab' ? '请填写 GitLab Token' : '请填写 GitHub Token')
  }

  const target = remoteUrl.trim() ? parseRemoteTarget(remoteUrl) : undefined
  if (provider === 'github') {
    return uploadGitHubGist(target, cleanToken, content)
  }
  return uploadGitLabSnippet(target, cleanToken, content)
}

const uploadGitHubGist = async (
  target: RemoteTarget | undefined,
  token: string,
  content: string
): Promise<RemoteUploadResult> => {
  if (target && target.provider !== 'github') {
    throw new Error('当前选择 GitHub 同步，请填写 GitHub Gist 地址')
  }
  if (target && target.source !== 'github-gist') {
    throw new Error('上传需要 GitHub Gist 页面地址或 Gist ID，raw 地址只能下载到本地')
  }

  const gistId = target?.source === 'github-gist' ? target.id : undefined
  const requestUrl = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists'
  const response = await fetch(requestUrl, {
    method: gistId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      description: 'MShell Sync Data - DO NOT DELETE',
      public: false,
      files: {
        'mshell-sync.json': {
          content
        }
      }
    })
  }).catch(() => {
    throw new Error('网络请求失败，请检查网络连接、代理/VPN 和 GitHub Token')
  })

  if (!response.ok) {
    throw await buildRemoteError(response, {
      source: 'github-gist',
      provider: 'github',
      requestUrl
    })
  }

  const data = await response.json()
  const id = data.id || gistId
  return {
    source: 'github-gist',
    created: !gistId,
    requestUrl: `https://api.github.com/gists/${id}`,
    remoteUrl: data.html_url || `https://gist.github.com/${id}`
  }
}

const uploadGitLabSnippet = async (
  target: RemoteTarget | undefined,
  token: string,
  content: string
): Promise<RemoteUploadResult> => {
  if (target && target.provider !== 'gitlab') {
    throw new Error('当前选择 GitLab 同步，请填写 GitLab Snippet 地址')
  }
  if (target && target.source !== 'gitlab-snippet') {
    throw new Error('上传需要 GitLab Snippet 地址，raw 地址只能下载到本地')
  }

  const instanceUrl = target?.instanceUrl || 'https://gitlab.com'
  const snippetId = target?.source === 'gitlab-snippet' ? target.id : undefined
  const requestUrl = snippetId
    ? `${instanceUrl}/api/v4/snippets/${snippetId}`
    : `${instanceUrl}/api/v4/snippets`
  const response = await fetch(requestUrl, {
    method: snippetId ? 'PUT' : 'POST',
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(
      snippetId
        ? {
            title: 'MShell Sync Data - DO NOT DELETE',
            files: [
              {
                action: 'update',
                file_path: 'mshell-sync.json',
                content
              }
            ]
          }
        : {
            title: 'MShell Sync Data - DO NOT DELETE',
            description: 'MShell 同步数据，请勿删除',
            visibility: 'private',
            files: [
              {
                file_path: 'mshell-sync.json',
                content
              }
            ]
          }
    )
  }).catch(() => {
    throw new Error('网络请求失败，请检查网络连接、代理/VPN 和 GitLab Token')
  })

  if (!response.ok) {
    throw await buildRemoteError(response, {
      source: 'gitlab-snippet',
      provider: 'gitlab',
      requestUrl
    })
  }

  const data = await response.json()
  const id = String(data.id || snippetId)
  return {
    source: 'gitlab-snippet',
    created: !snippetId,
    requestUrl: `${instanceUrl}/api/v4/snippets/${id}/raw`,
    remoteUrl: data.web_url || `${instanceUrl}/-/snippets/${id}`
  }
}

const fetchRemoteText = async (
  requestUrl: string,
  target: RemoteTarget,
  token?: string,
  options: { includeAuth?: boolean } = {}
): Promise<string> => {
  const response = await fetch(requestUrl, {
    headers: buildHeaders(target, token, options)
  }).catch(() => {
    throw new Error(
      target.source === 'raw-url'
        ? 'Raw 文件读取失败，请检查网络连接；如果是 Gist，请优先使用 Gist 页面地址并填写 Token'
        : '网络请求失败，请检查网络连接、代理/VPN，私有 Gist/Snippet 请填写访问 Token'
    )
  })

  if (!response.ok) {
    throw await buildRemoteError(response, target)
  }

  const text = await response.text()
  if (looksLikeHtml(text)) {
    throw new Error('读取到的是网页内容，不是同步 JSON；请使用 Gist/Snippet 地址或 raw/API 地址')
  }
  return text
}

const normalizeRemotePayloadText = async (
  text: string,
  target: RemoteTarget
): Promise<{ text: string; requestUrl?: string }> => {
  if (target.source !== 'github-gist') {
    return { text }
  }

  const parsed = tryParseJson(text)
  const file = findMshellGistFile(parsed)
  if (!file) {
    return { text }
  }

  if (!file.truncated && typeof file.content === 'string') {
    return { text: file.content }
  }

  if (typeof file.raw_url === 'string') {
    const rawTarget: RemoteTarget = {
      source: 'raw-url',
      provider: 'github',
      requestUrl: file.raw_url
    }
    return {
      text: await fetchRemoteText(file.raw_url, rawTarget, undefined, { includeAuth: false }),
      requestUrl: file.raw_url
    }
  }

  if (file.truncated) {
    throw new Error('GitHub Gist 返回的同步文件内容被截断，请使用 raw 地址重新读取')
  }

  if (typeof file.content === 'string') {
    return { text: file.content }
  }

  return { text }
}

const tryParseJson = (text: string): any | undefined => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const findMshellGistFile = (value: any): any | undefined => {
  const files = value?.files
  if (!files || typeof files !== 'object') {
    return undefined
  }

  return (
    files['mshell-sync.json'] ||
    files['mshell-backup.json'] ||
    Object.values(files).find((file: any) => {
      const name = String(file?.filename || '')
      return name === 'mshell-sync.json' || name === 'mshell-backup.json'
    })
  )
}

const buildHeaders = (
  target: RemoteTarget,
  token?: string,
  options: { includeAuth?: boolean } = {}
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept:
      target.provider === 'github' && target.source !== 'raw-url'
        ? 'application/vnd.github+json, application/json, text/plain, */*'
        : '*/*'
  }
  const cleanToken = token?.trim()
  const includeAuth =
    options.includeAuth ?? !(target.provider === 'github' && target.source === 'raw-url')
  if (!cleanToken || !includeAuth) {
    return headers
  }

  if (target.provider === 'github' && target.source !== 'raw-url') {
    headers.Authorization = `token ${cleanToken}`
    headers['X-GitHub-Api-Version'] = '2022-11-28'
  } else if (target.provider === 'gitlab') {
    headers['PRIVATE-TOKEN'] = cleanToken
  }

  return headers
}

const buildRemoteError = async (response: Response, target: RemoteTarget): Promise<Error> => {
  const detail = await response.text().catch(() => '')
  if (response.status === 401) {
    return new Error('访问 Token 无效或没有权限')
  }
  if (response.status === 403) {
    return new Error('远程服务拒绝访问，请检查 Token 权限或 API 访问频率限制')
  }
  if (response.status === 404 && target.source === 'github-gist') {
    return new Error('找不到该 Gist；如果是私有 Gist，请填写 GitHub Token')
  }
  if (response.status === 404 && target.source === 'gitlab-snippet') {
    return new Error('找不到该 GitLab Snippet；如果是私有 Snippet，请填写 GitLab Token')
  }

  return new Error(`读取远程同步数据失败：HTTP ${response.status}${detail ? ` ${detail}` : ''}`)
}

const extractLastPathPart = (url: URL): string => {
  const part = url.pathname.split('/').filter(Boolean).at(-1)?.replace(/\.git$/i, '')
  if (!part) {
    throw new Error('无法从 Gist 地址中识别 Gist ID')
  }
  return part
}

const extractGitLabSnippetId = (url: URL): string | undefined => {
  const apiMatch = url.pathname.match(/\/api\/v4\/snippets\/(\d+)/)
  if (apiMatch) {
    return apiMatch[1]
  }

  return url.pathname.match(/\/(?:-\/)?snippets\/(\d+)/)?.[1]
}

const looksLikeHtml = (text: string): boolean => /^(\s*)?(<!doctype html|<html)/i.test(text)
