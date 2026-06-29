
import type { CommandDefinition } from '../types';

/**
 * pwd 命令 - 显示当前目录
 */
const pwdCommand: CommandDefinition = {
    name: 'pwd',
    description: '显示当前工作目录',
    options: [
        { text: '-L', type: 'option', description: '显示逻辑路径（含符号链接）', priority: 90 },
        { text: '-P', type: 'option', description: '显示物理路径', priority: 85 }
    ]
};

export default pwdCommand;
