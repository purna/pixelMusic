/**
 * NodeAudio.js
 * Handles audio playback and Strudel integration.
 *
 * Pattern generation lives in exactly one place (StrudelPatternGenerator), so
 * playback always matches the code shown in the Strudel output field.
 */
class NodeAudio {
    constructor(manager) {
        this.manager = manager;
        this.audioInitialized = false;
        this.strudelInitialized = false;
        this.currentPattern = '';
    }

    /** Strudel's @strudel/web globals, accessed safely. */
    get strudel() {
        const global = typeof window !== 'undefined' ? window : {};
        const lib = global.Strudel || global.strudel || null;
        const method = (name) => {
            if (typeof global[name] === 'function') return global[name];
            if (typeof lib?.[name] === 'function') return lib[name].bind(lib);
            return null;
        };
        return { evaluate: method('evaluate'), hush: method('hush') };
    }

    async initializeAudio() {
        try {
            this.manager.updateStatus('Initializing audio...');

            // Browsers only allow audio after a user gesture.
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                const audioContext = new AudioContextClass();
                if (audioContext.state === 'suspended') await audioContext.resume();
                audioContext.close();
            }

            if (!this.strudel.evaluate && !(typeof window !== 'undefined' && window.Strudel)) {
                await this.loadStrudelBundle();
            }

            if (!this.strudel.evaluate) {
                throw new Error('Strudel is not available');
            }

            // The vendored build exposes initStrudel(), which creates the
            // scheduler that evaluate()/hush() need. The click that got us here
            // is the user gesture browsers require.
            if (typeof window.initStrudel === 'function' && !this.strudelInitialized) {
                try {
                    window.initStrudel();
                    this.strudelInitialized = true;
                    await new Promise(resolve => setTimeout(resolve, 0));
                } catch (error) {
                    console.warn('Strudel scheduler init failed:', error);
                }
            }

            this.audioInitialized = true;
            this.manager.updateStatus('Audio initialized - ready to play');
            this.enableAudioFeatures();
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.manager.updateStatus('Audio initialization failed: ' + error.message);
        }
    }

    async loadStrudelBundle() {
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'js/vendor/strudel-1.0.3.js';
            script.async = true;
            script.onload = () => {
                window.Strudel = window.Strudel || window.strudel;
                setTimeout(resolve, 500);
            };
            script.onerror = () => {
                console.warn('Local Strudel bundle unavailable - the editor still generates code, playback is disabled');
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    enableAudioFeatures() {
        document.querySelectorAll('.node-play-btn, #play-all-nodes').forEach(btn => {
            btn.disabled = false;
        });
        const initAudioBtn = document.getElementById('initAudioBtn');
        if (initAudioBtn) {
            initAudioBtn.disabled = false;
            initAudioBtn.textContent = 'Audio Ready';
            initAudioBtn.classList.add('audio-ready');
        }
    }

    /** Shared entry point: evaluate a Strudel program string. */
    async evaluatePattern(code, label) {
        const { evaluate } = this.strudel;
        if (typeof evaluate !== 'function') {
            this.manager.updateStatus('Error: Strudel evaluate function not available');
            return false;
        }
        try {
            await evaluate(code);
            this.currentPattern = code;
            if (label) this.manager.updateStatus(`${label}: ${code}`);
            return true;
        } catch (error) {
            console.error('Strudel evaluate failed:', error);
            this.manager.updateStatus(`Playback error: ${error.message}`);
            return false;
        }
    }

    async playNode(nodeId) {
        if (!this.audioInitialized) await this.initializeAudio();

        const node = this.manager.factory.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const pattern = this.manager.patternGenerator.generatePatternFromNode(node);
        if (!pattern) {
            this.manager.updateStatus('This node does not generate a pattern');
            return;
        }
        await this.evaluatePattern(pattern, `Playing ${node.instrument || node.type}`);
    }

    async playAllNodes() {
        if (this.manager.factory.nodes.length === 0) {
            this.manager.updateStatus('No nodes to play');
            return;
        }

        if (!this.audioInitialized) await this.initializeAudio();

        const pattern = this.manager.buildPlayablePattern();
        if (!pattern) {
            this.manager.updateStatus('Nothing playable in the current graph');
            return;
        }
        await this.evaluatePattern(pattern, 'Playing');
    }

    stopAllNodes() {
        const { hush } = this.strudel;
        if (typeof hush === 'function') {
            try {
                hush();
                this.manager.updateStatus('Stopped all playback');
            } catch (error) {
                console.error('Strudel hush failed:', error);
                this.manager.updateStatus('Could not stop playback: ' + error.message);
            }
            return;
        }
        this.manager.updateStatus('Stop unavailable - Strudel is not loaded');
    }
}
