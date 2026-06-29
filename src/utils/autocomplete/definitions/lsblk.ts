
import type { CommandDefinition } from '../types';

/**
 * lsblk 命令 - 列出块设备
 */
const lsblkCommand: CommandDefinition = {
    name: 'lsblk',
    description: '列出块设备信息',
    options: [
        { text: '-a', type: 'option', description: '显示所有设备', priority: 100 },
        { text: '-f', type: 'option', description: '显示文件系统信息', priority: 95 },
        { text: '-m', type: 'option', description: '显示权限信息', priority: 90 },
        { text: '-o', type: 'option', description: '指定输出列', priority: 85, usage: '-o NAME,SIZE,FSTYPE,MOUNTPOINT' },
        { text: '-p', type: 'option', description: '显示完整路径', priority: 80 },
        { text: '-l', type: 'option', description: '列表格式', priority: 75 },
        { text: '-J', type: 'option', description: 'JSON 格式输出', priority: 70 },
        { text: '-d', type: 'option', description: '仅显示磁盘', priority: 65 },
        { text: '-n', type: 'option', description: '不显示标题', priority: 60 },
        { text: '-r', type: 'option', description: '原始输出', priority: 55 }
    ]
};

export default lsblkCommand;
