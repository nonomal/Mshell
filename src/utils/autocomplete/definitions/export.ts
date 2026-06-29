
import type { CommandDefinition } from '../types';

/**
 * export 命令 - 设置环境变量
 */
const exportCommand: CommandDefinition = {
    name: 'export',
    description: '设置环境变量',
    options: [
        { text: 'PATH=', type: 'hint', description: '修改 PATH', priority: 90, usage: 'export PATH=$PATH:/new/path' },
        { text: 'NODE_ENV=', type: 'hint', description: 'Node 环境', priority: 85, usage: 'export NODE_ENV=production' },
        { text: 'LANG=', type: 'hint', description: '语言设置', priority: 80, usage: 'export LANG=C.UTF-8' },
        { text: 'HTTP_PROXY=', type: 'hint', description: 'HTTP 代理', priority: 75 },
        { text: 'HTTPS_PROXY=', type: 'hint', description: 'HTTPS 代理', priority: 70 }
    ]
};

export default exportCommand;
