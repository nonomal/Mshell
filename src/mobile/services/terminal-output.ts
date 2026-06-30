export const stripTerminalControlSequences = (value: string): string =>
  value
    .replace(/\x1B\][\s\S]*?(?:\x07|\x1B\\)/g, '')
    .replace(/\x1B[P^_][\s\S]*?\x1B\\/g, '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1B[()][0-9A-Za-z]/g, '')
    .replace(/\x1B[@-_]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
