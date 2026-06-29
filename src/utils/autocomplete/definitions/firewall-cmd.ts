
import type { CommandDefinition } from '../types';

/**
 * firewall-cmd 命令 - FirewallD (CentOS/RHEL/Fedora)
 */
const firewallCmdCommand: CommandDefinition = {
    name: 'firewall-cmd',
    description: 'FirewallD 防火墙管理',
    options: [
        { text: '--state', type: 'option', description: '查看运行状态', priority: 100 },
        { text: '--reload', type: 'option', description: '重载配置', priority: 95 },
        { text: '--list-all', type: 'option', description: '列出所有规则', priority: 90 },
        { text: '--list-ports', type: 'option', description: '列出开放端口', priority: 85 },
        { text: '--list-services', type: 'option', description: '列出开放服务', priority: 80 },
        { text: '--add-port', type: 'option', description: '添加端口', priority: 75, usage: '--add-port=8080/tcp' },
        { text: '--remove-port', type: 'option', description: '移除端口', priority: 70, usage: '--remove-port=8080/tcp' },
        { text: '--add-service', type: 'option', description: '添加服务', priority: 65, usage: '--add-service=http' },
        { text: '--remove-service', type: 'option', description: '移除服务', priority: 60, usage: '--remove-service=http' },
        { text: '--permanent', type: 'option', description: '永久生效', priority: 55 },
        { text: '--zone', type: 'option', description: '指定区域', priority: 50, usage: '--zone=public' },
        { text: '--get-zones', type: 'option', description: '获取所有区域', priority: 45 },
        { text: '--get-default-zone', type: 'option', description: '获取默认区域', priority: 40 },
        { text: '--set-default-zone', type: 'option', description: '设置默认区域', priority: 35, usage: '--set-default-zone=public' },
        { text: '--add-rich-rule', type: 'option', description: '添加富规则', priority: 30 },
        { text: '--query-port', type: 'option', description: '查询端口', priority: 25, usage: '--query-port=80/tcp' },
        { text: '--get-services', type: 'option', description: '获取可用服务列表', priority: 20 }
    ]
};

export default firewallCmdCommand;
