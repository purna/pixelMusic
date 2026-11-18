/**
 * appWiring.js
 * Wires the UI that had no owner after the legacy layer/timeline app was removed:
 *
 * - Settings modal open/close/tabs (the AI provider panel injects itself there)
 * - "Build Nodes" action for the pattern input (typing no longer wipes the canvas)
 * - window.PixelAIApply_pixelMusic adapter used by the AI Create panel
 */

(() => {
    const SETTINGS_KEY = 'pixelmusic:settings:v1';

    /* ------------------------------------------------------------------ *
     * Settings modal
     * ------------------------------------------------------------------ */

    /**
     * Settings become an audible master chain on the final pattern. The rule
     * (single methods plus paired vibrato/tremolo calls) lives in
     * settingsCodegen.js so it can be tested without a DOM.
     */
    const GRID_SIZES = { '2x2': 80, '4x4': 40, '8x8': 20 };

    /** Markup defaults, so unchanged controls stay out of the generated code. */
    let defaults = {};

    function readSettings(modal) {
        const values = {};
        modal.querySelectorAll('input[type="range"], select').forEach(control => {
            if (!control.id) return;
            const value = control.type === 'range' ? Number(control.value) : control.value;
            values[control.id] = value;
        });
        return values;
    }

    function captureDefaults(modal) {
        defaults = {};
        modal.querySelectorAll('input[type="range"]').forEach(control => {
            if (!control.id) return;
            defaults[control.id] = Number(control.getAttribute('value'));
        });
    }

    /** Master effects chain from settings, e.g. ".gain(0.8).room(0.3)". */
    function masterChain(settings = window.pixelMusicSettings) {
        return window.SettingsCodegen?.masterChain(settings, defaults) || '';
    }

    /** `setcpm(...)` directive for the configured tempo, or '' at the default. */
    function tempoDirective(settings = window.pixelMusicSettings) {
        return window.SettingsCodegen?.tempoDirective(settings, defaults) || '';
    }

    function applyGridSize(settings = window.pixelMusicSettings) {
        const size = GRID_SIZES[settings?.gridSize];
        const canvas = document.getElementById('canvas-content');
        if (!canvas || !size) return;
        canvas.style.setProperty('--canvas-grid-size', `${size}px`);
    }

    function readSettings(modal) {
        const values = {};
        modal.querySelectorAll('input[type="range"], select').forEach(control => {
            if (!control.id) return;
            const value = control.type === 'range' ? Number(control.value) : control.value;
            values[control.id] = value;
        });
        return values;
    }

    function applySettings(modal, values) {
        if (!values) return;
        Object.entries(values).forEach(([id, value]) => {
            const control = modal.querySelector(`#${CSS.escape(id)}`);
            if (!control) return;
            control.value = value;
            syncRangeLabel(control);
        });
    }

    function syncRangeLabel(control) {
        if (control.type !== 'range') return;
        const labelId = control.id.replace(/^settings-/, '') + '-value';
        const label = document.getElementById(labelId);
        if (!label) return;
        // Probability sliders (0..1) display as percentages.
        const isPercent = label.textContent.trim().endsWith('%');
        label.textContent = isPercent
            ? `${Math.round(Number(control.value) * 100)}%`
            : control.value;
    }

    function initSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const openBtn = document.getElementById('settingsBtn');
        if (!modal) return;

        captureDefaults(modal);

        // Restore saved settings before the first pattern is generated.
        try {
            const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
            if (stored) {
                applySettings(modal, stored);
                window.pixelMusicSettings = readSettings(modal);
            }
        } catch (error) {
            console.warn('Could not read saved settings:', error);
        }
        applyGridSize();

        const open = () => {
            applySettings(modal, window.pixelMusicSettings);
            modal.classList.add('open');
        };
        const close = () => modal.classList.remove('open');

        if (openBtn) openBtn.addEventListener('click', open);

        modal.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', close));
        modal.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && modal.classList.contains('open')) close();
        });

        // Tab switching (the AI provider adds its own tab handler on top of this).
        modal.querySelectorAll('.settings-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.settings-tab').forEach(item => {
                    item.classList.toggle('active', item === tab);
                });
                modal.querySelectorAll('.settings-tab-content').forEach(panel => {
                    panel.classList.toggle('active', panel.dataset.tabContent === tab.dataset.tab);
                });
            });
        });

        // Live labels for the sliders.
        modal.querySelectorAll('input[type="range"]').forEach(control => {
            control.addEventListener('input', () => syncRangeLabel(control));
        });

        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const values = readSettings(modal);
                window.pixelMusicSettings = values;
                try {
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
                } catch (error) {
                    console.warn('Could not save settings:', error);
                }

                applyGridSize(values);
                document.dispatchEvent(new CustomEvent('pixelmusic:settings-saved', { detail: values }));

                // Settings are part of the generated code, so refresh it.
                window.nodeManager?.updateStrudelOutput?.();
                window.nodeManager?.updateStatus?.('Settings applied');
                close();
            });
        }

        // Releasing a slider applies it immediately, without closing the modal.
        modal.querySelectorAll('input[type="range"]').forEach(control => {
            control.addEventListener('change', () => {
                const values = readSettings(modal);
                window.pixelMusicSettings = values;
                applyGridSize(values);
                window.nodeManager?.updateStrudelOutput?.();
            });
        });
    }

    /* ------------------------------------------------------------------ *
     * Settings -> generated code
     * ------------------------------------------------------------------ */

    function initSettingsCodegen() {
        // NodeManager composes these into the playable pattern.
        window.pixelMusicMasterChain = () => masterChain();
        window.pixelMusicTempo = () => tempoDirective();
    }

    /* ------------------------------------------------------------------ *
     * Pattern input -> nodes
     * ------------------------------------------------------------------ */

    function initPatternImport() {
        const input = document.getElementById('strudel-example-input');
        const buildBtn = document.getElementById('build-nodes-from-pattern');
        if (!input || !buildBtn) return;

        const build = () => {
            const pattern = input.value.trim();
            const manager = window.nodeManager;
            if (!pattern || !manager?.patternGenerator) return;

            const hasNodes = manager.factory.nodes.length > 0;
            if (hasNodes && !window.confirm('Replace the current nodes with nodes built from this pattern?')) {
                return;
            }

            manager.patternGenerator.parseAndCreateNodes(pattern);
        };

        buildBtn.addEventListener('click', build);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                build();
            }
        });
    }

    /* ------------------------------------------------------------------ *
     * AI Create adapter
     * ------------------------------------------------------------------ */

    function initAiAdapter() {
        window.PixelAIApply_pixelMusic = (result) => {
            const pattern = typeof result === 'string' ? result : result?.pattern;
            if (typeof pattern !== 'string' || !pattern.trim()) {
                throw new Error('The AI result did not include a Strudel pattern.');
            }

            const manager = window.nodeManager;
            const input = document.getElementById('strudel-example-input');
            if (!input || !manager?.patternGenerator) {
                throw new Error('The node editor is still loading. Try again in a moment.');
            }

            const value = pattern.trim();
            input.value = value;

            // Build nodes right away when the canvas is empty; otherwise leave the
            // pattern in the input so the existing graph is not destroyed silently.
            if (manager.factory.nodes.length === 0) {
                manager.patternGenerator.parseAndCreateNodes(value);
                manager.updateStatus?.('AI pattern applied');
            } else {
                manager.updateStatus?.('AI pattern is ready — press "Build Nodes" to replace the current nodes');
            }
        };
    }

    function init() {
        initSettingsModal();
        initSettingsCodegen();
        initPatternImport();
        initAiAdapter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
