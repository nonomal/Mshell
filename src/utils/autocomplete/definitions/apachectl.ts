
import type { CommandDefinition } from '../types';

/**
 * apache2ctl / apachectl 命令 - Apache Web 服务器控制
 */
const apachectl: CommandDefinition = {
    name: 'apachectl',
    description: 'Apache Web 服务器控制',
    options: [
        { text: 'start', type: 'subcommand', description: '启动 Apache', priority: 100 },
        { text: 'stop', type: 'subcommand', description: '停止 Apache', priority: 95 },
        { text: 'restart', type: 'subcommand', description: '重启 Apache', priority: 90 },
        { text: 'graceful', type: 'subcommand', description: '优雅重启', priority: 85 },
        { text: 'graceful-stop', type: 'subcommand', description: '优雅停止', priority: 80 },
        { text: 'configtest', type: 'subcommand', description: '测试配置', priority: 75 },
        { text: 'status', type: 'subcommand', description: '查看状态', priority: 70 },
        { text: 'fullstatus', type: 'subcommand', description: '详细状态', priority: 65 },
        { text: '-v', type: 'option', description: '显示版本', priority: 60 },
        { text: '-V', type: 'option', description: '显示编译参数', priority: 55 },
        { text: '-t', type: 'option', description: '测试配置', priority: 50 },
        { text: '-S', type: 'option', description: '显示虚拟主机设置', priority: 45 },
        { text: '-M', type: 'option', description: '显示已加载模块', priority: 40 }
    ]
};

export default apachectl;
