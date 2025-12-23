/**
 * NodeManager.js
 * Main controller that orchestrates Canvas, Connections, Factory, and Audio.
 */
class NodeManager {
    constructor() {
        this.canvas = new NodeCanvas(this);
        this.connections = new ConnectionManager(this);
        this.factory = new NodeFactory(this);
        this.audio = new NodeAudio(this);

        this.propertySchema = null;
        this.nodeSchema = null;
        this.controlNodesSchema = null;
        this.patternCombinatorsSchema = null;
        this.patternFunctionsSchema = null;
        this.miniNotationSchema = null;
        this.instrumentList = [];

        // Initialize Strudel Pattern Generator
        this.patternGenerator = new StrudelPatternGenerator(this);

        this.init();
    }

    init() {
        console.log('Node Manager initializing...');
        this.loadSchemas();
        this.bindEvents();
        this.canvas.init();

        // Initialize hierarchical navigation state
        this.currentLevel = { level: 0, parentNode: null, nodes: [] };
        this.previousLevel = null;

        this.updateStatus('Node Editor Ready - Double-click nodes to edit children');
        this.factory.updateDeleteButtonState();
        this.updateBackButtonState();
        this.updateStrudelOutput();

        document.getElementById('initAudioBtn')?.addEventListener('click', async () => {
            await this.audio.initializeAudio();
        });
    }

    async loadSchemas() {
        try {
            const [propRes, nodeRes, controlRes, combinatorsRes, functionsRes, miniRes] = await Promise.all([
                fetch('nodes/strudel-node-properties.json'),
                fetch('nodes/strudel-node-schema.json'),
                fetch('nodes/strudel-control-nodes.json'),
                fetch('nodes/strudel-pattern-combinators.json'),
                fetch('nodes/strudel-pattern-functions.json'),
                fetch('nodes/strudel-mini-notation.json')
            ]);

            if (propRes.ok) this.propertySchema = await propRes.json();
            if (nodeRes.ok) this.nodeSchema = await nodeRes.json();
            if (controlRes.ok) this.controlNodesSchema = await controlRes.json();
            if (combinatorsRes.ok) this.patternCombinatorsSchema = await combinatorsRes.json();
            if (functionsRes.ok) this.patternFunctionsSchema = await functionsRes.json();
            if (miniRes.ok) this.miniNotationSchema = await miniRes.json();

            // Load instrument list
            const menuRes = await fetch('nodes/strudel-node-instruments.json');
            if (menuRes.ok) {
                const menuData = await menuRes.json();
                this.menuData = menuData;
                this.extractInstrumentList(menuData);
            }

            // Initialize pattern generator with schemas
            this.patternGenerator.initSchemas({
                miniNotationSchema: this.miniNotationSchema,
                patternCombinatorsSchema: this.patternCombinatorsSchema,
                patternFunctionsSchema: this.patternFunctionsSchema,
                propertySchema: this.propertySchema,
                controlNodesSchema: this.controlNodesSchema,
                nodeSchema: this.nodeSchema
            });

            // Initialize the pattern generator (sets up input event listeners)
            this.patternGenerator.init();
        } catch (error) {
            console.warn('Schema loading failed:', error);
        }
    }

    extractInstrumentList(menuData) {
        const instruments = [];
        menuData.menus.forEach(menu => {
            menu.groups.forEach(group => {
                group.items.forEach(item => {
                    instruments.push(typeof item === 'string' ? item : item.id);
                });
            });
        });
        this.instrumentList = [...new Set(instruments)].sort();
    }

    bindEvents() {
        // Global buttons
        document.getElementById('play-all-nodes')?.addEventListener('click', () => this.audio.playAllNodes());
        document.getElementById('stop-all-nodes')?.addEventListener('click', () => this.audio.stopAllNodes());
        document.getElementById('clear-nodes')?.addEventListener('click', () => this.clearAllNodes());
        document.getElementById('delete-selected-node')?.addEventListener('click', () => this.factory.deleteSelectedNode());
        document.getElementById('side-panel-close')?.addEventListener('click', () => this.factory.hideSidePanel());
        document.getElementById('back-to-parent')?.addEventListener('click', () => this.factory.exitNodeLevel());

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.factory.selectedNode) {
                this.factory.deleteNode(this.factory.selectedNode.id);
            }
            if (e.key === 'Escape' && this.currentLevel.level > 0) {
                this.factory.exitNodeLevel();
            }
            if (e.key === ' ' && !e.repeat && this.canvas.panToolActive) {
                document.body.style.cursor = 'grab';
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === ' ') document.body.style.cursor = '';
        });

        // Connection deletion
        document.addEventListener('click', (e) => {
            if (e.target.closest('.connection-line') && e.shiftKey) {
                const connectionId = e.target.closest('.connection-line').dataset.connectionId;
                this.connections.removeConnection(connectionId);
            }
        });
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-message');
        if (statusElement) statusElement.textContent = message;
        console.log('Status:', message);
    }

    // Update the strudel-example-input with current node output
    updateStrudelOutput() {
        const strudelInput = document.getElementById('strudel-example-input');
        if (!strudelInput) return;

        if (this.factory.nodes.length === 0) {
            strudelInput.value = '';
            return;
        }

        try {
            // Generate pattern from all nodes
            let fullPattern = '';

            if (this.factory.nodes.length === 1) {
                // Single node - generate its pattern
                const node = this.factory.nodes[0];
                fullPattern = this.patternGenerator.generatePatternFromNode(node);
            } else {
                // Multiple nodes - combine their patterns
                const patterns = this.factory.nodes.map(node => {
                    try {
                        return this.patternGenerator.generatePatternFromNode(node);
                    } catch (error) {
                        console.warn('Error generating pattern for node:', node, error);
                        return '';
                    }
                }).filter(pattern => pattern.trim() !== '');
                fullPattern = patterns.join(' ');
            }

            strudelInput.value = fullPattern;
        } catch (error) {
            console.warn('Error updating Strudel output:', error);
            strudelInput.value = 'Error generating pattern';
        }
    }

    // Update back button state based on current level
    updateBackButtonState() {
        const backBtn = document.getElementById('back-to-parent');
        if (!backBtn) return;

        // Check if we're in a child level (level > 0)
        if (this.currentLevel && this.currentLevel.level > 0) {
            backBtn.disabled = false;
            backBtn.style.opacity = '1';
            backBtn.style.cursor = 'pointer';
            backBtn.title = `Back to Parent Level (Level ${this.currentLevel.level - 1}) - Press ESC`;
        } else {
            backBtn.disabled = true;
            backBtn.style.opacity = '0.5';
            backBtn.style.cursor = 'not-allowed';
            backBtn.title = 'Back to Parent Level (ESC) - Only available in child editing mode';
        }
    }

    // API Methods for external access
    createNode(type, instrument, x, y) {
        return this.factory.createNode(type, instrument, x, y);
    }

    playNode(id) {
        this.audio.playNode(id);
    }

    updateNodeDisplay(node) {
        this.factory.updateNodeDisplay(node);
    }

    createConnection(s, sp, t, tp) {
        this.connections.createConnection(s, sp, t, tp);
    }

    clearAllNodes() {
        this.factory.clearAllNodes();
        this.connections.clearAllConnections();
    }

    selectNode(node) {
        this.factory.selectNode(node);
    }

    // Getters for backward compatibility
    get nodes() { return this.factory.nodes; }
    get selectedNode() { return this.factory.selectedNode; }
}

// Initialize global instance
window.nodeManager = new NodeManager();
