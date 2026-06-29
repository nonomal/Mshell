
import type { CommandDefinition } from '../types';

/**
 * redis-cli 命令 - Redis 客户端
 */
const redisCliCommand: CommandDefinition = {
    name: 'redis-cli',
    description: 'Redis 数据库客户端',
    options: [
        { text: '-h', type: 'option', description: '主机地址', priority: 100, usage: '-h 127.0.0.1' },
        { text: '-p', type: 'option', description: '端口', priority: 95, usage: '-p 6379' },
        { text: '-a', type: 'option', description: '密码', priority: 90, usage: '-a password' },
        { text: '-n', type: 'option', description: '数据库编号', priority: 85, usage: '-n 0' },
        { text: '-c', type: 'option', description: '集群模式', priority: 80 },
        { text: '--scan', type: 'option', description: '扫描键', priority: 75 },
        { text: '--pattern', type: 'option', description: '匹配模式', priority: 70, usage: '--pattern "user:*"' },
        { text: '--bigkeys', type: 'option', description: '查找大键', priority: 65 },
        { text: '--stat', type: 'option', description: '实时统计', priority: 60 },
        { text: '--latency', type: 'option', description: '延迟测试', priority: 55 },
        { text: '--raw', type: 'option', description: '原始输出', priority: 50 },
        { text: '--no-raw', type: 'option', description: '格式化输出', priority: 45 },
        { text: '-x', type: 'option', description: '从标准输入读取', priority: 40 },
        { text: '--rdb', type: 'option', description: '导出 RDB', priority: 35, usage: '--rdb dump.rdb' }
    ]
};

export default redisCliCommand;
