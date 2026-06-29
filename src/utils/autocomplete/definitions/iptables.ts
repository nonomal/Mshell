
import type { CommandDefinition } from '../types';

/**
 * iptables 命令 - Linux 传统防火墙
 */
const iptablesCommand: CommandDefinition = {
    name: 'iptables',
    description: 'Linux iptables 防火墙',
    options: [
        { text: '-L', type: 'option', description: '列出所有规则', priority: 100, usage: 'iptables -L' },
        { text: '-F', type: 'option', description: '清空所有规则', priority: 95, usage: 'iptables -F' },
        { text: '-A', type: 'option', description: '追加规则', priority: 90, usage: 'iptables -A INPUT ...' },
        { text: '-D', type: 'option', description: '删除规则', priority: 85, usage: 'iptables -D INPUT 1' },
        { text: '-I', type: 'option', description: '插入规则', priority: 80, usage: 'iptables -I INPUT 1 ...' },
        { text: '-P', type: 'option', description: '设置默认策略', priority: 75, usage: 'iptables -P INPUT DROP' },
        { text: '-n', type: 'option', description: '数字格式显示', priority: 70 },
        { text: '-v', type: 'option', description: '详细输出', priority: 65 },
        { text: '--line-numbers', type: 'option', description: '显示行号', priority: 60 },
        { text: '-t', type: 'option', description: '指定表', priority: 55, usage: '-t nat' },
        { text: '-s', type: 'option', description: '源地址', priority: 50, usage: '-s 192.168.1.0/24' },
        { text: '-d', type: 'option', description: '目标地址', priority: 45 },
        { text: '-p', type: 'option', description: '协议', priority: 40, usage: '-p tcp' },
        { text: '--dport', type: 'option', description: '目标端口', priority: 35, usage: '--dport 80' },
        { text: '--sport', type: 'option', description: '源端口', priority: 30 },
        { text: '-j', type: 'option', description: '动作', priority: 25, usage: '-j ACCEPT' },
        { text: '-i', type: 'option', description: '入接口', priority: 20, usage: '-i eth0' },
        { text: '-o', type: 'option', description: '出接口', priority: 15 },
        { text: '-m', type: 'option', description: '匹配模块', priority: 10, usage: '-m state --state NEW' }
    ]
};

export default iptablesCommand;
