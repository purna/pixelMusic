/**
 * sampleTunes.js
 * Ready-made graphs for the "Sample Tune" button.
 *
 * Each tune is a builder rather than a saved JSON file, so the nodes are created
 * through the same NodeManager API the palette uses and can never drift out of
 * sync with the schema.
 */

(() => {
    const DRUM_BANK = 'RolandTR909';

    /** Small helper: create a node and set its Strudel properties in one go. */
    function add(manager, type, instrument, x, y, properties = {}) {
        const node = manager.createNode(type, instrument, x, y);
        if (node) {
            node.properties.strudelProperties = {
                ...(node.properties.strudelProperties || {}),
                ...properties
            };
        }
        return node;
    }

    function connect(manager, source, target, targetPort = 'input') {
        if (!source || !target) return;
        manager.createConnection(source.id, 'output', target.id, targetPort);
    }

    const tunes = [
        {
            id: 'four-on-the-floor',
            name: 'Four on the Floor',
            description: '909 kick with doubled hats',
            build(manager) {
                const kick = add(manager, 'DrumSymbol', 'bd', 120, 140, { symbol: 'bd', bank: DRUM_BANK });
                const hat = add(manager, 'DrumSymbol', 'hh', 120, 340, { symbol: 'hh', bank: DRUM_BANK });
                const doubleHat = add(manager, 'Repeater', '*', 430, 340, { amount: 2 });
                connect(manager, hat, doubleHat);
            }
        },
        {
            id: 'deep-house',
            name: 'Deep House',
            description: 'Filtered saw stab over a kick',
            build(manager) {
                const kick = add(manager, 'DrumSymbol', 'bd', 120, 140, { symbol: 'bd', bank: DRUM_BANK });
                const stab = add(manager, 'Instrument', 'sawtooth', 120, 340, { sound: 'sawtooth' });
                const filter = add(manager, 'Effect', 'lpf', 430, 340, { frequency: 900 });
                connect(manager, stab, filter);
            }
        },
        {
            id: 'sometimes-break',
            name: 'Sometimes Break',
            description: 'Kick plus hats that only sometimes play',
            build(manager) {
                const kick = add(manager, 'DrumSymbol', 'sd', 120, 140, { symbol: 'sd', bank: DRUM_BANK });
                const hats = add(manager, 'DrumSymbol', 'hh', 120, 340, { symbol: 'hh', bank: DRUM_BANK });
                const maybe = add(manager, 'Chance', 'sometimes', 430, 340, { probability: 0.6 });
                connect(manager, hats, maybe);
            }
        }
    ];

    let nextIndex = 0;

    /** Loads the next sample tune onto the canvas. */
    function addSampleTune(manager = window.nodeManager) {
        if (!manager) throw new Error('The node editor is not ready yet.');

        const hasNodes = manager.factory?.nodes?.length > 0;
        if (hasNodes && !window.confirm('Replace the current nodes with a sample tune?')) {
            return null;
        }

        const tune = tunes[nextIndex % tunes.length];
        nextIndex += 1;

        manager.clearAllNodes();
        manager.connections?.clearAllConnections?.();
        tune.build(manager);
        manager.updateStrudelOutput?.();
        manager.updateStatus?.(`Loaded sample tune: ${tune.name}`);
        return tune;
    }

    window.SampleTunes = { tunes, addSampleTune };

    function init() {
        const button = document.getElementById('load-sample-tune');
        if (!button) return;
        button.addEventListener('click', () => {
            try {
                addSampleTune();
            } catch (error) {
                console.error('Could not load sample tune:', error);
                window.nodeManager?.updateStatus?.(`Sample tune failed: ${error.message}`);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
