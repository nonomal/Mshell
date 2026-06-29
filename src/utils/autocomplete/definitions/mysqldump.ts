
import type { CommandDefinition } from '../types';

/**
 * mysqldump 命令 - MySQL 数据库备份
 */
const mysqldumpCommand: CommandDefinition = {
    name: 'mysqldump',
    description: 'MySQL 数据库备份',
    options: [
        { text: '-u', type: 'option', description: '用户名', priority: 100, usage: '-u root' },
        { text: '-p', type: 'option', description: '密码', priority: 95 },
        { text: '-h', type: 'option', description: '主机地址', priority: 90, usage: '-h localhost' },
        { text: '-P', type: 'option', description: '端口', priority: 85 },
        { text: '--all-databases', type: 'option', description: '备份所有数据库', priority: 80 },
        { text: '--databases', type: 'option', description: '备份指定数据库', priority: 75, usage: '--databases db1 db2' },
        { text: '--single-transaction', type: 'option', description: '事务一致性备份', priority: 70 },
        { text: '--quick', type: 'option', description: '快速导出', priority: 65 },
        { text: '--lock-tables', type: 'option', description: '锁定表', priority: 60 },
        { text: '--no-data', type: 'option', description: '仅导出结构', priority: 55 },
        { text: '--routines', type: 'option', description: '包含存储过程', priority: 50 },
        { text: '--triggers', type: 'option', description: '包含触发器', priority: 45 },
        { text: '--events', type: 'option', description: '包含事件', priority: 40 },
        { text: '--add-drop-table', type: 'option', description: '添加 DROP TABLE', priority: 35 },
        { text: '--compress', type: 'option', description: '压缩传输', priority: 30 },
        { text: '--result-file', type: 'option', description: '输出文件', priority: 25, usage: '--result-file=backup.sql' }
    ]
};

export default mysqldumpCommand;
