export type TerminalBackgroundSource = 'local' | 'url'
export type TerminalBackgroundFit = 'cover' | 'contain' | 'stretch'

export interface TerminalBackgroundConfig {
  enabled?: boolean
  source?: TerminalBackgroundSource
  image?: string
  opacity?: number
  fit?: TerminalBackgroundFit
  fileName?: string
}

export const DEFAULT_TERMINAL_BACKGROUND: Required<
  Pick<TerminalBackgroundConfig, 'enabled' | 'source' | 'image' | 'opacity' | 'fit'>
> = {
  enabled: false,
  source: 'url',
  image: '',
  opacity: 18,
  fit: 'cover'
}

export function normalizeTerminalBackground(
  background?: TerminalBackgroundConfig | null
): TerminalBackgroundConfig {
  return {
    ...DEFAULT_TERMINAL_BACKGROUND,
    ...(background || {}),
    opacity:
      typeof background?.opacity === 'number'
        ? Math.min(100, Math.max(0, background.opacity))
        : DEFAULT_TERMINAL_BACKGROUND.opacity
  }
}

export function hasActiveTerminalBackground(background?: TerminalBackgroundConfig | null): boolean {
  const normalized = normalizeTerminalBackground(background)
  return normalized.enabled === true && !!normalized.image
}

export function isLocalTerminalBackground(background?: TerminalBackgroundConfig | null): boolean {
  const image = background?.image || ''
  if (!image) return false

  return (
    background?.source === 'local' ||
    /^mshell-terminal-background:/i.test(image) ||
    /^file:/i.test(image) ||
    /^[a-zA-Z]:[\\/]/.test(image) ||
    /^\\\\/.test(image) ||
    /^\//.test(image)
  )
}
