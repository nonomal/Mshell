export const isPermissionDeniedError = (message?: string): boolean => {
  if (!message) return false
  return /permission denied|eacces|access denied|权限/i.test(message)
}

export const formatSftpOperationError = (
  action: string,
  error?: string,
  targetPath?: string
): string => {
  const raw = error || '未知错误'
  const target = targetPath ? `「${targetPath}」` : '目标路径'

  if (isPermissionDeniedError(raw)) {
    return `${action}失败：当前 SFTP 登录用户没有权限操作 ${target}。终端内 su/sudo 切换 root 不会改变文件管理的 SFTP 身份；请使用具备权限的账号重新连接，或在终端中执行 sudo/chown/chmod。原始错误：${raw}`
  }

  return `${action}失败：${raw}`
}
