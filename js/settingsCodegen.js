/**
 * settingsCodegen.js
 * Turns the settings modal's values into Strudel code.
 *
 * - Single-value controls become a chained call, e.g. `.gain(0.5)`.
 * - Paired controls (vibrato/tremolo rate + depth) become one call with both
 *   arguments, e.g. `.vibrato(8, 0.05)`, because neither half is a method on
 *   its own.
 *
 * Values equal to their markup defaults are omitted, so an untouched settings
 * panel adds nothing to the generated pattern. Pure functions with no DOM
 * access, so the Node smoke test can cover them.
 */
const SettingsCodegen = (() => {
    /** Single-value settings: control id -> Strudel method. */
    const METHODS = {
        'settings-gain': 'gain',
        'settings-pan': 'pan',
        'settings-attack': 'attack',
        'settings-decay': 'decay',
        'settings-sustain': 'sustain',
        'settings-release': 'release',
        'settings-lpf': 'lpf',
        'settings-hpf': 'hpf',
        'settings-bpf': 'bpf',
        'settings-lpq': 'lpq',
        'settings-delay': 'delay',
        'settings-delayfb': 'delayfb',
        'settings-delayt': 'delaytime',
        'settings-reverb': 'reverb',
        'settings-room': 'room',
        'settings-distort': 'distort',
        'settings-crush': 'crush',
        'settings-shape': 'shape',
        'settings-speed': 'speed',
        'settings-chop': 'chop',
        'settings-stutter': 'stutter',
        'settings-trunc': 'trunc'
    };

    /** Paired settings: one method, two arguments. */
    const PAIRS = [
        { method: 'vibrato', rate: 'settings-vibrato', depth: 'settings-vibdepth' },
        { method: 'tremolo', rate: 'settings-tremolo', depth: 'settings-tremdepth' }
    ];

    const numberOrNull = (value) => {
        if (value === undefined || value === null || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    };

    const changed = (value, defaults, id) => value !== null && value !== defaults[id];

    /** Master effects chain from settings, e.g. ".gain(0.8).vibrato(8, 0.05)". */
    function masterChain(settings, defaults = {}) {
        if (!settings) return '';

        let chain = Object.entries(METHODS).reduce((result, [id, method]) => {
            const value = numberOrNull(settings[id]);
            if (!changed(value, defaults, id)) return result;
            return `${result}.${method}(${value})`;
        }, '');

        PAIRS.forEach(({ method, rate, depth }) => {
            const rateValue = numberOrNull(settings[rate]);
            const depthValue = numberOrNull(settings[depth]);
            if (!changed(rateValue, defaults, rate) && !changed(depthValue, defaults, depth)) return;

            const finalRate = rateValue ?? numberOrNull(defaults[rate]);
            const finalDepth = depthValue ?? numberOrNull(defaults[depth]);
            if (finalRate === null || finalDepth === null) return;

            chain += `.${method}(${finalRate}, ${finalDepth})`;
        });

        return chain;
    }

    /** `setcpm(...)` directive for the configured tempo, or '' at the default. */
    function tempoDirective(settings, defaults = {}) {
        const bpm = numberOrNull(settings?.bpm);
        if (bpm === null || bpm <= 0) return '';
        if (bpm === defaults.bpm) return '';
        return `setcpm(${bpm / 4})`;
    }

    return { masterChain, tempoDirective };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsCodegen };
}

if (typeof window !== 'undefined') {
    window.SettingsCodegen = SettingsCodegen;
}
