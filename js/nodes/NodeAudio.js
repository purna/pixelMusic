/**
 * NodeAudio.js
 * Handles audio playback, graph traversal, and Strudel integration.
 */
class NodeAudio {
    constructor(manager) {
        this.manager = manager;
        this.audioInitialized = false;
        this.currentPattern = '';
    }

    async initializeAudio() {
        try {
            this.manager.updateStatus('Initializing audio...');

            // Ensure AudioContext is resumed after user interaction
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass.prototype.state === 'suspended') {
                    await AudioContextClass.prototype.resume();
                }
            }

            if (typeof strudel === 'undefined') {
                await this.loadStrudelFromCDN();
            }

            if (typeof strudel.init === 'function') {
                await strudel.init();
                this.audioInitialized = true;
                this.manager.updateStatus('Audio initialized - Ready to play sounds');
                this.enableAudioFeatures();
            } else {
                this.audioInitialized = true;
                this.manager.updateStatus('Audio initialized with fallback synthesis');
                this.enableAudioFeatures();
            }
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.manager.updateStatus('Audio initialization failed: ' + error.message);
        }
    }

    async loadStrudelFromCDN() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/strudel@0.12.2/dist/strudel.web.js';
            script.async = true;
            script.onload = () => {
                setTimeout(() => {
                    if (typeof strudel !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('Strudel global not available'));
                    }
                }, 500);
            };
            script.onerror = () => {
                console.warn('Strudel CDN failed, continuing without Strudel');
                resolve(); // Continue without Strudel
            };
            document.head.appendChild(script);
        });
    }

    enableAudioFeatures() {
        const playButtons = document.querySelectorAll('.node-play-btn, #play-all-nodes');
        playButtons.forEach(btn => btn.disabled = false);
        const initAudioBtn = document.getElementById('initAudioBtn');
        if (initAudioBtn) {
            initAudioBtn.disabled = false;
            initAudioBtn.textContent = 'Audio Ready';
        }
    }

    async playNode(nodeId) {
        if (!this.audioInitialized) {
            await this.initializeAudio();
        }

        const node = this.manager.factory.nodes.find(n => n.id === nodeId);
        if (!node) return;

        try {
            this.manager.updateStatus(`Playing ${node.instrument}...`);
            const pattern = this.manager.patternGenerator.generatePatternFromNode(node);
            this.currentPattern = pattern;
            eval(`strudel(${pattern})`);
            this.manager.updateStatus(`Playing: ${pattern}`);
        } catch (error) {
            console.error('Error playing node:', error);
            this.manager.updateStatus(`Error playing node: ${error.message}`);
        }
    }

    async playAllNodes() {
        if (this.manager.factory.nodes.length === 0) {
            this.manager.updateStatus('No nodes to play');
            return;
        }

        if (!this.audioInitialized) await this.initializeAudio();

        try {
            const rootNodes = this.findRootNodes();
            if (rootNodes.length === 0) {
                // Fallback to playing all nodes if no roots found
                const patterns = this.manager.factory.nodes.map(node => this.buildNodePattern(node));
                const combinedPattern = patterns.join(' ');
                eval(`strudel(${combinedPattern})`);
                return;
            }

            const patterns = rootNodes.map(node => this.generatePatternFromNode(node));
            const combinedPattern = patterns.join(' ');
            this.currentPattern = combinedPattern;
            eval(`strudel(${combinedPattern})`);
            this.manager.updateStatus(`Playing connected networks: ${combinedPattern}`);
        } catch (error) {
            console.error('Error playing all nodes:', error);
            this.manager.updateStatus(`Error playing all nodes: ${error.message}`);
        }
    }

    stopAllNodes() {
        if (typeof strudel !== 'undefined') {
            strudel.stop();
            this.manager.updateStatus('Stopped all playback');
        }
    }

    generatePatternFromNode(node) {
        const connectedNodes = this.getConnectedNodes(node);
        let pattern = this.buildNodePattern(node);

        // Handle combinators
        if (this.manager.patternCombinatorsSchema?.combinators?.[node.type]) {
            return this.buildCombinatorPatternWithChildren(node, connectedNodes);
        }

        // Apply connected nodes in reverse order (effect chains)
        connectedNodes.reverse().forEach(connectedNode => {
            const connectedPattern = this.buildNodePattern(connectedNode.node);
            pattern = `${connectedPattern}(${pattern})`;
        });

        return pattern;
    }

    buildCombinatorPatternWithChildren(combinatorNode, connectedNodes) {
        const combinatorType = combinatorNode.type;
        const inputConnections = this.manager.connections.connections.filter(conn =>
            conn.targetNodeId === combinatorNode.id && conn.targetPort === 'input'
        );

        const childPatterns = inputConnections.map(conn => {
            const childNode = this.manager.factory.nodes.find(n => n.id === conn.sourceNodeId);
            return childNode ? this.generatePatternFromNode(childNode) : '';
        }).filter(p => p !== '');

        if (combinatorType === 'stack') {
            const childrenArg = childPatterns.join(', ');
            let stackPattern = `stack(${childrenArg})`;
            const props = combinatorNode.properties.strudelProperties || {};
            if (props.bank) stackPattern += `.bank("${props.bank}")`;
            return stackPattern;
        }

        return this.buildNodePattern(combinatorNode);
    }

    getConnectedNodes(node) {
        const inputConnections = this.manager.connections.connections.filter(conn =>
            conn.targetNodeId === node.id && conn.targetPort === 'input'
        );

        return inputConnections.map(conn => {
            const sourceNode = this.manager.factory.nodes.find(n => n.id === conn.sourceNodeId);
            return { node: sourceNode, connection: conn };
        }).filter(item => item.node);
    }

    buildNodePattern(node) {
        // Simplified pattern builder - full implementation would be larger
        const props = node.properties.strudelProperties || {};
        let pattern = '';

        if (node.type === 'Instrument' || node.type === 'DrumSymbol') {
            const sound = props.sound || props.symbol || node.instrument;
            pattern = `s("${sound}")`;
            if (props.bank) pattern += `.bank("${props.bank}")`;
            if (props.gain) pattern += `.gain(${props.gain})`;
        } else if (node.type === 'Effect') {
            pattern = `.${props.type || 'lpf'}(${props.amount || 0.5})`;
        } else {
            pattern = `s("${node.instrument}")`;
        }

        return pattern;
    }

    findRootNodes() {
        return this.manager.factory.nodes.filter(node => {
            return !this.manager.connections.connections.some(conn =>
                conn.targetNodeId === node.id && conn.targetPort === 'input'
            );
        });
    }
}
