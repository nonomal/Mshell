
import type { CommandDefinition } from '../types';

/**
 * iptables-save 命令 - 保存 iptables 规则
 */
const iptablesSaveCommand: CommandDefinition = {
    name: 'iptables-save',
    description: '保存 iptables 规则',
    options: [
        { text: '-t', type: 'option', description: '指定表', priority: 90, usage: 'iptables-save -t filter' },
        { text: '-c', type: 'option', description: '包含计数器', priority: 85 }
    ]
};

export default iptablesSaveCommand;
