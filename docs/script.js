// ==================== 导航栏滚动效果 ====================
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.8)';
        navbar.style.boxShadow = 'none';
    }
});

// ==================== 移动端菜单切换 ====================
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// ==================== 平滑滚动 ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70; // 减去导航栏高度
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // 关闭移动端菜单
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        }
    });
});

// ==================== 滚动动画 ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// 观察所有需要动画的元素
document.querySelectorAll('.feature-card, .screenshot-item, .doc-card, .download-card').forEach(el => {
    observer.observe(el);
});

// ==================== 终端打字效果 ====================
const terminalCommands = [
    { prompt: '$', command: 'ssh user@server.com', output: 'Connected to server.com' },
    { prompt: '$', command: 'ls -la', output: '' },
    { prompt: '$', command: 'cd /var/www', output: '' },
    { prompt: '$', command: 'git pull origin main', output: 'Already up to date.' }
];

let currentCommandIndex = 0;
let currentCharIndex = 0;
let isTyping = false;

function typeCommand() {
    if (isTyping) return;
    
    const terminalBody = document.querySelector('.terminal-body');
    if (!terminalBody) return;
    
    isTyping = true;
    const command = terminalCommands[currentCommandIndex];
    
    // 清空终端
    terminalBody.innerHTML = '';
    
    // 创建新行
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = command.prompt;
    
    const commandSpan = document.createElement('span');
    commandSpan.className = 'command';
    
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    
    line.appendChild(prompt);
    line.appendChild(commandSpan);
    line.appendChild(cursor);
    terminalBody.appendChild(line);
    
    // 打字动画
    const typeInterval = setInterval(() => {
        if (currentCharIndex < command.command.length) {
            commandSpan.textContent += command.command[currentCharIndex];
            currentCharIndex++;
        } else {
            clearInterval(typeInterval);
            cursor.remove();
            
            // 显示输出
            if (command.output) {
                setTimeout(() => {
                    const outputLine = document.createElement('div');
                    outputLine.className = 'terminal-line';
                    const output = document.createElement('span');
                    output.className = 'output';
                    output.textContent = command.output;
                    outputLine.appendChild(output);
                    terminalBody.appendChild(outputLine);
                }, 500);
            }
            
            // 下一个命令
            setTimeout(() => {
                currentCommandIndex = (currentCommandIndex + 1) % terminalCommands.length;
                currentCharIndex = 0;
                isTyping = false;
                typeCommand();
            }, 3000);
        }
    }, 100);
}

// 启动打字效果
setTimeout(typeCommand, 1000);

// ==================== 统计数字动画 ====================
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ==================== 下载按钮点击统计 ====================
document.querySelectorAll('a[download]').forEach(link => {
    link.addEventListener('click', () => {
        // 这里可以添加下载统计逻辑
        console.log('Download started:', link.href);
        
        // 可以发送到分析服务
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download', {
                'event_category': 'Downloads',
                'event_label': 'MShell Installer'
            });
        }
    });
});

// ==================== 外部链接处理 ====================
document.querySelectorAll('a[target="_blank"]').forEach(link => {
    link.addEventListener('click', (e) => {
        // 添加 rel="noopener noreferrer" 以提高安全性
        if (!link.hasAttribute('rel')) {
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
});

// ==================== 图片懒加载 ====================
if ('loading' in HTMLImageElement.prototype) {
    // 浏览器支持原生懒加载
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src || img.src;
    });
} else {
    // 使用 Intersection Observer 实现懒加载
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ==================== 复制到剪贴板功能 ====================
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            textArea.remove();
            return Promise.resolve();
        } catch (error) {
            textArea.remove();
            return Promise.reject(error);
        }
    }
}

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K 打开快速搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // 这里可以实现搜索功能
        console.log('Quick search triggered');
    }
    
    // ESC 关闭移动端菜单
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    }
});

// ==================== 页面加载完成 ====================
window.addEventListener('load', () => {
    // 移除加载动画
    document.body.classList.add('loaded');
    
    // 记录页面加载时间
    if (window.performance) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log('Page load time:', pageLoadTime + 'ms');
    }
});

// ==================== 错误处理 ====================
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // 这里可以发送错误报告到服务器
});

// ==================== 性能监控 ====================
if ('PerformanceObserver' in window) {
    // 监控长任务
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            console.warn('Long task detected:', entry);
        }
    });
    observer.observe({ entryTypes: ['longtask'] });
}

// ==================== 主题切换（可选功能） ====================
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 恢复用户主题偏好
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// ==================== 控制台彩蛋 ====================
console.log('%c🚀 MShell', 'font-size: 24px; font-weight: bold; color: #0ea5e9;');
console.log('%c欢迎使用 MShell！', 'font-size: 14px; color: #6366f1;');
console.log('%c如果你对我们的项目感兴趣，欢迎访问 GitHub 贡献代码！', 'font-size: 12px; color: #64748b;');
console.log('%chttps://github.com/inspoaibox/Mshell', 'font-size: 12px; color: #0ea5e9; text-decoration: underline;');
