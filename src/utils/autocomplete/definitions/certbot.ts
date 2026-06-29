
import type { CommandDefinition } from '../types';

/**
 * certbot 命令 - Let's Encrypt 证书管理
 */
const certbotCommand: CommandDefinition = {
    name: 'certbot',
    description: "Let's Encrypt SSL 证书管理",
    options: [
        { text: 'certonly', type: 'subcommand', description: '仅获取证书', priority: 100, usage: 'certbot certonly --webroot -w /var/www -d example.com' },
        { text: 'install', type: 'subcommand', description: '安装证书', priority: 95 },
        { text: 'renew', type: 'subcommand', description: '续期证书', priority: 90, usage: 'certbot renew' },
        { text: 'certificates', type: 'subcommand', description: '列出证书', priority: 85 },
        { text: 'delete', type: 'subcommand', description: '删除证书', priority: 80 },
        { text: 'revoke', type: 'subcommand', description: '吊销证书', priority: 75 },
        { text: '--nginx', type: 'option', description: '使用 Nginx 插件', priority: 70 },
        { text: '--apache', type: 'option', description: '使用 Apache 插件', priority: 65 },
        { text: '--standalone', type: 'option', description: '独立模式', priority: 60 },
        { text: '--webroot', type: 'option', description: 'Webroot 模式', priority: 55, usage: '--webroot -w /var/www' },
        { text: '-d', type: 'option', description: '域名', priority: 50, usage: '-d example.com' },
        { text: '--dry-run', type: 'option', description: '测试运行', priority: 45 },
        { text: '--force-renewal', type: 'option', description: '强制续期', priority: 40 },
        { text: '--email', type: 'option', description: '邮箱地址', priority: 35, usage: '--email admin@example.com' },
        { text: '--agree-tos', type: 'option', description: '同意服务条款', priority: 30 },
        { text: '-n', type: 'option', description: '非交互模式', priority: 25 }
    ]
};

export default certbotCommand;
