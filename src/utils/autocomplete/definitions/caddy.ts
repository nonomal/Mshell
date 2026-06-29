
import type { CommandDefinition } from '../types';

/**
 * caddy 命令 - Caddy Web 服务器
 */
const caddyCommand: CommandDefinition = {
    name: 'caddy',
    description: 'Caddy Web 服务器',
    options: [
        { text: 'run', type: 'subcommand', description: '运行服务器', priority: 100, usage: 'caddy run' },
        { text: 'start', type: 'subcommand', description: '后台启动', priority: 95, usage: 'caddy start' },
        { text: 'stop', type: 'subcommand', description: '停止服务器', priority: 90, usage: 'caddy stop' },
        { text: 'reload', type: 'subcommand', description: '重载配置', priority: 85, usage: 'caddy reload' },
        { text: 'validate', type: 'subcommand', description: '验证配置', priority: 80, usage: 'caddy validate' },
        { text: 'adapt', type: 'subcommand', description: '转换配置格式', priority: 75, usage: 'caddy adapt --config Caddyfile' },
        { text: 'reverse-proxy', type: 'subcommand', description: '快速反向代理', priority: 70, usage: 'caddy reverse-proxy --to localhost:8080' },
        { text: 'file-server', type: 'subcommand', description: '文件服务器', priority: 65, usage: 'caddy file-server --browse' },
        { text: 'fmt', type: 'subcommand', description: '格式化 Caddyfile', priority: 60, usage: 'caddy fmt --overwrite' },
        { text: 'version', type: 'subcommand', description: '显示版本', priority: 55 },
        { text: 'list-modules', type: 'subcommand', description: '列出模块', priority: 50 },
        { text: 'environ', type: 'subcommand', description: '打印环境变量', priority: 45 }
    ],
    subcommands: {
        'run': {
            name: 'run',
            description: '运行服务器',
            options: [
                { text: '--config', type: 'option', description: '指定配置文件', priority: 100, usage: '--config Caddyfile' },
                { text: '--adapter', type: 'option', description: '配置适配器', priority: 95, usage: '--adapter caddyfile' },
                { text: '--watch', type: 'option', description: '监听配置变化', priority: 90 },
                { text: '--environ', type: 'option', description: '打印环境变量', priority: 85 }
            ]
        },
        'start': {
            name: 'start',
            description: '后台启动',
            options: [
                { text: '--config', type: 'option', description: '指定配置文件', priority: 100 },
                { text: '--adapter', type: 'option', description: '配置适配器', priority: 95 },
                { text: '--watch', type: 'option', description: '监听配置变化', priority: 90 }
            ]
        },
        'reload': {
            name: 'reload',
            description: '重载配置',
            options: [
                { text: '--config', type: 'option', description: '指定配置文件', priority: 100 },
                { text: '--adapter', type: 'option', description: '配置适配器', priority: 95 },
                { text: '--force', type: 'option', description: '强制重载', priority: 90 }
            ]
        },
        'validate': {
            name: 'validate',
            description: '验证配置',
            options: [
                { text: '--config', type: 'option', description: '指定配置文件', priority: 100 },
                { text: '--adapter', type: 'option', description: '配置适配器', priority: 95 }
            ]
        },
        'reverse-proxy': {
            name: 'reverse-proxy',
            description: '反向代理',
            options: [
                { text: '--from', type: 'option', description: '监听地址', priority: 100, usage: '--from :80' },
                { text: '--to', type: 'option', description: '目标地址', priority: 95, usage: '--to localhost:8080' },
                { text: '--change-host-header', type: 'option', description: '修改 Host 头', priority: 90 }
            ]
        },
        'file-server': {
            name: 'file-server',
            description: '文件服务器',
            options: [
                { text: '--root', type: 'option', description: '根目录', priority: 100, usage: '--root /var/www' },
                { text: '--listen', type: 'option', description: '监听地址', priority: 95, usage: '--listen :8080' },
                { text: '--browse', type: 'option', description: '启用目录浏览', priority: 90 },
                { text: '--templates', type: 'option', description: '启用模板', priority: 85 }
            ]
        }
    }
};

export default caddyCommand;
