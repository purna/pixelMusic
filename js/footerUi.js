/* Footer panel toggle and credits / node guide dialog */
(function () {
    'use strict';

    const STORAGE_KEY = 'pixelMusic.footerHidden';

    function setupFooterToggle() {
        const footer = document.getElementById('strudel-footer-panel');
        const toggle = document.getElementById('footer-toggle');
        if (!footer || !toggle) return;

        const icon = toggle.querySelector('i');
        const label = toggle.querySelector('span');

        function render(hidden) {
            footer.classList.toggle('collapsed', hidden);
            toggle.setAttribute('aria-expanded', String(!hidden));
            toggle.setAttribute('title', hidden ? 'Show pattern generator' : 'Hide pattern generator');
            if (icon) icon.className = hidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            if (label) label.textContent = hidden ? 'Show panel' : 'Hide panel';
        }

        let hidden = false;
        try {
            hidden = localStorage.getItem(STORAGE_KEY) === 'true';
        } catch (err) {
            hidden = false;
        }
        render(hidden);

        toggle.addEventListener('click', () => {
            hidden = !footer.classList.contains('collapsed');
            render(hidden);
            try {
                localStorage.setItem(STORAGE_KEY, String(hidden));
            } catch (err) {
                /* Storage may be unavailable in private mode. */
            }
            // Give the canvas its new height back once the collapse transition ends.
            window.setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        });
    }

    function setupCreditsDialog() {
        const modal = document.getElementById('credits-modal');
        const openBtn = document.getElementById('credits-open');
        const closeBtn = document.getElementById('credits-close');
        if (!modal || !openBtn) return;

        let lastFocus = null;

        function open() {
            lastFocus = document.activeElement;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            if (closeBtn) closeBtn.focus();
        }

        function close() {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        openBtn.addEventListener('click', open);
        if (closeBtn) closeBtn.addEventListener('click', close);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) close();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('open')) close();
        });

        modal.setAttribute('aria-hidden', 'true');
    }

    function init() {
        setupFooterToggle();
        setupCreditsDialog();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
