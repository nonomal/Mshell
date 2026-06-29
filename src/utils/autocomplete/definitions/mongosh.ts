
import type { CommandDefinition } from '../types';

/**
 * mongosh 命令 - MongoDB Shell
 */
const mongoshCommand: CommandDefinition = {
    name: 'mongosh',
    description: 'MongoDB Shell',
    options: [
        { text: '--host', type: 'option', description: '主机地址', priority: 100, usage: '--host localhost' },
        { text: '--port', type: 'option', description: '端口', priority: 95, usage: '--port 27017' },
        { text: '-u', type: 'option', description: '用户名', priority: 90, usage: '-u admin' },
        { text: '-p', type: 'option', description: '密码', priority: 85 },
        { text: '--authenticationDatabase', type: 'option', description: '认证数据库', priority: 80, usage: '--authenticationDatabase admin' },
        { text: '--eval', type: 'option', description: '执行 JavaScript', priority: 75, usage: '--eval "db.users.find()"' },
        { text: '--file', type: 'option', description: '执行脚本文件', priority: 70 },
        { text: '--quiet', type: 'option', description: '静默模式', priority: 65 },
        { text: '--shell', type: 'option', description: '强制进入 Shell', priority: 60 },
        { text: '--nodb', type: 'option', description: '不连接数据库', priority: 55 }
    ]
};

export default mongoshCommand;
