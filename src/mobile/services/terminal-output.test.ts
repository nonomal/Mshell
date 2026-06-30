import { describe, expect, it } from 'vitest'
import { stripTerminalControlSequences } from './terminal-output'

describe('stripTerminalControlSequences', () => {
  it('removes bracketed paste and cursor control sequences from text output', () => {
    const output = '\x1b[?2004hroot@host:~# ls\r\n\x1b[?2004l'

    expect(stripTerminalControlSequences(output)).toBe('root@host:~# ls\n')
  })

  it('removes clear-screen and color sequences without dropping unicode text', () => {
    const output = '\x1b[H\x1b[2J\x1b[37m\x1b[40m手机软件  \x1b[32m系统镜像\x1b[0m\r\n'

    expect(stripTerminalControlSequences(output)).toBe('手机软件  系统镜像\n')
  })
})
