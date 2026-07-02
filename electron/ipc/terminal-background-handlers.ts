import { app, dialog, ipcMain, net, protocol } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join, resolve, sep } from 'path'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'

export const TERMINAL_BACKGROUND_SCHEME = 'mshell-terminal-background'

const IMAGE_FILTERS = [
  {
    name: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']
  }
]

const MAX_IMAGE_SIZE = 20 * 1024 * 1024
let protocolHandled = false

const getTerminalBackgroundDir = () => join(app.getPath('userData'), 'terminal-backgrounds')

const toTerminalBackgroundUrl = (fileName: string) =>
  `${TERMINAL_BACKGROUND_SCHEME}://local/${encodeURIComponent(fileName)}`

const sanitizeBaseName = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '') || 'background'

async function importTerminalBackgroundImage(filePath: string) {
  const stats = await fs.stat(filePath)
  if (!stats.isFile()) {
    throw new Error('请选择有效的图片文件')
  }
  if (stats.size > MAX_IMAGE_SIZE) {
    throw new Error('图片不能超过 20MB')
  }

  const sourceName = basename(filePath)
  const extension = extname(sourceName).toLowerCase() || '.png'
  const targetDir = getTerminalBackgroundDir()
  await fs.mkdir(targetDir, { recursive: true })

  const targetName = `${Date.now()}-${randomUUID()}-${sanitizeBaseName(
    sourceName.replace(extension, '')
  )}${extension}`
  const targetPath = join(targetDir, targetName)
  await fs.copyFile(filePath, targetPath)

  return {
    source: 'local' as const,
    image: toTerminalBackgroundUrl(targetName),
    fileName: sourceName
  }
}

export function registerTerminalBackgroundProtocol() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: TERMINAL_BACKGROUND_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true
      }
    }
  ])
}

export function handleTerminalBackgroundProtocol() {
  if (protocolHandled) return
  protocolHandled = true

  protocol.handle(TERMINAL_BACKGROUND_SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url)
      const fileName = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ''))

      if (!fileName || basename(fileName) !== fileName) {
        return new Response('Invalid terminal background path', { status: 400 })
      }

      const targetDir = resolve(getTerminalBackgroundDir())
      const targetPath = resolve(targetDir, fileName)
      if (targetPath !== targetDir && !targetPath.startsWith(`${targetDir}${sep}`)) {
        return new Response('Forbidden', { status: 403 })
      }

      await fs.access(targetPath)
      return net.fetch(pathToFileURL(targetPath).href)
    } catch {
      return new Response('Terminal background not found', { status: 404 })
    }
  })
}

export function registerTerminalBackgroundHandlers() {
  ipcMain.handle('terminalBackground:selectImage', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: IMAGE_FILTERS
      })

      if (result.canceled || !result.filePaths[0]) {
        return { success: true, data: null }
      }

      const data = await importTerminalBackgroundImage(result.filePaths[0])
      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message || '导入背景图片失败' }
    }
  })
}
