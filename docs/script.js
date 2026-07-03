(() => {
    const header = document.querySelector('.site-header');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    const setHeaderState = () => {
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('is-open');
            navToggle.classList.toggle('is-active', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('is-open');
                navToggle.classList.remove('is-active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', event => {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            const offset = header ? header.offsetHeight + 12 : 0;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    document.querySelectorAll('a[target="_blank"]').forEach(link => {
        link.setAttribute('rel', 'noopener noreferrer');
    });

    const commandNode = document.querySelector('.js-terminal-command');
    const commands = [
        'ssh root@203.0.113.12',
        'bash ~/.mshell/scripts/change-ssh-port.sh',
        'rsync -av ./dist/ root@server:/var/www/app',
        'docker compose ps',
        'tail -f /var/log/auth.log'
    ];

    let commandIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tickTerminal = () => {
        if (!commandNode) return;

        const command = commands[commandIndex];
        if (deleting) {
            charIndex -= 1;
        } else {
            charIndex += 1;
        }

        commandNode.textContent = command.slice(0, Math.max(0, charIndex));

        let delay = deleting ? 36 : 72;

        if (!deleting && charIndex >= command.length) {
            deleting = true;
            delay = 1500;
        }

        if (deleting && charIndex <= 0) {
            deleting = false;
            commandIndex = (commandIndex + 1) % commands.length;
            delay = 260;
        }

        window.setTimeout(tickTerminal, delay);
    };

    if (commandNode) {
        window.setTimeout(tickTerminal, 900);
    }

    const revealTargets = document.querySelectorAll(
        '.feature-card, .workflow-item, .script-panel, .sync-card, .client-card, .screenshot-card, .download-card, .quickstart article'
    );

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        revealTargets.forEach(target => {
            target.classList.add('reveal');
            observer.observe(target);
        });
    } else {
        revealTargets.forEach(target => target.classList.add('is-visible'));
    }

    const dialog = document.querySelector('.image-dialog');
    const dialogImage = dialog?.querySelector('img');
    const dialogText = dialog?.querySelector('p');
    const closeDialog = dialog?.querySelector('.dialog-close');

    const closePreview = () => {
        if (!dialog) return;
        if (typeof dialog.close === 'function') {
            dialog.close();
        } else {
            dialog.removeAttribute('open');
        }
    };

    document.querySelectorAll('.screenshot-card').forEach(card => {
        card.addEventListener('click', () => {
            const image = card.querySelector('img');
            const caption = card.querySelector('figcaption');
            if (!dialog || !dialogImage || !image) return;

            dialogImage.src = image.currentSrc || image.src;
            dialogImage.alt = image.alt || '';
            if (dialogText) {
                dialogText.textContent = caption?.textContent || image.alt || '产品截图';
            }

            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }
        });
    });

    closeDialog?.addEventListener('click', closePreview);
    dialog?.addEventListener('click', event => {
        if (event.target === dialog) closePreview();
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closePreview();
            if (navLinks && navToggle) {
                navLinks.classList.remove('is-open');
                navToggle.classList.remove('is-active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
})();
