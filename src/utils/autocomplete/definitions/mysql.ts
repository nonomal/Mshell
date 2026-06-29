
import type { CommandDefinition } from '../types';

/**
 * mysql 命令 - MySQL 客户端
 */
const mysqlCommand: CommandDefinition = {
    name: 'mysql',
    description: 'MySQL 数据库客户端',
    options: [
        { text: '-u', type: 'option', description: '用户名', priority: 100, usage: '-u root' },
        { text: '-p', type: 'option', description: '密码', priority: 95, usage: '-p' },
        { text: '-h', type: 'option', description: '主机地址', priority: 90, usage: '-h localhost' },
        { text: '-P', type: 'option', description: '端口', priority: 85, usage: '-P 3306' },
        { text: '-D', type: 'option', description: '数据库名', priority: 80, usage: '-D mydb' },
        { text: '-e', type: 'option', description: '执行 SQL', priority: 75, usage: '-e "SELECT * FROM users"' },
        { text: '-N', type: 'option', description: '不显示列名', priority: 70 },
        { text: '-B', type: 'option', description: '批处理模式', priority: 65 },
        { text: '--default-character-set', type: 'option', description: '字符集', priority: 60, usage: '--default-character-set=utf8mb4' },
        { text: '-S', type: 'option', description: 'Socket 文件', priority: 55 },
        { text: '--ssl', type: 'option', description: '启用 SSL', priority: 50 },
        { text: '-v', type: 'option', description: '详细输出', priority: 45 }
    ]
};

export default mysqlCommand;
