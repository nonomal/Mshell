
import type { CommandDefinition } from '../types';

/**
 * nginx 命令 - Nginx Web 服务器
 */
const nginxCommand: CommandDefinition = {
    name: 'nginx',
    description: 'Nginx Web 服务器',
    options: [
        { text: '-t', type: 'option', description: '测试配置文件', priority: 100, usage: 'nginx -t' },
        { text: '-T', type: 'option', description: '测试并打印配置', priority: 95 },
        { text: '-s', type: 'option', description: '发送信号', priority: 90, usage: 'nginx -s reload' },
        { text: '-c', type: 'option', description: '指定配置文件', priority: 85, usage: 'nginx -c /path/to/nginx.conf' },
        { text: '-g', type: 'option', description: '设置全局指令', priority: 80 },
        { text: '-p', type: 'option', description: '指定前缀路径', priority: 75 },
        { text: '-v', type: 'option', description: '显示版本', priority: 70 },
        { text: '-V', type: 'option', description: '显示版本和编译参数', priority: 65 }
    ],
    subcommands: {
        '-s': {
            name: '-s',
            description: '发送信号',
            options: [
                { text: 'reload', type: 'hint', description: '重新加载配置', priority: 100 },
                { text: 'stop', type: 'hint', description: '快速停止', priority: 95 },
                { text: 'quit', type: 'hint', description: '优雅停止', priority: 90 },
                { text: 'reopen', type: 'hint', description: '重新打开日志', priority: 85 }
            ]
        }
    }
};

export default nginxCommand;
