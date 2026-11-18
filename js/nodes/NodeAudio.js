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
        this.currentPattern = '';
    }

    /** Strudel's @strudel/web globals, accessed safely. */
    get strudel() {
        const global = typeof window !== 'undefined' ? window : {};
        return {
            evaluate: typeof global.evaluate === 'function' ? global.evaluate
                : (typeof global.Strudel?.evaluate === 'function' ? global.Strudel.evaluate.bind(global.Strudel) : null),
            hush: typeof global.hush === 'function' ? global.hush
                : (typeof global.Strudel?.hush === 'function' ? global.Strudel.hush.bind(global.Strudel) : null)
        };
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
                await this.loadStrudelFromCDN();
            }

            if (!this.strudel.evaluate) {
                throw new Error('Strudel is not available (no network?)');
            }

            this.audioInitialized = true;
            this.manager.updateStatus('Audio initialized - ready to play');
            this.enableAudioFeatures();
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.manager.updateStatus('Audio initialization failed: ' + error.message);
        }
    }

    async loadStrudelFromCDN() {
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@strudel/web@1.0.3/dist/strudel.min.js';
            script.async = true;
            script.onload = () => setTimeout(resolve, 500);
            script.onerror = () => {
                console.warn('Strudel CDN unavailable - the editor still generates code, playback is disabled');
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
