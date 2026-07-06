import { ipcMain } from 'electron'
import { portForwardManager } from '../managers/PortForwardManager'
import { sshConnectionManager } from '../managers/SSHConnectionManager'
import { sessionManager } from '../managers/SessionManager'
import { sshKeyManager } from '../managers/SSHKeyManager'
import {
  createPortForwardSystemPersistencePlan,
  getPortForwardSystemPersistenceStatus,
  installPortForwardSystemPersistence,
  uninstallPortForwardSystemPersistence
} from '../utils/port-forward-system-persistence'

interface PortForwardConfig {
  type: 'local' | 'remote' | 'dynamic'
  localHost: string
  localPort: number
  remoteHost: string
  remotePort: number
  description?: string
  autoStart?: boolean
}

async function getSystemPersistencePlan(sessionId: string, forwardId: string) {
  await Promise.all([portForwardManager.initialize(), sessionManager.initialize()])

  const session = sessionManager.getSession(sessionId)
  if (!session) {
    throw new Error('Session not found')
  }

  const forward = portForwardManager.getForward(forwardId)
  if (!forward) {
    throw new Error('Forward not found')
  }

  const forwardSessionId = forward.sessionId || forward.connectionId
  if (forwardSessionId && forwardSessionId !== sessionId) {
    throw new Error('Forward does not belong to this session')
  }

  const sshKey = session.privateKeyId ? sshKeyManager.getKey(session.privateKeyId) : undefined
  return createPortForwardSystemPersistencePlan(session, forward, sshKey)
}

/**
 * 注册端口转发 IPC 处理器
 */
export function registerPortForwardHandlers() {
  // 获取所有转发
  ipcMain.handle('portForward:getAll', async (_event, sessionId: string) => {
    try {
      await portForwardManager.initialize()
      const forwards = portForwardManager.getAllForwards(sessionId)
      return { success: true, forwards }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 添加转发
  ipcMain.handle(
    'portForward:add',
    async (_event, sessionId: string, connectionId: string, config: PortForwardConfig) => {
      try {
        await portForwardManager.initialize()
        const connection = sshConnectionManager.getConnection(connectionId)
        if (!connection) {
          return { success: false, error: 'Connection not found' }
        }
        // 不自动启动，只添加配置
        const forward = {
          sessionId,
          type: config.type,
          localHost: config.localHost,
          localPort: config.localPort,
          remoteHost: config.remoteHost || '',
          remotePort: config.remotePort || 0,
          description: config.description,
          autoStart: config.autoStart || false
        }

        // 存储转发配置
        const created = await portForwardManager.addForward(forward)

        return { success: true, id: created.id }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // 启动转发
  ipcMain.handle(
    'portForward:start',
    async (_event, sessionId: string, connectionId: string, forwardId: string) => {
      try {
        await portForwardManager.initialize()
        const connection = sshConnectionManager.getConnection(connectionId)
        if (!connection) {
          return { success: false, error: 'Connection not found' }
        }

        const forward = portForwardManager.getForward(forwardId)
        if (!forward) {
          return { success: false, error: 'Forward not found' }
        }

        const forwardSessionId = forward.sessionId || forward.connectionId
        if (forwardSessionId && forwardSessionId !== sessionId) {
          return { success: false, error: 'Forward does not belong to this session' }
        }

        if (!forward.sessionId) {
          await portForwardManager.updateForward(forwardId, { sessionId })
        }

        if (forward.type === 'local') {
          await portForwardManager.setupLocalForward(
            forwardId,
            sessionId,
            connectionId,
            connection.client,
            forward.localHost,
            forward.localPort,
            forward.remoteHost,
            forward.remotePort
          )
        } else if (forward.type === 'remote') {
          await portForwardManager.setupRemoteForward(
            forwardId,
            sessionId,
            connectionId,
            connection.client,
            forward.remoteHost,
            forward.remotePort,
            forward.localHost,
            forward.localPort
          )
        } else if (forward.type === 'dynamic') {
          await portForwardManager.setupDynamicForward(
            forwardId,
            sessionId,
            connectionId,
            connection.client,
            forward.localHost,
            forward.localPort
          )
        }

        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // 停止转发
  ipcMain.handle('portForward:stop', async (_event, _sessionId: string, _connectionId: string, forwardId: string) => {
    try {
      await portForwardManager.initialize()
      await portForwardManager.stopForward(forwardId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 删除转发
  ipcMain.handle(
    'portForward:delete',
    async (_event, _sessionId: string, _connectionId: string, forwardId: string) => {
      try {
        await portForwardManager.initialize()
        await portForwardManager.deleteForward(forwardId)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    }
  )

  // 更新转发配置
  ipcMain.handle('portForward:update', async (_event, forwardId: string, updates: any) => {
    try {
      await portForwardManager.initialize()
      await portForwardManager.updateForward(forwardId, updates)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取流量统计
  ipcMain.handle('portForward:getTrafficStats', async (_event, forwardId: string) => {
    try {
      await portForwardManager.initialize()
      const stats = portForwardManager.getTrafficStats(forwardId)
      return { success: true, data: stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取所有流量统计
  ipcMain.handle('portForward:getAllTrafficStats', async () => {
    try {
      await portForwardManager.initialize()
      const stats = portForwardManager.getAllTrafficStats()
      return { success: true, data: stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 重置流量统计
  ipcMain.handle('portForward:resetTrafficStats', async (_event, forwardId: string) => {
    try {
      await portForwardManager.initialize()
      portForwardManager.resetTrafficStats(forwardId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取系统级持久化预检/脚本计划
  ipcMain.handle('portForward:getSystemPersistencePlan', async (_event, sessionId: string, forwardId: string) => {
    try {
      const plan = await getSystemPersistencePlan(sessionId, forwardId)
      return { success: true, data: plan }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 查询系统级持久化状态
  ipcMain.handle('portForward:getSystemPersistenceStatus', async (_event, sessionId: string, forwardId: string) => {
    try {
      const plan = await getSystemPersistencePlan(sessionId, forwardId)
      const status = await getPortForwardSystemPersistenceStatus(plan)
      return { success: true, data: status }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 安装系统级持久化
  ipcMain.handle('portForward:installSystemPersistence', async (_event, sessionId: string, forwardId: string) => {
    try {
      const plan = await getSystemPersistencePlan(sessionId, forwardId)
      const result = await installPortForwardSystemPersistence(plan)
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error || result.details, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 卸载系统级持久化
  ipcMain.handle('portForward:uninstallSystemPersistence', async (_event, sessionId: string, forwardId: string) => {
    try {
      const plan = await getSystemPersistencePlan(sessionId, forwardId)
      const result = await uninstallPortForwardSystemPersistence(plan)
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error || result.details, data: result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ========== 模板管理 ==========

  // 创建模板
  ipcMain.handle('portForward:createTemplate', async (_event, data: any) => {
    try {
      await portForwardManager.initialize()
      const template = await portForwardManager.createTemplate(data)
      return { success: true, data: template }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取所有模板
  ipcMain.handle('portForward:getAllTemplates', async () => {
    try {
      await portForwardManager.initialize()
      const templates = portForwardManager.getAllTemplates()
      return { success: true, data: templates }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 获取模板
  ipcMain.handle('portForward:getTemplate', async (_event, id: string) => {
    try {
      await portForwardManager.initialize()
      const template = portForwardManager.getTemplate(id)
      return { success: true, data: template }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 更新模板
  ipcMain.handle('portForward:updateTemplate', async (_event, id: string, updates: any) => {
    try {
      await portForwardManager.initialize()
      await portForwardManager.updateTemplate(id, updates)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 删除模板
  ipcMain.handle('portForward:deleteTemplate', async (_event, id: string) => {
    try {
      await portForwardManager.initialize()
      await portForwardManager.deleteTemplate(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 按标签获取模板
  ipcMain.handle('portForward:getTemplatesByTag', async (_event, tag: string) => {
    try {
      await portForwardManager.initialize()
      const templates = portForwardManager.getTemplatesByTag(tag)
      return { success: true, data: templates }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 搜索模板
  ipcMain.handle('portForward:searchTemplates', async (_event, query: string) => {
    try {
      await portForwardManager.initialize()
      const templates = portForwardManager.searchTemplates(query)
      return { success: true, data: templates }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 从模板创建转发
  ipcMain.handle('portForward:createFromTemplate', async (_event, templateId: string, sessionId: string) => {
    try {
      await portForwardManager.initialize()
      const forward = await portForwardManager.createForwardFromTemplate(templateId, sessionId)
      return { success: true, data: forward }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 自动启动转发
  ipcMain.handle('portForward:autoStart', async (_event, sessionId: string, connectionId: string) => {
    try {
      await portForwardManager.initialize()
      const connection = sshConnectionManager.getConnection(connectionId)
      if (!connection) {
        return { success: false, error: 'Connection not found' }
      }

      await portForwardManager.autoStartForwards(sessionId, connectionId, connection.client)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}
